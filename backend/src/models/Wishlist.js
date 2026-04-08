const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
  },
  { timestamps: true }
);

// One default list per user; unique list names per user
wishlistSchema.index({ user: 1, isDefault: 1 });
wishlistSchema.index({ user: 1, name: 1 }, { unique: true });

/**
 * Get or lazily create the default wishlist for a user.
 * Migrates any existing user.wishlist IDs into the new list.
 */
wishlistSchema.statics.getOrCreateDefault = async function (userId) {
  let list = await this.findOne({ user: userId, isDefault: true });
  if (list) return list;

  // Migrate existing user.wishlist into the new default list
  const User = require('./User');
  const user = await User.findById(userId).select('wishlist');
  const existingIds = user?.wishlist || [];

  try {
    list = await this.create({
      user: userId,
      name: 'مفضلاتي',
      isDefault: true,
      properties: existingIds,
    });
  } catch (err) {
    // Race condition: another request created it — just fetch it
    if (err.code === 11000) {
      list = await this.findOne({ user: userId, isDefault: true });
    } else {
      throw err;
    }
  }

  return list;
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
