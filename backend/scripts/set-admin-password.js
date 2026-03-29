/**
 * Set admin password directly (no token needed).
 * Usage: MONGODB_URI=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/set-admin-password.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bdzl@hotmail.com';

async function setPassword() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  // Generate a secure password
  const password = crypto.randomBytes(12).toString('base64url').slice(0, 16);
  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await usersCol.updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        password: hashedPassword,
        role: 'admin',
        adminRole: 'super',
        isVerified: true,
      },
      $unset: {
        passwordResetToken: '',
        passwordResetExpires: '',
      },
    }
  );

  if (result.matchedCount === 0) {
    console.error(`No user found with email: ${ADMIN_EMAIL}`);
    process.exit(1);
  }

  console.log(`Password set for ${ADMIN_EMAIL}`);
  console.log(`Temporary password: ${password}`);
  console.log('\nLogin at: https://hostn.co/auth/admin/login');
  console.log('Change this password immediately after login.');

  await mongoose.disconnect();
}

setPassword().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
