/**
 * Migration: Split the unified `User` collection into three separate collections:
 *   - Guest  (role: 'guest' users)
 *   - Host   (role: 'host' users)
 *   - Admin  (role: 'admin' users; preserves adminRole)
 *
 * Each new document is inserted with the SAME _id as the original User document
 * so that foreign-key references in other collections (Booking.guest, Property.host,
 * etc.) continue to resolve after the ref field is changed from 'User' to the
 * specific model.
 *
 * Usage:
 *   node scripts/split-user-to-roles.js --dry      # preview only, no writes
 *   node scripts/split-user-to-roles.js --commit   # perform the migration
 *
 * Idempotent: documents that already exist in a target collection (by _id) are skipped.
 * After a successful --commit, the original User documents are NOT deleted
 * (manual cleanup in Phase 3 by dropping the `users` collection).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Guest = require('../src/models/Guest');
const Host = require('../src/models/Host');
const Admin = require('../src/models/Admin');
const Notification = require('../src/models/Notification');
const RefreshToken = require('../src/models/RefreshToken');
const Wallet = require('../src/models/Wallet');
const WalletTransaction = require('../src/models/WalletTransaction');
const Message = require('../src/models/Message');
const Conversation = require('../src/models/Conversation');
const Report = require('../src/models/Report');
const SupportTicket = require('../src/models/SupportTicket');
const ActivityLog = require('../src/models/ActivityLog');

const MODEL_BY_ROLE = { guest: Guest, host: Host, admin: Admin };
const TYPE_BY_ROLE = { guest: 'Guest', host: 'Host', admin: 'Admin' };

async function migrate(dryRun) {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB. Mode: ${dryRun ? 'DRY RUN' : 'COMMIT'}`);

  const users = await User.find({}).lean();
  console.log(`\nFound ${users.length} User documents.`);

  const counts = { guest: 0, host: 0, admin: 0, skipped: 0, errors: 0 };
  const duplicates = [];

  for (const u of users) {
    const role = u.role || 'guest';
    const Target = MODEL_BY_ROLE[role];
    if (!Target) {
      console.warn(`  ! Unknown role "${role}" for user ${u._id} — skipping`);
      counts.errors++;
      continue;
    }

    // Build the new document
    const doc = {
      _id: u._id,
      name: u.name,
      email: u.email,
      password: u.password, // already hashed; don't re-hash
      phone: u.phone,
      phoneVerified: u.phoneVerified,
      avatar: u.avatar,
      isVerified: u.isVerified,
      isSuspended: u.isSuspended,
      tokenVersion: u.tokenVersion,
      deviceTokens: u.deviceTokens,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
    if (role === 'admin') {
      doc.adminRole = u.adminRole || 'super';
    }

    // Check if already migrated
    const existing = await Target.findById(u._id).lean();
    if (existing) {
      counts.skipped++;
      continue;
    }

    if (dryRun) {
      counts[role]++;
      continue;
    }

    try {
      // Bypass pre-save hash hook by using insertMany-style direct insert
      // (password is already hashed)
      await Target.collection.insertOne(doc);
      counts[role]++;
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key (phone or email) — log and continue
        duplicates.push({ _id: u._id, role, error: err.message });
        counts.errors++;
      } else {
        throw err;
      }
    }
  }

  console.log('\n── Summary ─────────────────────────────');
  console.log(`  Guests migrated: ${counts.guest}`);
  console.log(`  Hosts migrated:  ${counts.host}`);
  console.log(`  Admins migrated: ${counts.admin}`);
  console.log(`  Skipped (already existed): ${counts.skipped}`);
  console.log(`  Errors: ${counts.errors}`);

  if (duplicates.length > 0) {
    console.log('\n── Duplicate-key errors ───────────────');
    duplicates.forEach((d) => {
      console.log(`  ${d.role} _id=${d._id}: ${d.error}`);
    });
  }

  // ── Backfill polymorphic discriminators for existing documents ──
  // Maps each legacy user._id to its new userType ('Guest'|'Host'|'Admin')
  const userTypeMap = {};
  for (const u of users) {
    userTypeMap[String(u._id)] = TYPE_BY_ROLE[u.role || 'guest'];
  }
  const getType = (id) => (id ? userTypeMap[String(id)] : null);

  const backfillStats = {
    notifications: 0,
    refreshTokens: 0,
    wallets: 0,
    walletTransactions: 0,
    messages: 0,
    messagesReadBy: 0,
    conversations: 0,
    reports: 0,
    supportTickets: 0,
    supportTicketMessages: 0,
    activityLogs: 0,
  };

  console.log('\n── Backfilling polymorphic discriminators ──');

  async function backfillSimple(Model, userField, typeField, statsKey) {
    const docs = await Model.find({ [typeField]: { $in: [null, undefined] } }).lean();
    for (const d of docs) {
      const userType = getType(d[userField]);
      if (!userType) continue;
      if (!dryRun) {
        await Model.updateOne({ _id: d._id }, { $set: { [typeField]: userType } });
      }
      backfillStats[statsKey]++;
    }
  }

  await backfillSimple(Notification, 'user', 'userType', 'notifications');
  await backfillSimple(RefreshToken, 'user', 'userType', 'refreshTokens');
  await backfillSimple(Wallet, 'user', 'userType', 'wallets');
  await backfillSimple(WalletTransaction, 'user', 'userType', 'walletTransactions');
  await backfillSimple(Message, 'sender', 'senderType', 'messages');
  await backfillSimple(Report, 'reporter', 'reporterType', 'reports');
  await backfillSimple(SupportTicket, 'user', 'userType', 'supportTickets');
  await backfillSimple(ActivityLog, 'actor', 'actorType', 'activityLogs');

  // Message.readBy[].userType (array of subdocs)
  const messagesNeedingReadBy = await Message.find({ 'readBy.user': { $exists: true } }).lean();
  for (const m of messagesNeedingReadBy) {
    let changed = false;
    const updatedReadBy = (m.readBy || []).map((rb) => {
      if (rb.userType) return rb;
      const t = getType(rb.user);
      if (t) { changed = true; return { ...rb, userType: t }; }
      return rb;
    });
    if (changed) {
      if (!dryRun) await Message.updateOne({ _id: m._id }, { $set: { readBy: updatedReadBy } });
      backfillStats.messagesReadBy++;
    }
  }

  // Conversation.participants (restructure from ObjectId[] → [{user, userType}])
  //                  and Conversation.lastMessage.senderType
  //                  and Conversation.blockedByType
  const convs = await Conversation.find({}).lean();
  for (const c of convs) {
    const updates = {};
    // participants may still be ObjectId[] (legacy); convert to subdoc array
    if (Array.isArray(c.participants) && c.participants.length > 0) {
      const first = c.participants[0];
      if (first && typeof first !== 'object') {
        // legacy flat array — convert
        updates.participants = c.participants.map((id) => ({
          user: id,
          userType: getType(id) || 'Guest',
        }));
      } else if (first && first.user && !first.userType) {
        updates.participants = c.participants.map((p) => ({
          user: p.user,
          userType: getType(p.user) || 'Guest',
        }));
      }
    }
    if (c.lastMessage?.sender && !c.lastMessage.senderType) {
      const t = getType(c.lastMessage.sender);
      if (t) updates['lastMessage.senderType'] = t;
    }
    if (c.blockedBy && !c.blockedByType) {
      const t = getType(c.blockedBy);
      if (t) updates.blockedByType = t;
    }
    if (Object.keys(updates).length > 0) {
      if (!dryRun) await Conversation.updateOne({ _id: c._id }, { $set: updates });
      backfillStats.conversations++;
    }
  }

  // SupportTicket.messages[].senderType
  const tickets = await SupportTicket.find({ 'messages.sender': { $exists: true } }).lean();
  for (const t of tickets) {
    let changed = false;
    const updatedMsgs = (t.messages || []).map((m) => {
      if (m.senderType) return m;
      const st = getType(m.sender);
      if (st) { changed = true; return { ...m, senderType: st }; }
      return m;
    });
    if (changed) {
      if (!dryRun) await SupportTicket.updateOne({ _id: t._id }, { $set: { messages: updatedMsgs } });
      backfillStats.supportTicketMessages++;
    }
  }

  console.log('  Notifications backfilled:         ', backfillStats.notifications);
  console.log('  RefreshTokens backfilled:         ', backfillStats.refreshTokens);
  console.log('  Wallets backfilled:               ', backfillStats.wallets);
  console.log('  WalletTransactions backfilled:    ', backfillStats.walletTransactions);
  console.log('  Messages backfilled:              ', backfillStats.messages);
  console.log('  Message readBy subdocs backfilled:', backfillStats.messagesReadBy);
  console.log('  Conversations backfilled:         ', backfillStats.conversations);
  console.log('  Reports backfilled:               ', backfillStats.reports);
  console.log('  SupportTickets backfilled:        ', backfillStats.supportTickets);
  console.log('  SupportTicket messages backfilled:', backfillStats.supportTicketMessages);
  console.log('  ActivityLogs backfilled:          ', backfillStats.activityLogs);

  if (!dryRun) {
    console.log('\n✓ Migration complete. Original User documents preserved for rollback.');
    console.log('  To clean up after verifying in Phase 3: db.users.drop()');
  } else {
    console.log('\n(Dry run — no data was written. Re-run with --commit to apply.)');
  }

  await mongoose.connection.close();
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--commit');

migrate(dryRun).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
