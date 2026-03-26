const jwt = require('jsonwebtoken');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOTPMessage } = require('../services/sms');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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

    // Create OTP
    const otp = await OTP.createOTP(phone, countryCode);

    // Send SMS
    await sendOTPMessage(phone, countryCode, otp.code);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (error) {
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

    // Verify the OTP
    const result = await OTP.verifyCode(phone, countryCode, otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
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

    // Generate JWT token
    const token = generateToken(user);

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;

    res.status(200).json({
      success: true,
      token,
      user: userObj,
      isNewUser,
    });
  } catch (error) {
    next(error);
  }
};
