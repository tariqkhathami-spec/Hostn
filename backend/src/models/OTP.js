const mongoose = require('mongoose');
const crypto = require('crypto');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    countryCode: {
      type: String,
      required: true,
      default: '+966',
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Generate cryptographically secure 6-digit OTP
otpSchema.statics.generateCode = function () {
  return crypto.randomInt(100000, 999999).toString();
};

otpSchema.statics.createOTP = async function (phone, countryCode = '+966') {
  // Rate limit: max 3 OTP requests per phone per 15 minutes
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recentCount = await this.countDocuments({
    phone,
    countryCode,
    createdAt: { $gte: fifteenMinAgo },
  });

  if (recentCount >= 3) {
    throw new Error('Too many OTP requests. Please wait before requesting a new code.');
  }

  // Invalidate any existing OTPs for this phone
  await this.deleteMany({ phone, countryCode });

  const code = this.generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const otp = await this.create({
    phone,
    countryCode,
    code,
    expiresAt,
  });

  return otp;
};

otpSchema.statics.verifyCode = async function (phone, countryCode, code) {
  const otp = await this.findOne({
    phone,
    countryCode,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!otp) {
    return { valid: false, message: 'No OTP found. Please request a new one.' };
  }

  if (otp.expiresAt < new Date()) {
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Max 3 attempts (reduced from 5)
  if (otp.attempts >= 3) {
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  // Exponential backoff: enforce delay between attempts
  if (otp.lastAttemptAt && otp.attempts > 0) {
    const backoffMs = Math.pow(2, otp.attempts) * 1000; // 2s, 4s, 8s
    const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
    if (timeSinceLastAttempt < backoffMs) {
      const waitSec = Math.ceil((backoffMs - timeSinceLastAttempt) / 1000);
      return { valid: false, message: `Please wait ${waitSec} seconds before trying again.` };
    }
  }

  // Constant-time comparison to prevent timing attacks
  const codeBuffer = Buffer.from(code.padEnd(6, '0'));
  const otpBuffer = Buffer.from(otp.code.padEnd(6, '0'));
  const isMatch = crypto.timingSafeEqual(codeBuffer, otpBuffer);

  if (!isMatch) {
    otp.attempts += 1;
    otp.lastAttemptAt = new Date();
    await otp.save();
    return { valid: false, message: 'Invalid OTP code.' };
  }

  otp.verified = true;
  await otp.save();

  return { valid: true };
};

module.exports = mongoose.model('OTP', otpSchema);
