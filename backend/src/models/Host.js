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
  },
  { timestamps: true }
);

attachSharedIndexes(hostSchema);
attachSharedHooks(hostSchema);

module.exports = mongoose.model('Host', hostSchema);
