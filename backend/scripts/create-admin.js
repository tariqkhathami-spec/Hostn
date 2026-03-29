/**
 * Create or update a production admin account.
 * Usage: MONGODB_URI=... ADMIN_EMAIL=... node scripts/create-admin.js
 *
 * - Creates user if not found, or promotes existing user
 * - Sets a secure random temporary password (not printed)
 * - Stores a one-time reset token so the admin can set their own password
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bdzl@hotmail.com';

async function createAdmin() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  // Check if user exists
  let user = await usersCol.findOne({ email: ADMIN_EMAIL });

  // Generate a secure temporary password (64 chars, never displayed)
  const tempPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Generate a one-time password reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  if (user) {
    // Update existing user to admin
    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          role: 'admin',
          adminRole: 'super',
          isVerified: true,
          password: hashedPassword,
          passwordResetToken: resetTokenHash,
          passwordResetExpires: resetExpires,
        },
      }
    );
    console.log(`Updated existing user "${user.name}" to super admin`);
  } else {
    // Create new admin user
    await usersCol.insertOne({
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone: '',
      role: 'admin',
      adminRole: 'super',
      isVerified: true,
      isSuspended: false,
      wishlist: [],
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetExpires,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Created new super admin account for ${ADMIN_EMAIL}`);
  }

  // Verify the account
  const verified = await usersCol.findOne({ email: ADMIN_EMAIL });
  console.log('\n--- Verification ---');
  console.log(`Email: ${verified.email}`);
  console.log(`Role: ${verified.role}`);
  console.log(`Admin Role: ${verified.adminRole}`);
  console.log(`Verified: ${verified.isVerified}`);
  console.log(`Reset token expires: ${resetExpires.toISOString()}`);
  console.log(`\nReset token (use within 24h): ${resetToken}`);

  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
