const mongoose = require('mongoose');

const metricValueSchema = {
  value: { type: Number, default: 0 },
  tier: { type: String, enum: ['basic', 'silver', 'gold', 'summit'], default: 'basic' },
};

const hostLoyaltySnapshotSchema = new mongoose.Schema({
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Host',
    required: true,
    index: true,
  },
  quarter: { type: String, required: true }, // e.g. "2026-Q2"
  quarterStart: { type: Date },
  quarterEnd: { type: Date },
  tier: {
    type: String,
    enum: ['basic', 'silver', 'gold', 'summit'],
    required: true,
    default: 'basic',
  },
  metrics: {
    confirmedNights: metricValueSchema,
    averageReviews: metricValueSchema,
    unitAvailability: metricValueSchema,
    bookingsRatedByGuests: metricValueSchema,
    bookingsYouRated: metricValueSchema,
    cancelledBookings: metricValueSchema,
  },
  benefits: {
    cashbackPercent: { type: Number, default: 0 },
    bonusPoints: { type: Number, default: 0 },
    hasCertificate: { type: Boolean, default: false },
    hasBadge: { type: Boolean, default: false },
    hasMonthlyReport: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
});

hostLoyaltySnapshotSchema.index({ host: 1, quarter: -1 }, { unique: true });
hostLoyaltySnapshotSchema.index({ host: 1, createdAt: -1 });

module.exports = mongoose.model('HostLoyaltySnapshot', hostLoyaltySnapshotSchema);
