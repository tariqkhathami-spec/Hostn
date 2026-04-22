const mongoose = require('mongoose');
const Counter = require('./Counter');

const hostInvoiceSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    payout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payout',
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
    ],
    amount: {
      type: Number,
      required: [true, 'Invoice amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    breakdown: {
      commissionRate: { type: Number, default: 0 },
      grossBookings: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    periodStart: Date,
    periodEnd: Date,
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid'],
      default: 'issued',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
hostInvoiceSchema.index({ host: 1, createdAt: -1 });

// Auto-generate invoiceNumber before save
hostInvoiceSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const seq = await Counter.getNextSequence('host_invoice');
    this.invoiceNumber = `INV-${seq.toString().padStart(10, '0')}`;
  }
  next();
});

module.exports = mongoose.model('HostInvoice', hostInvoiceSchema);
