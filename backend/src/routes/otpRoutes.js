const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendOTP, verifyOTP, getOTPHealth } = require('../controllers/otpController');
const { protect, authorize } = require('../middleware/auth');

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many verification attempts, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-otp', otpSendLimiter, sendOTP);
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);
router.get('/otp-health', protect, authorize('admin'), getOTPHealth);

module.exports = router;
