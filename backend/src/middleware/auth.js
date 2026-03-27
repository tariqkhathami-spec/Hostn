const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first (mobile), then fall back to HttpOnly cookie (web)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.hostn_token) {
      token = req.cookies.hostn_token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check tokenVersion — rejects tokens issued before password change / logout-all
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Token revoked — please log in again' });
    }

    // Block suspended users
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact support for assistance.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

/**
 * Granular permission check for admin sub-roles.
 * Must be used after protect + authorize('admin').
 * Admin users without adminRole default to 'super' (backward compat).
 */
exports.authorizePermission = (...requiredPermissions) => {
  const { hasPermission } = require('../config/permissions');
  return (req, res, next) => {
    for (const perm of requiredPermissions) {
      if (!hasPermission(req.user, perm)) {
        return res.status(403).json({
          success: false,
          message: `Permission '${perm}' is required for this action`,
          requiredPermission: perm,
        });
      }
    }
    next();
  };
};
