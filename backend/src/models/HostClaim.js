const mongoose = require('mongoose');

// A host protection claim for damage during a booking. Created by the host,
// reviewed by the platform team (status / approvedAmount / adminNote).
const hostClaimSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    amountRequested: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    evidenceUrls: [{ type: String, trim: true, maxlength: 500 }],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
    },
    // Filled in by the platform team.
    approvedAmount: { type: Number, default: null },
    adminNote: { type: String, trim: true, maxlength: 2000, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

hostClaimSchema.index({ host: 1, createdAt: -1 });
// One open claim per booking, enforced by the database (the handler's own
// check can be raced by parallel requests).
hostClaimSchema.index(
  { booking: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'under_review'] } } }
);

module.exports = mongoose.model('HostClaim', hostClaimSchema);
