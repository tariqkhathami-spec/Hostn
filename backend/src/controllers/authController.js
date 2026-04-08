const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendVerificationCode } = require('../services/email');

// Short-lived access token (15 min)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Cookie options
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 min
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
const sendAuthResponse = async (user, statusCode, res, req) => {
  const accessToken = generateAccessToken(user);

  const deviceInfo = {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    platform: req.headers['x-platform'] || 'web',
  };

  const { rawToken: refreshToken } = await RefreshToken.createToken(user._id, deviceInfo);

  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

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
    const { name, email, password, phone, role } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    let user;

    // Check if a phone-only user exists (registered via OTP on mobile)
    if (phone) {
      const phoneUser = await User.findOne({
        phone,
        $or: [{ email: { $exists: false } }, { email: null }],
      });
      if (phoneUser) {
        // Merge: add email+password to existing phone account
        phoneUser.name = name;
        phoneUser.email = email;
        phoneUser.password = password;
        if (role === 'host') phoneUser.role = 'host';
        await phoneUser.save();
        user = phoneUser;
      }
    }

    if (!user) {
      user = await User.create({
        name,
        email,
        password,
        phone,
        role: role === 'host' ? 'host' : 'guest',
      });
    }

    await sendAuthResponse(user, 201, res, req);
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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    let user;
    if (/^5\d{8}$/.test(email)) {
      // User might be entering their Saudi phone number
      user = await User.findOne({ phone: email }).select('+password');
    } else {
      user = await User.findOne({ email }).select('+password');
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

    await sendAuthResponse(user, 200, res, req);
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

    const user = await User.findById(result.userId);
    if (!user || user.isSuspended) {
      return res.status(401).json({ success: false, message: 'User not found or suspended' });
    }

    const accessToken = generateAccessToken(user);

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

    // Increment tokenVersion to invalidate all existing access tokens
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });

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
    const user = await User.findById(req.user._id).populate('wishlist', 'title images location pricing ratings');
    res.json({ success: true, user });
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

    // ── Email change flow ────────────────────────────────────────────────
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if email is already taken by another user
      const existingEmailUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
      if (existingEmailUser) {
        return res.status(400).json({ success: false, message: 'Email already registered to another account' });
      }

      // Step 2: verify code and apply email change
      if (emailVerificationCode) {
        const tokenHash = crypto.createHash('sha256').update(emailVerificationCode).digest('hex');
        const raw = await User.collection.findOne({ _id: req.user._id });

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
        await User.collection.updateOne(
          { _id: req.user._id },
          {
            $set: { email: normalizedEmail },
            $unset: { pendingEmail: '', emailVerificationCode: '', emailVerificationExpires: '' },
          }
        );

        const updatedUser = await User.findById(req.user._id);
        return res.json({ success: true, user: updatedUser });
      }

      // Step 1: generate code and store pending email
      const code = crypto.randomInt(100000, 999999).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      await User.collection.updateOne(
        { _id: req.user._id },
        {
          $set: {
            pendingEmail: normalizedEmail,
            emailVerificationCode: codeHash,
            emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
          },
        }
      );

      // Send verification email
      try {
        const lang = req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en';
        await sendVerificationCode(normalizedEmail, code, lang);
      } catch (emailErr) {
        console.error('[EMAIL] Failed to send verification email:', emailErr.message);
      }

      return res.json({
        success: true,
        message: 'Verification code sent to new email',
        // Include code in dev for testing
        ...(process.env.NODE_ENV !== 'production' && { devCode: code }),
      });
    }

    // ── Phone change flow (OTP required) ───────────────────────────────
    if (phone !== undefined) {
      const currentUser = await User.findById(req.user._id);
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

        const OTP = require('../models/OTP');
        const isDevBypass = process.env.DEV_OTP_BYPASS === 'true' && phoneVerificationCode === '000000';
        if (!isDevBypass) {
          const result = await OTP.verifyCode(rawPhone, cc, phoneVerificationCode);
          if (!result.valid) {
            return res.status(400).json({ success: false, message: result.message || 'Invalid verification code' });
          }
        }

        // Check phone not already taken
        const existingPhoneUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
        if (existingPhoneUser) {
          return res.status(400).json({ success: false, message: 'Phone already linked to another account' });
        }

        // Apply phone change along with any other profile fields
        const updates = { phone, phoneVerified: true };
        if (name !== undefined) updates.name = name;
        if (avatar !== undefined) updates.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
        return res.json({ success: true, user });
      }
    }

    // ── Normal profile update (name, avatar — phone unchanged) ──────────
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone; // same phone, no verification needed
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
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

    const user = await User.findById(req.user._id).select('+password');
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
    await sendAuthResponse(user, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Upgrade guest account to host
// @route   PUT /api/auth/upgrade-to-host
// @access  Private
exports.upgradeToHost = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.role !== 'guest') {
      return res.status(400).json({
        success: false,
        message: user.role === 'host' ? 'You are already a host' : 'Role upgrade not available',
      });
    }

    user.role = 'host';
    user.tokenVersion += 1;
    await user.save();

    // Revoke old refresh tokens and issue fresh ones with new role
    await RefreshToken.revokeAllForUser(user._id);
    await sendAuthResponse(user, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle wishlist (adds/removes from default list + keeps user.wishlist in sync)
// @route   POST /api/auth/wishlist/:propertyId
// @access  Private
exports.toggleWishlist = async (req, res, next) => {
  try {
    const Wishlist = require('../models/Wishlist');
    const user = await User.findById(req.user._id);
    const propertyId = req.params.propertyId;

    // Toggle in user.wishlist (backward compat for mobile)
    const index = user.wishlist.indexOf(propertyId);
    const adding = index === -1;
    if (adding) {
      user.wishlist.push(propertyId);
    } else {
      user.wishlist.splice(index, 1);
    }
    await user.save();

    // Also toggle in the default Wishlist list
    const defaultList = await Wishlist.getOrCreateDefault(req.user._id);
    const listIdx = defaultList.properties.indexOf(propertyId);
    if (adding && listIdx === -1) {
      defaultList.properties.push(propertyId);
    } else if (!adding && listIdx > -1) {
      defaultList.properties.splice(listIdx, 1);
    }
    await defaultList.save();

    res.json({ success: true, wishlist: user.wishlist });
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

    // Check if phone already used by another account
    const existingPhoneUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check if email already used
    const existingEmailUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
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

    // Revoke all refresh tokens
    await RefreshToken.revokeAllForUser(userId);

    // Remove the user document
    await User.findByIdAndDelete(userId);

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

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been generated' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token and expiry directly on user document
    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
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

    // Hash the incoming token and find matching user
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.collection.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Hash new password and update
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
        $inc: { tokenVersion: 1 },
      }
    );

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
