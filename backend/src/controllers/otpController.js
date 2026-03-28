const jwt = require('jsonwebtoken');
const OTP = require('../models/OTP');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendOTPMessage } = require('../services/sms');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res, next) => {
  try {
    const { phone, countryCode = '+966' } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Validate Saudi phone format (starts with 5, 9 digits)
    if (!/^5\d{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Saudi phone number. Must be 9 digits starting with 5.',
      });
    }

    // Check if user is suspended
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact support for assistance.',
      });
    }

    // Create OTP (rate limited inside OTP model)
    const otp = await OTP.createOTP(phone, countryCode);

    // Send SMS
    await sendOTPMessage(phone, countryCode, otp.code);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300,
    });
  } catch (error) {
    // Handle OTP rate limit error from model
    if (error.message && error.message.includes('Too many OTP requests')) {
      return res.status(429).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Verify OTP and login/register
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, countryCode = '+966', otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Dev bypass: accept 000000 as valid OTP for testing
    const isDevBypass = process.env.DEV_OTP_BYPASS === 'true' && otp === '000000';

    if (!isDevBypass) {
      // Verify the OTP
      const result = await OTP.verifyCode(phone, countryCode, otp);
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }
    }

    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        phone,
        phoneVerified: true,
        role: 'guest',
        name: `User ${phone.slice(-4)}`,
      });
    } else {
      user.phoneVerified = true;
      await user.save();
    }

    // Generate access token
    const token = generateAccessToken(user);

    // Generate refresh token
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      platform: req.headers['x-platform'] || 'android',
    };
    const { rawToken: refreshToken } = await RefreshToken.createToken(user._id, deviceInfo);

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;

    // Set cookies for web clients
    res.cookie('hostn_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('hostn_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: userObj,
      isNewUser,
    });
  } catch (error) {
    next(error);
  }
};
