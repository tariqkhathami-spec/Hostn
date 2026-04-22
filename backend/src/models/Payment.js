const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'User ID is required'],
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    provider: {
      type: String,
      enum: ['moyasar', 'stripe', 'apple_pay', 'tabby', 'tamara', 'manual'],
      default: 'moyasar',
    },
    // Provider fields (compatible with frontend schema)
    providerPaymentId: {
      type: String,
      sparse: true,
    },
    providerStatus: {
      type: String,
    },
    // Legacy Moyasar fields (for backward compat)
    moyasarPaymentId: {
      type: String,
      index: true,
      sparse: true,
    },
    moyasarStatus: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: String,
    cardBrand: String,
    cardLast4: String,
    source: {
      type: {
        type: String,
      },
      company: String,
      name: String,
      number: String,
      message: String,
    },
    fees: {
      platformFee: { type: Number, default: 0 },
      providerFee: { type: Number, default: 0 },
      hostPayout: { type: Number, default: 0 },
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundReason: String,
    refundedAt: Date,
    paidAt: Date,
    failedAt: Date,
    failureReason: String,
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Compound indexes
paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
