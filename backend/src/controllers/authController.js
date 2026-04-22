const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Guest = require('../models/Guest');
const Host = require('../models/Host');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const { sendVerificationCode } = require('../services/email');
const authentica = require('../services/authentica');

const MODEL_BY_TYPE = { guest: Guest, host: Host, admin: Admin };
const TYPE_CAPITALIZED = { guest: 'Guest', host: 'Host', admin: 'Admin' };

/**
 * Determine the target user type (guest|host|admin) from the request origin.
 * - admin.*   → admin
 * - business.* → host
 * - anything else (hostn.co, localhost:3000, etc.) → guest
 */
function inferUserTypeFromOrigin(origin) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host.startsWith('admin.')) return 'admin';
    if (host.startsWith('business.')) return 'host';
    return 'guest';
  } catch {
    return null;
  }
}

/**
 * Backward-compat: accept `role` body param as fallback when Origin header
 * doesn't disambiguate (e.g. during the Phase 1 transition period before
 * subdomain routing is live). Prefers Origin header.
 */
function resolveUserType(req) {
  const fromOrigin = inferUserTypeFromOrigin(req.headers.origin || req.headers.referer);
  if (fromOrigin) return fromOrigin;
  const bodyRole = req.body?.role;
  if (bodyRole && MODEL_BY_TYPE[bodyRole]) return bodyRole;
  // Default to guest — matches legacy behavior
  return 'guest';
}

function getModel(userType) {
  return MODEL_BY_TYPE[userType] || null;
}

/**
 * Given a user document, return the Mongoose Model it came from.
 * Uses the discriminator attached by the protect middleware.
 */
function getUserModel(user) {
  const modelName = user.constructor?.modelName || TYPE_CAPITALIZED[user.userType];
  if (modelName === 'Guest') return Guest;
  if (modelName === 'Host') return Host;
  if (modelName === 'Admin') return Admin;
  return null;
}

// Long-lived access token (30 days — matches refresh token lifetime)
const generateAccessToken = (user, userType) => {
  const ut = userType || user.userType || (user.constructor?.modelName || '').toLowerCase();
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      userType: ut,
      role: ut, // legacy alias for middleware/frontend during transition
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Cookie options
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/v1/auth', // Only sent to auth endpoints
};

/**
 * Send access + refresh tokens.
 * Web: tokens set as HttpOnly cookies.
 * Mobile: tokens also returned in JSON body (client stores in SecureStore).
 */
