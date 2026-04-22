const mongoose = require('mongoose');
const { sharedUserFields, attachSharedHooks, attachSharedIndexes } = require('./_sharedUserFields');

// ── Guest schema ──────────────────────────────────────────────────────
// Guests browse listings, create bookings, leave reviews.
// Phone is unique within the Guest collection; same phone may exist in Host/Admin.
const guestSchema = new mongoose.Schema(
  {
    ...sharedUserFields(),
  },
  { timestamps: true }
);

attachSharedIndexes(guestSchema);
attachSharedHooks(guestSchema);

module.exports = mongoose.model('Guest', guestSchema);
