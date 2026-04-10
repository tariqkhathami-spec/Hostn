const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    guests: {
      adults: { type: Number, default: 1, min: 1 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 },
    },
    pricing: {
      perNight: { type: Number, required: true },
      nights: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['held', 'pending', 'confirmed', 'cancelled', 'completed', 'rejected'],
      default: 'pending',
    },
    holdExpiresAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    cancellationReason: {
      type: String,
    },
    confirmedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

// ── Indexes for common queries ────────────────────────────────────────────────
bookingSchema.index({ property: 1, status: 1 }); // availability check, host bookings by property
bookingSchema.index({ guest: 1, status: 1 });     // my-bookings filtered by status
bookingSchema.index({ property: 1, checkIn: 1, checkOut: 1 }); // date overlap queries
bookingSchema.index({ createdAt: -1 });            // sort by newest
bookingSchema.index({ status: 1, holdExpiresAt: 1 }); // hold expiry queries
bookingSchema.index({ unit: 1, checkIn: 1, checkOut: 1 }); // unit-level availability

// Validate checkOut > checkIn
bookingSchema.pre('save', function (next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

// Calculate nights
bookingSchema.virtual('nightCount').get(function () {
  const diff = this.checkOut - this.checkIn;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

bookingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);
