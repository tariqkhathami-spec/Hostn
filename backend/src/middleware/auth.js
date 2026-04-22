const jwt = require('jsonwebtoken');
const Guest = require('../models/Guest');
const Host = require('../models/Host');
const Admin = require('../models/Admin');

const MODEL_BY_TYPE = { guest: Guest, host: Host, admin: Admin };

/**
 * Map a JWT's userType (or legacy role) to the correct Mongoose model.
 * Accepts 'guest' / 'host' / 'admin' (lowercase) from JWT payload.
 */
function getModelForUserType(userType) {
  return MODEL_BY_TYPE[userType] || null;
}

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
    // Support both new `userType` and legacy `role` field in JWT payload
    const userType = decoded.userType || decoded.role;
    const Model = getModelForUserType(userType);

    if (!Model) {
      return res.status(401).json({ success: false, message: 'Invalid user type in token' });
    }

    const user = await Model.findById(decoded.id).select('-password');

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
    // Attach userType for downstream authorization + polymorphic writes
    req.user.userType = userType;
    // Backward compat: legacy `role` field mirrors userType
    if (!req.user.role) req.user.role = userType;
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
    // Check both userType (new) and role (legacy) — protect() sets both
    const userRole = req.user.userType || req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized for this action`,
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
    // Only admins have sub-roles
    if (req.user.userType !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin permissions required',
      });
    }
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

// Export helper for other modules
exports.getModelForUserType = getModelForUserType;
