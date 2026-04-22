const mongoose = require('mongoose');
const Counter = require('./Counter');

const payoutSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },
    payoutNumber: {
      type: String,
      required: true,
      unique: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostBankAccount',
      required: true,
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
    ],
    amount: {
      type: Number,
      required: [true, 'Payout amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    transferMethod: {
      type: String,
      enum: ['bank_transfer'],
      default: 'bank_transfer',
    },
    // Snapshot of bank details at payout time
    iban: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
    },
    status: {
      type: String,
      enum: ['upcoming', 'processing', 'executed', 'failed'],
      default: 'upcoming',
    },
    executedAt: Date,
    failedAt: Date,
    failureReason: String,
    periodStart: Date,
    periodEnd: Date,
    breakdown: {
      grossAmount: { type: Number, required: true },
      platformFee: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      netAmount: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

// Indexes
payoutSchema.index({ host: 1, createdAt: -1 });
payoutSchema.index({ host: 1, status: 1 });

// Auto-generate payoutNumber before save
payoutSchema.pre('save', async function (next) {
  if (this.isNew && !this.payoutNumber) {
    const seq = await Counter.getNextSequence('payout');
    this.payoutNumber = `TR-${seq.toString().padStart(10, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payout', payoutSchema);
