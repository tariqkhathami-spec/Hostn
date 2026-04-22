const mongoose = require('mongoose');

const savedPaymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: true,
    },
    provider: {
      type: String,
      enum: ['moyasar', 'stripe'],
      required: true,
    },
    tokenId: {
      type: String,
      required: true,
    },
    cardBrand: {
      type: String,
      enum: ['visa', 'mastercard', 'mada', 'amex'],
      required: true,
    },
    cardLast4: {
      type: String,
      required: true,
      match: [/^\d{4}$/, 'Must be exactly 4 digits'],
    },
    expiryMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  },
  { timestamps: true }
);

savedPaymentMethodSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedPaymentMethod', savedPaymentMethodSchema);
