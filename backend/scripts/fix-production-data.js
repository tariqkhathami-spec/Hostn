/**
 * One-time production fix script
 * Run on Railway shell: node scripts/fix-production-data.js
 *
 * Tasks:
 * 1. Deactivate test properties (title contains "test")
 * 2. Mark all host users as verified
 * 3. Reset admin password to 'Password123' so we can log in
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

async function fix() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // --- Task 1: Deactivate test properties ---
  const propResult = await db.collection('properties').updateMany(
    { title: { $regex: /test/i } },
    { $set: { isActive: false, isApproved: false } }
  );
  console.log(`Deactivated ${propResult.modifiedCount} test properties`);

  // List remaining active properties
  const activeProps = await db.collection('properties')
    .find({ isActive: true }, { projection: { title: 1, type: 1, 'location.city': 1 } })
    .toArray();
  console.log(`Active properties (${activeProps.length}):`);
  activeProps.forEach(p => console.log(`  - ${p.title} (${p.type}, ${p.location?.city})`));

  // --- Task 2: Verify all hosts ---
  const hostResult = await db.collection('users').updateMany(
    { role: 'host' },
    { $set: { isVerified: true } }
  );
  console.log(`\nVerified ${hostResult.modifiedCount} host users`);

  // --- Task 3: Reset admin password ---
  const hashedPassword = await bcrypt.hash('Password123', 12);
  const adminResult = await db.collection('users').updateMany(
    { role: 'admin' },
    { $set: { password: hashedPassword } }
  );
  console.log(`Reset password for ${adminResult.modifiedCount} admin users`);

  // Show admin accounts
  const admins = await db.collection('users')
    .find({ role: 'admin' }, { projection: { name: 1, email: 1 } })
    .toArray();
  console.log('Admin accounts:');
  admins.forEach(a => console.log(`  - ${a.email} (${a.name})`));

  await mongoose.disconnect();
  console.log('\nDone! You can now log in with the admin email and password: Password123');
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
