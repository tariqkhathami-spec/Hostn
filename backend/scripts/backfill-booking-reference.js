/**
 * Backfill: generate `reference` for bookings that don't have one.
 *
 * Pre-existing bookings from before the reference-number feature need a value
 * in the `reference` field so hosts can see them on the updated UI.
 *
 * Safe to run multiple times — only touches docs where reference is missing.
 *
 * Usage:
 *   node scripts/backfill-booking-reference.js --dry     # preview
 *   node scripts/backfill-booking-reference.js --commit  # write
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateBookingReference() {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  }
  return `HB-${out}`;
}

async function run(dryRun) {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. Mode: ${dryRun ? 'DRY RUN' : 'COMMIT'}`);

  const missing = await Booking.find({
    $or: [{ reference: { $exists: false } }, { reference: null }, { reference: '' }],
  }).select('_id').lean();

  console.log(`Bookings missing reference: ${missing.length}`);
  if (missing.length === 0) {
    await mongoose.connection.close();
    return;
  }

  let ok = 0;
  let err = 0;
  for (const doc of missing) {
    let assigned = false;
    for (let attempt = 0; attempt < 5 && !assigned; attempt++) {
      const candidate = generateBookingReference();
      const clash = await Booking.exists({ reference: candidate });
      if (clash) continue;
      if (!dryRun) {
        try {
          await Booking.updateOne({ _id: doc._id }, { $set: { reference: candidate } });
          assigned = true;
        } catch (e) {
          // Race condition: another process grabbed the same reference. Retry.
          if (e.code !== 11000) throw e;
        }
      } else {
        assigned = true;
      }
    }
    if (assigned) ok++; else err++;
  }

  console.log(`\n── Summary ──`);
  console.log(`  References ${dryRun ? 'would be' : ''} assigned: ${ok}`);
  console.log(`  Failed: ${err}`);
  if (dryRun) console.log('\n(Dry run — no data written. Re-run with --commit.)');

  await mongoose.connection.close();
}

const dryRun = !process.argv.includes('--commit');
run(dryRun).catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
