const jwt = require('jsonwebtoken');
const OTP = require('../models/OTP');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const authentica = require('../services/authentica');

// Long-lived access token (30 days — matches refresh token & authController)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Test accounts — bypass OTP with code 0000; role assigned on first login
const TEST_ACCOUNTS = {
  '500000001': 'admin',
  '500000002': 'host',
  '500000003': 'guest',
};

// In-memory cooldown tracker (phone → last send timestamp)
const cooldownMap = new Map();
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of cooldownMap) {
    if (now - ts > 5 * 60 * 1000) cooldownMap.delete(key);
  }
}, 5 * 60 * 1000).unref();

// @desc    Send OTP to phone number via Authentica (SMS → WhatsApp fallback)
// @route   POST /api/v1/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res, next) => {
  try {
    const { phone, countryCode = '+966', method = 'sms', lang = 'ar' } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Validate Saudi phone format (starts with 5, 9 digits)
    if (!/^5\d{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: lang === 'ar'
          ? 'رقم الهاتف غير صالح. يجب أن يكون 9 أرقام يبدأ بـ 5.'
          : 'Invalid Saudi phone number. Must be 9 digits starting with 5.',
      });
    }

    // Validate method
    if (!['sms', 'whatsapp'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: lang === 'ar'
          ? 'طريقة إرسال غير صالحة. استخدم sms أو whatsapp.'
          : 'Invalid send method. Use sms or whatsapp.',
      });
    }

    // Check if user is suspended (try multiple phone formats)
    const existingUser = await User.findOne({
      phone: { $in: [phone, `0${phone}`, `${countryCode}${phone}`, phone.replace(/^0+/, '')] },
    });
    if (existingUser && existingUser.isSuspended) {
      return res.status(403).json({
        success: false,
        message: lang === 'ar'
          ? 'تم تعليق حسابك. تواصل مع الدعم للمساعدة.'
          : 'Your account has been suspended. Contact support for assistance.',
      });
    }

    // 30-second resend cooldown
    const cooldownKey = `${countryCode}${phone}`;
    const lastSent = cooldownMap.get(cooldownKey);
    if (lastSent) {
      const elapsed = Date.now() - lastSent;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: lang === 'ar'
            ? `يرجى الانتظار ${waitSec} ثانية قبل إعادة الإرسال.`
            : `Please wait ${waitSec} seconds before requesting again.`,
          retryAfter: waitSec,
        });
      }
    }

    // Test accounts: always bypass OTP
    if (TEST_ACCOUNTS[phone]) {
      await OTP.deleteMany({ phone, countryCode });
      await OTP.create({
        phone,
        countryCode,
        code: '0000',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      cooldownMap.set(cooldownKey, Date.now());
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 300,
        resendCooldown: 30,
      });
    }

    // Dev bypass: skip Authentica in development if DEV_OTP_BYPASS is enabled
    if (process.env.DEV_OTP_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
      await OTP.deleteMany({ phone, countryCode });
      await OTP.create({
        phone,
        countryCode,
        code: '0000',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      cooldownMap.set(cooldownKey, Date.now());

      console.log(`[DEV] OTP bypass active — use code 0000 for ${countryCode}${phone}`);
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 300,
        resendCooldown: 30,
      });
    }

    // Send OTP via Authentica (SMS first, WhatsApp fallback on transient errors)
    const result = await authentica.sendOTP(phone, countryCode, { method, lang });

    // Track cooldown
    cooldownMap.set(cooldownKey, Date.now());

    res.status(200).json({
      success: true,
      message: result.message,
      deliveryMethod: result.deliveryMethod,
      expiresIn: 300,
      resendCooldown: 30,
    });
  } catch (error) {
    // Return user-friendly message if Authentica service provided one
    if (error.userMessage) {
      return res.status(error.status || 503).json({
        success: false,
        message: error.userMessage,
      });
    }

    // Handle rate limit / cooldown errors
    if (error.message && error.message.includes('Too many')) {
      return res.status(429).json({ success: false, message: error.message });
    }

    next(error);
  }
};

// @desc    Verify OTP and login/register
// @route   POST /api/v1/auth/verify-otp
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

    // Test accounts: accept 0000
    const isTestAccount = TEST_ACCOUNTS[phone] && otp === '0000';

    // Dev bypass: accept 0000 as valid OTP for testing
    const isDevBypass = process.env.DEV_OTP_BYPASS === 'true'
      && process.env.NODE_ENV !== 'production'
      && otp === '0000';

    if (!isTestAccount && !isDevBypass) {
      // Verify OTP via Authentica
      const result = await authentica.verifyOTP(phone, countryCode, otp);
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }
    }

    // Find or create user (phone-only registration, no password/email required)
    const phoneVariants = [
      phone,                                    // 500000000
      `0${phone}`,                              // 0500000000
      `${countryCode}${phone}`,                 // +966500000000
      phone.replace(/^0+/, ''),                 // strip leading zeros
    ];

    // Fix corrupted Extended JSON dates before Mongoose hydration.
    // Some docs have createdAt/updatedAt as { $date: '...' } objects
    // (from a MongoDB import) instead of native BSON Date — this makes
    // Mongoose throw "Cast to date failed" on findOne or save.
    const rawCol = User.collection;
    const rawDoc = await rawCol.findOne({ phone: { $in: phoneVariants } });
    if (rawDoc) {
      const dateFix = {};
      if (rawDoc.createdAt && typeof rawDoc.createdAt === 'object' && rawDoc.createdAt.$date) {
        dateFix.createdAt = new Date(rawDoc.createdAt.$date);
      }
      if (rawDoc.updatedAt && typeof rawDoc.updatedAt === 'object' && rawDoc.updatedAt.$date) {
        dateFix.updatedAt = new Date(rawDoc.updatedAt.$date);
      }
      if (Object.keys(dateFix).length > 0) {
        await rawCol.updateOne({ _id: rawDoc._id }, { $set: dateFix });
        console.log(`[OTP] Fixed corrupted date fields for user ${rawDoc._id}`);
      }
    }

    let user = await User.findOne({ phone: { $in: phoneVariants } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const createData = {
        phone,
        phoneVerified: true,
        role: TEST_ACCOUNTS[phone] || 'guest',
        name: `User ${phone.slice(-4)}`,
      };
      if (TEST_ACCOUNTS[phone] === 'admin') createData.adminRole = 'super';
      user = await User.create(createData);
    } else {
      // Normalize phone to the format without leading 0 for consistency
      if (user.phone !== phone) {
        console.log(`[OTP] Normalizing phone from "${user.phone}" to "${phone}"`);
        user.phone = phone;
      }
      // Ensure test accounts always have the correct role
      if (TEST_ACCOUNTS[phone] && user.role !== TEST_ACCOUNTS[phone]) {
        user.role = TEST_ACCOUNTS[phone];
        if (TEST_ACCOUNTS[phone] === 'admin') user.adminRole = 'super';
      }
      user.phoneVerified = true;
      await user.save();
    }

    // Generate access token
    const token = generateAccessToken(user);

    // Generate refresh token
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      platform: req.headers['x-platform'] || 'web',
    };
    const { rawToken: refreshToken } = await RefreshToken.createToken(user._id, deviceInfo);

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;

    // Set cookies for web clients
    res.cookie('hostn_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
    res.cookie('hostn_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
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
