const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

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
  path: '/api/auth', // Only sent to auth endpoints
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role === 'host' ? 'host' : 'guest',
    });

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

    const user = await User.findOne({ email }).select('+password');
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

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
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

// @desc    Toggle wishlist
// @route   POST /api/auth/wishlist/:propertyId
// @access  Private
exports.toggleWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const propertyId = req.params.propertyId;

    const index = user.wishlist.indexOf(propertyId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(propertyId);
    }

    await user.save();
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    next(error);
  }
};
