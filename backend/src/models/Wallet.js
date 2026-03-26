const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    currency: {
      type: String,
      default: 'SAR',
    },
  },
  { timestamps: true }
);

walletSchema.statics.getOrCreate = async function (userId) {
  let wallet = await this.findOne({ user: userId });
  if (!wallet) {
    wallet = await this.create({ user: userId });
  }
  return wallet;
};

module.exports = mongoose.model('Wallet', walletSchema);
