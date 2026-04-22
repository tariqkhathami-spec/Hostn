const mongoose = require('mongoose');

const statementEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['booking_earning', 'payout', 'commission', 'adjustment'],
      required: true,
    },
    description: String,
    descriptionAr: String,
    reference: String,
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    credit: {
      type: Number,
      default: 0,
    },
    debit: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const hostStatementSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },
    period: {
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
      },
      year: {
        type: Number,
        required: true,
      },
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    closingBalance: {
      type: Number,
      default: 0,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    totalDebits: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    entries: [statementEntrySchema],
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    generatedAt: Date,
  },
  { timestamps: true }
);

// Unique compound index — one statement per host per month
hostStatementSchema.index(
  { host: 1, 'period.year': -1, 'period.month': -1 },
  { unique: true }
);

module.exports = mongoose.model('HostStatement', hostStatementSchema);
