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

attachSharedIndexes(hostSchema);
attachSharedHooks(hostSchema);

module.exports = mongoose.model('Host', hostSchema);
