const mongoose = require('mongoose');
const { sharedUserFields, attachSharedHooks, attachSharedIndexes } = require('./_sharedUserFields');

// ── Admin schema ─────────────────────────────────────────────────────
// Admins operate the back-office: user management, reports, support, finance.
// Not publicly registrable — admins are invited/created by other admins.
// Phone is unique within the Admin collection; same phone may exist in Guest/Host.
const adminSchema = new mongoose.Schema(
  {
    ...sharedUserFields(),
    adminRole: {
      type: String,
      // account_manager: looks after the hosts assigned to them (Host.accountManager)
      // through /api/v1/manager only; has no access to /admin/*.
      enum: ['super', 'support', 'finance', 'account_manager'],
      default: 'super',
    },
  },
  { timestamps: true }
);

attachSharedIndexes(adminSchema);
attachSharedHooks(adminSchema);

module.exports = mongoose.model('Admin', adminSchema);