const sendAuthResponse = async (user, userType, statusCode, res, req) => {
  const accessToken = generateAccessToken(user, userType);

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

  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  userObj.userType = userType;
  userObj.role = userType; // legacy alias

  // Set cookies (web)
  res.cookie('hostn_token', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('hostn_refresh', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(statusCode).json({
    success: true,
    token: accessToken,
    refreshToken,
    user: userObj,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const userType = resolveUserType(req);
    const Model = getModel(userType);

    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    }

    const existingEmail = await Model.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    let user;

    // Check if a phone-only user exists in this collection (registered via OTP on mobile)
    if (phone) {
      const phoneUser = await Model.findOne({
        phone,
        $or: [{ email: { $exists: false } }, { email: null }],
      });
      if (phoneUser) {
        // Merge: add email+password to existing phone account
        phoneUser.name = name;
        phoneUser.email = email;
        phoneUser.password = password;
        await phoneUser.save();
        user = phoneUser;
      }
    }

    if (!user) {
      user = await Model.create({ name, email, password, phone });
    }

    await sendAuthResponse(user, userType, 201, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userType = resolveUserType(req);
    const Model = getModel(userType);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    }

    let user;
    if (/^5\d{8}$/.test(email)) {
      // User might be entering their Saudi phone number
      user = await Model.findOne({ phone: email }).select('+password');
    } else {
      user = await Model.findOne({ email }).select('+password');
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact support for assistance.',
      });
    }

    await sendAuthResponse(user, userType, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (requires valid refresh token)
exports.refresh = async (req, res, next) => {
  try {
    // Get refresh token from cookie (web) or body (mobile)
    const rawToken = req.cookies?.hostn_refresh || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const result = await RefreshToken.rotateToken(rawToken);

    if (!result.valid) {
      // Clear cookies on invalid token
      res.cookie('hostn_token', '', { ...ACCESS_COOKIE_OPTIONS, expires: new Date(0) });
      res.cookie('hostn_refresh', '', { ...REFRESH_COOKIE_OPTIONS, expires: new Date(0) });
      return res.status(401).json({ success: false, message: result.reason });
    }

    // Determine the Model from the refresh token's userType discriminator
    const userType = (result.userType || '').toLowerCase();
    const Model = getModel(userType);
    if (!Model) {
      return res.status(401).json({ success: false, message: 'Unknown user type' });
    }

    const user = await Model.findById(result.userId);
    if (!user || user.isSuspended) {
      return res.status(401).json({ success: false, message: 'User not found or suspended' });
    }

    const accessToken = generateAccessToken(user, userType);

    // Set new cookies
    res.cookie('hostn_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('hostn_refresh', result.rawToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      token: accessToken,
      refreshToken: result.rawToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout (revoke refresh token, clear cookies)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  const rawToken = req.cookies?.hostn_refresh || req.body?.refreshToken;
  if (rawToken) {
    await RefreshToken.revokeToken(rawToken);
  }

  res.cookie('hostn_token', '', { ...ACCESS_COOKIE_OPTIONS, expires: new Date(0) });
  res.cookie('hostn_refresh', '', { ...REFRESH_COOKIE_OPTIONS, expires: new Date(0) });
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Logout all sessions
// @route   POST /api/auth/logout-all
// @access  Private
exports.logoutAll = async (req, res, next) => {
  try {
    await RefreshToken.revokeAllForUser(req.user._id);

    // Increment tokenVersion on the correct model to invalidate all existing access tokens
    const Model = getUserModel(req.user);
    if (Model) {
      await Model.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
    }

    res.cookie('hostn_token', '', { ...ACCESS_COOKIE_OPTIONS, expires: new Date(0) });
    res.cookie('hostn_refresh', '', { ...REFRESH_COOKIE_OPTIONS, expires: new Date(0) });
    res.json({ success: true, message: 'All sessions revoked' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const Model = getUserModel(req.user);
    const user = await Model.findById(req.user._id);
    const userObj = user.toObject();
    userObj.userType = req.user.userType;
    userObj.role = req.user.userType; // legacy alias
    res.json({ success: true, user: userObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile (also handles email change with verification)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, email, emailVerificationCode } = req.body;
    const Model = getUserModel(req.user);

    // ── Email change flow ────────────────────────────────────────────────
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if email is already taken by another user in THIS collection
      const existingEmailUser = await Model.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
      if (existingEmailUser) {
        return res.status(400).json({ success: false, message: 'Email already registered to another account' });
      }

      // Step 2: verify code and apply email change
      if (emailVerificationCode) {
        const tokenHash = crypto.createHash('sha256').update(emailVerificationCode).digest('hex');
        const raw = await Model.collection.findOne({ _id: req.user._id });

        if (
          !raw.emailVerificationCode ||
          raw.emailVerificationCode !== tokenHash ||
          !raw.pendingEmail ||
          raw.pendingEmail !== normalizedEmail ||
          !raw.emailVerificationExpires ||
          new Date(raw.emailVerificationExpires) < new Date()
        ) {
          return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }

        // Apply the email change
        await Model.collection.updateOne(
          { _id: req.user._id },
          {
            $set: { email: normalizedEmail },
            $unset: { pendingEmail: '', emailVerificationCode: '', emailVerificationExpires: '' },
          }
        );

        const updatedUser = await Model.findById(req.user._id);
        return res.json({ success: true, user: updatedUser });
      }

      // Step 1: generate code and store pending email
      const code = crypto.randomInt(100000, 999999).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      await Model.collection.updateOne(
        { _id: req.user._id },
        {
          $set: {
            pendingEmail: normalizedEmail,
            emailVerificationCode: codeHash,
            emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
          },
        }
      );

      // Send verification email (non-blocking — code is already saved to DB)
      const lang = req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en';
      sendVerificationCode(normalizedEmail, code, lang).catch((emailErr) => {
        console.error('[EMAIL] Failed to send verification email:', emailErr.message);
      });

      return res.json({
        success: true,
        message: 'Verification code sent to new email',
        // Include code in dev for testing
        ...(process.env.NODE_ENV !== 'production' && { devCode: code }),
      });
    }

    // ── Phone change flow (OTP required) ───────────────────────────────
    if (phone !== undefined) {
      const currentUser = await Model.findById(req.user._id);
      const currentPhone = currentUser.phone || '';

      if (phone && phone !== currentPhone) {
        const { phoneVerificationCode, phoneCountryCode } = req.body;

        if (!phoneVerificationCode) {
          return res.status(400).json({
            success: false,
            message: 'Phone verification required. Send OTP to the new number first.',
            requiresVerification: true,
          });
        }

        // Extract raw phone (without country code) for OTP lookup
        const cc = phoneCountryCode || '+966';
        const rawPhone = phone.startsWith(cc) ? phone.slice(cc.length) : phone;

        // Test accounts bypass OTP verification
        const TEST_ACCOUNTS = { '500000001': true, '500000002': true, '500000003': true };
        const isTestAccount = TEST_ACCOUNTS[rawPhone] && phoneVerificationCode === '0000';
        const isDevBypass = process.env.DEV_OTP_BYPASS === 'true' && phoneVerificationCode === '000000';

        if (!isTestAccount && !isDevBypass) {
          // Verify OTP via Authentica API (same as login flow)
          const result = await authentica.verifyOTP(rawPhone, cc, phoneVerificationCode);
          if (!result.valid) {
            return res.status(400).json({ success: false, message: result.message || 'Invalid verification code' });
          }
        }

        // Check phone not already taken within the SAME collection
        const existingPhoneUser = await Model.findOne({
          phone: { $in: [rawPhone, phone, `0${rawPhone}`] },
          _id: { $ne: req.user._id },
        });
        if (existingPhoneUser) {
          return res.status(400).json({ success: false, message: 'Phone already linked to another account' });
        }

        // Apply phone change — store raw phone (without country code) for consistency
        const updates = { phone: rawPhone, phoneVerified: true };
        if (name !== undefined) updates.name = name;
        if (avatar !== undefined) updates.avatar = avatar;

        const user = await Model.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
        return res.json({ success: true, user });
      }
    }

    // ── Normal profile update (name, avatar — phone unchanged) ──────────
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone; // same phone, no verification needed
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await Model.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const Model = getUserModel(req.user);

    const user = await Model.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.tokenVersion += 1; // Invalidate all existing access tokens
    await user.save();

    // Revoke all refresh tokens (force re-login on other devices)
    await RefreshToken.revokeAllForUser(user._id);

    // Issue fresh tokens for current session
    await sendAuthResponse(user, req.user.userType, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    DEPRECATED — upgrade guest → host is no longer an in-place upgrade.
//         In the new multi-collection model, guests who want to become hosts
//         register a new account on business.hostn.co.
// @route   PUT /api/auth/upgrade-to-host
// @access  Private
exports.upgradeToHost = async (req, res) => {
  return res.status(410).json({
    success: false,
    message:
      'Guest accounts are separate from host accounts. To become a host, sign up for a new host account at business.hostn.co.',
  });
};

// @desc    Toggle wishlist (guest only — hosts/admins don't have wishlists)
// @route   POST /api/auth/wishlist/:propertyId
// @access  Private
exports.toggleWishlist = async (req, res, next) => {
  try {
    // Wishlists are guest-only
    if (req.user.userType !== 'guest') {
      return res.status(403).json({ success: false, message: 'Only guests can use wishlist' });
    }

    const Wishlist = require('../models/Wishlist');
    const unitId = req.params.propertyId; // Route still uses :propertyId but now stores unit IDs

    // Toggle in the default Wishlist list
    const defaultList = await Wishlist.getOrCreateDefault(req.user._id);
    const listIdx = defaultList.units.findIndex((u) => u.toString() === unitId);
    if (listIdx === -1) {
      defaultList.units.push(unitId);
    } else {
      defaultList.units.splice(listIdx, 1);
    }
    await defaultList.save();

    res.json({ success: true, wishlist: defaultList.units });
  } catch (error) {
    next(error);
  }
};

// @desc    Link phone number to account (for web users to enable mobile login)
// @route   PUT /api/auth/link-phone
// @access  Private
exports.linkPhone = async (req, res, next) => {
  try {
    const { phone, otp, countryCode = '+966' } = req.body;
    const Model = getUserModel(req.user);

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    // Verify OTP first
    const isDevBypass = process.env.DEV_OTP_BYPASS === 'true' && otp === '000000';
    if (!isDevBypass) {
      const OTP = require('../models/OTP');
      const result = await OTP.verifyCode(phone, countryCode, otp);
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }
    }

    // Check if phone already used by another account in SAME collection
    const existingPhoneUser = await Model.findOne({ phone, _id: { $ne: req.user._id } });
    if (existingPhoneUser) {
      return res.status(400).json({ success: false, message: 'Phone number already linked to another account' });
    }

    // Link phone
    req.user.phone = phone;
    req.user.phoneVerified = true;
    await req.user.save();

    const userObj = req.user.toObject();
    delete userObj.password;

    res.json({ success: true, message: 'Phone linked successfully', user: userObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Link email+password to account (for mobile users to enable web login)
// @route   PUT /api/auth/link-email
// @access  Private
exports.linkEmail = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const Model = getUserModel(req.user);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check if email already used in SAME collection
    const existingEmailUser = await Model.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
    if (existingEmailUser) {
      return res.status(400).json({ success: false, message: 'Email already registered to another account' });
    }

    // Link email + set password
    req.user.email = email.toLowerCase();
    req.user.password = password; // Will be hashed by pre-save hook
    if (name && req.user.name?.startsWith('User ')) {
      req.user.name = name;
    }
    await req.user.save();

    const userObj = req.user.toObject();
    delete userObj.password;

    res.json({ success: true, message: 'Email linked successfully', user: userObj });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    next(error);
  }
};

// @desc    Delete own account
// @route   DELETE /api/auth/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const Model = getUserModel(req.user);

    // Revoke all refresh tokens
    await RefreshToken.revokeAllForUser(userId);

    // Remove the user document from the correct collection
    await Model.findByIdAndDelete(userId);

    // Clear auth cookies
    res.cookie('hostn_token', '', { httpOnly: true, expires: new Date(0), path: '/' });
    res.cookie('hostn_refresh', '', { httpOnly: true, expires: new Date(0), path: '/api/v1/auth' });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password — generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const userType = resolveUserType(req);
    const Model = getModel(userType);
    const user = await Model.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been generated' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token and expiry directly on user document
    await Model.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          passwordResetType: userType, // remember which collection the token belongs to
        },
      }
    );

    // In production, this would send an email. For now, return the token in response.
    const resetUrl = `${process.env.CLIENT_URL || 'https://hostn.co'}/auth/reset-password?token=${resetToken}`;

    res.json({
      success: true,
      message: 'Password reset link generated',
      resetUrl,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming token and find matching user across all 3 collections
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    let foundModel = null;
    let user = null;
    for (const [type, Model] of Object.entries(MODEL_BY_TYPE)) {
      const doc = await Model.collection.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: new Date() },
      });
      if (doc) {
        foundModel = Model;
        user = doc;
        break;
      }
    }

    if (!foundModel || !user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Hash new password and update
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    await foundModel.collection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { passwordResetToken: '', passwordResetExpires: '', passwordResetType: '' },
        $inc: { tokenVersion: 1 },
      }
    );

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// Export helpers for other controllers
exports.getModel = getModel;
exports.getUserModel = getUserModel;
exports.resolveUserType = resolveUserType;
exports.inferUserTypeFromOrigin = inferUserTypeFromOrigin;
exports.TYPE_CAPITALIZED = TYPE_CAPITALIZED;
