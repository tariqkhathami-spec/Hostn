const mongoose = require('mongoose');

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
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

otpSchema.statics.generateCode = function () {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

otpSchema.statics.createOTP = async function (phone, countryCode = '+966') {
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

  if (otp.attempts >= 5) {
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    return { valid: false, message: 'Invalid OTP code.' };
  }

  otp.verified = true;
  await otp.save();

  return { valid: true };
};

module.exports = mongoose.model('OTP', otpSchema);
