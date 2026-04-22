const mongoose = require('mongoose');

const hostBankAccountSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    bankNameAr: {
      type: String,
      trim: true,
      maxlength: [100, 'Arabic bank name cannot exceed 100 characters'],
    },
    iban: {
      type: String,
      required: [true, 'IBAN is required'],
      trim: true,
      match: [/^SA\d{22}$/, 'Please enter a valid Saudi IBAN (SA + 22 digits)'],
    },
    accountHolder: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
      maxlength: [100, 'Account holder name cannot exceed 100 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    transferDuration: {
      type: {
        type: String,
        enum: ['after_departure', 'amount_threshold', 'weekly'],
        default: 'after_departure',
      },
      hours: {
        type: Number,
        default: 48,
        min: [24, 'Minimum transfer duration is 24 hours'],
        max: [336, 'Maximum transfer duration is 336 hours (14 days)'],
      },
      thresholdAmount: {
        type: Number,
        default: 0,
        min: [0, 'Threshold amount cannot be negative'],
      },
      weeklyDay: {
        type: Number,
        default: 0,
        min: 0,
        max: 6, // 0=Sunday, 1=Monday, ..., 6=Saturday
      },
    },
  },
  { timestamps: true }
);

// Compound index for efficient host queries
hostBankAccountSchema.index({ host: 1, isActive: 1 });

module.exports = mongoose.model('HostBankAccount', hostBankAccountSchema);
