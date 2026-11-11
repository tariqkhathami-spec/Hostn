const mongoose = require('mongoose');
const { sharedUserFields, attachSharedHooks, attachSharedIndexes } = require('./_sharedUserFields');

// ── Host schema ──────────────────────────────────────────────────────
// Hosts own properties, manage bookings, receive payouts.
// Business-specific fields (commercial register, tax number, IBAN) will be added later;
// collected progressively as the host creates their first listing and receives payouts.
// Phone is unique within the Host collection; same phone may exist in Guest/Admin.
const hostSchema = new mongoose.Schema(
  {
    ...sharedUserFields(),
    // Placeholder for future business fields (empty for now per migration plan)
    // The staff member (Admin with adminRole 'account_manager') who looks
    // after this host. Set automatically on signup, changed by super admins.
    accountManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null, index: true },
    // Set once the host finishes the in-app introduction programme, so the
    // host app stops showing it on every launch.
    onboardingCompleted: { type: Boolean, default: false },
    // VAT registration numbers, one per property (host app: Settings > VAT).
    // `verified` is only ever set by the platform, never from host input.
    vatEntries: {
      type: [
        {
          property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
          taxNumber: { type: String, required: true, trim: true, maxlength: 15 },
          verified: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // When the host accepted the host usage agreement in the host app.
    hostTermsAcceptedAt: { type: Date, default: null },
    // Last time the host app was told to show the satisfaction (NPS) survey.
    npsLastPromptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A new host goes to the account manager with the fewest hosts.
hostSchema.pre('save', async function (next) {
  if (!this.isNew || this.accountManager) return next();
  try {
    const Admin = mongoose.model('Admin');
    const managers = await Admin.find({ adminRole: 'account_manager', isSuspended: { $ne: true }, deletedAt: null })
      .select('_id')
      .lean();
    if (managers.length > 0) {
      const counts = await this.constructor.aggregate([
        { $match: { accountManager: { $in: managers.map((m) => m._id) }, deletedAt: null } },
        { $group: { _id: '$accountManager', n: { $sum: 1 } } },
      ]);
      const load = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
      managers.sort((a, b) => (load[String(a._id)] || 0) - (load[String(b._id)] || 0));
      this.accountManager = managers[0]._id;
    }
  } catch (error) {
    // Assignment is a convenience; never block a signup on it.
  }
  next();
});

attachSharedIndexes(hostSchema);
attachSharedHooks(hostSchema);

module.exports = mongoose.model('Host', hostSchema);
