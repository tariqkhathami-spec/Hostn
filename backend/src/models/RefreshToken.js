const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userType',
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin'],
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    family: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL — MongoDB auto-deletes expired docs
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      platform: { type: String, enum: ['web', 'ios', 'android'], default: 'web' },
    },
  },
  { timestamps: true }
);

// Compound index for efficient lookups
refreshTokenSchema.index({ user: 1, family: 1 });

// Hash a raw token for storage
refreshTokenSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

// Generate a new raw refresh token
refreshTokenSchema.statics.generateRawToken = function () {
  return crypto.randomBytes(40).toString('hex');
};

// Create a new refresh token for a user
refreshTokenSchema.statics.createToken = async function (userId, userType, deviceInfo = {}) {
  const rawToken = this.generateRawToken();
  const tokenHash = this.hashToken(rawToken);
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await this.create({
    user: userId,
    userType,
    tokenHash,
    family,
    expiresAt,
    deviceInfo,
  });

  return { rawToken, family };
};

// Rotate: validate old token, revoke it, issue new one in same family
refreshTokenSchema.statics.rotateToken = async function (rawToken) {
  const tokenHash = this.hashToken(rawToken);
  const existing = await this.findOne({ tokenHash });

  if (!existing) {
    return { valid: false, reason: 'Token not found' };
  }

  if (existing.isRevoked) {
    // Reuse detected — revoke entire family (potential token theft)
    await this.updateMany({ family: existing.family }, { isRevoked: true });
    return { valid: false, reason: 'Token reuse detected — all sessions in this family revoked' };
  }

  if (existing.expiresAt < new Date()) {
    return { valid: false, reason: 'Token expired' };
  }

  // Revoke old token
  existing.isRevoked = true;
  await existing.save();

  // Issue new token in same family
  const newRawToken = this.generateRawToken();
  const newTokenHash = this.hashToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await this.create({
    user: existing.user,
    userType: existing.userType,
    tokenHash: newTokenHash,
    family: existing.family,
    expiresAt: newExpiresAt,
    deviceInfo: existing.deviceInfo,
  });

  return { valid: true, userId: existing.user, userType: existing.userType, rawToken: newRawToken };
};

// Revoke all tokens for a user (password change, logout-all)
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
  await this.updateMany({ user: userId, isRevoked: false }, { isRevoked: true });
};

// Revoke a specific token
refreshTokenSchema.statics.revokeToken = async function (rawToken) {
  const tokenHash = this.hashToken(rawToken);
  await this.updateOne({ tokenHash }, { isRevoked: true });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
