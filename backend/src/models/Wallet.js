const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userType',
      required: true,
      unique: true,
    },
    userType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin'],
      required: true,
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

walletSchema.statics.getOrCreate = async function (userId, userType) {
  let wallet = await this.findOne({ user: userId });
  if (!wallet) {
    wallet = await this.create({ user: userId, userType });
  }
  return wallet;
};

module.exports = mongoose.model('Wallet', walletSchema);
