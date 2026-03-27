/**
 * Migration: Set adminRole='super' for all existing admin users.
 * Idempotent — safe to run multiple times.
 *
 * Usage: node scripts/migrate-admin-roles.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const result = await User.updateMany(
      { role: 'admin', adminRole: null },
      { $set: { adminRole: 'super' } }
    );

    console.log(`Updated ${result.modifiedCount} admin users to adminRole='super'.`);

    // List all admins for verification
    const admins = await User.find({ role: 'admin' }).select('name email adminRole');
    console.log('\nCurrent admin users:');
    admins.forEach((a) => console.log(`  - ${a.email} (${a.adminRole})`));

    await mongoose.connection.close();
    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
