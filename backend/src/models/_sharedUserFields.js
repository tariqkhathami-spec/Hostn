/**
 * Shared field definitions used by Guest, Host, and Admin models.
 *
 * The three user models share core identity fields (name, phone, email, password, etc.)
 * but live in separate collections so the same phone/email can register independently
 * in each role without conflict.
 */

const bcrypt = require('bcryptjs');

const sharedUserFields = () => ({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    // Sparse + unique enforced via schema.index() in attachSharedIndexes
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  deviceTokens: [
    {
      token: String,
      platform: { type: String, enum: ['ios', 'android', 'web'], default: 'ios' },
      updatedAt: Date,
    },
  ],
});

/**
 * Attach common pre-save password hashing hook + comparePassword instance method
 * to any schema that uses sharedUserFields.
 */
function attachSharedHooks(schema) {
  schema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });

  schema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  };
}

/**
 * Add the standard unique+sparse indexes on email and phone to a schema.
 * Phone is unique within each collection — same phone across Guest/Host/Admin is allowed
 * because they're separate collections.
 */
function attachSharedIndexes(schema) {
  schema.index({ email: 1 }, { unique: true, sparse: true });
  schema.index({ phone: 1 }, { unique: true, sparse: true });
}

module.exports = { sharedUserFields, attachSharedHooks, attachSharedIndexes };
