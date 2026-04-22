const jwt = require('jsonwebtoken');
const OTP = require('../models/OTP');
const Guest = require('../models/Guest');
const Host = require('../models/Host');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const authentica = require('../services/authentica');
const { resolveUserType, inferUserTypeFromOrigin } = require('./authController');

const MODEL_BY_TYPE = { guest: Guest, host: Host, admin: Admin };
const TYPE_CAPITALIZED = { guest: 'Guest', host: 'Host', admin: 'Admin' };

// Long-lived access token (30 days — matches refresh token & authController)
const generateAccessToken = (user, userType) => {
  return jwt.sign(
    {
      id: user._id,
      phone: user.phone,
      userType,
      role: userType, // legacy alias
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Test accounts — bypass OTP with code 0000.
// Each test phone maps to a role; the user is created in the collection
// matching the request's Origin (or the mapped role if Origin is ambiguous).
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

    // Check if user is suspended in the target collection (based on origin)
    const userType = resolveUserType(req);
    const Model = MODEL_BY_TYPE[userType] || Guest;
    const existingUser = await Model.findOne({
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
    if (error.userMessage) {
      return res.status(error.status || 503).json({
        success: false,
        message: error.userMessage,
      });
    }

    if (error.message && error.message.includes('Too many')) {
      return res.status(429).json({ success: false, message: error.message });
    }

    next(error);
  }
};

// @desc    Verify OTP and login/register into the correct role collection
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

    // Determine which role-specific collection to register/authenticate against.
    // Priority:
    //   1. Origin header (subdomain) — production source of truth
    //   2. Test account role (backward compat for the 500000001/2/3 test phones)
    //   3. Fallback 'guest'
    const originType = inferUserTypeFromOrigin(req.headers.origin || req.headers.referer);
    const userType = originType || TEST_ACCOUNTS[phone] || resolveUserType(req);
    const Model = MODEL_BY_TYPE[userType];
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
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

    let user = await Model.findOne({ phone: { $in: phoneVariants } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const createData = {
        phone,
        phoneVerified: true,
        name: `User ${phone.slice(-4)}`,
      };
      if (userType === 'admin') createData.adminRole = TEST_ACCOUNTS[phone] === 'admin' ? 'super' : 'support';
      user = await Model.create(createData);
    } else {
      // Normalize phone to the format without leading 0 for consistency
      if (user.phone !== phone) {
        console.log(`[OTP] Normalizing phone from "${user.phone}" to "${phone}"`);
        user.phone = phone;
      }
      user.phoneVerified = true;
      await user.save();
    }

    // Generate access token
    const token = generateAccessToken(user, userType);

    // Generate refresh token
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      platform: req.headers['x-platform'] || 'web',
    };
    const { rawToken: refreshToken } = await RefreshToken.createToken(
      user._id,
      TYPE_CAPITALIZED[userType],
      deviceInfo
    );

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    userObj.userType = userType;
    userObj.role = userType; // legacy alias

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
