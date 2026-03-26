const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^S+@S+.S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['guest', 'host', 'admin'],
      default: 'guest',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    isSuspended: {
      type: Boolean,
      default: false,
    },
    deviceTokens: [
      {
        token: String,
        platform: { type: String, enum: ['ios', 'android', 'web'], default: 'ios' },
        updatedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);