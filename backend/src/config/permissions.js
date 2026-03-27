/**
 * Admin Permission System
 *
 * Defines granular permissions for admin sub-roles.
 * Super Admin has all permissions. Support and Finance have restricted scopes.
 */

const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',

  // User management
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',

  // Property moderation
  VIEW_PROPERTIES: 'view_properties',
  MODERATE_PROPERTIES: 'moderate_properties',

  // Booking management
  VIEW_BOOKINGS: 'view_bookings',
  MANAGE_BOOKINGS: 'manage_bookings',

  // Payment & finance
  VIEW_PAYMENTS: 'view_payments',
  MANAGE_PAYMENTS: 'manage_payments',
  PROCESS_REFUNDS: 'process_refunds',

  // Support
  VIEW_SUPPORT: 'view_support',
  MANAGE_SUPPORT: 'manage_support',

  // Reports
  VIEW_REPORTS: 'view_reports',
  MANAGE_REPORTS: 'manage_reports',

  // Activity logs
  VIEW_LOGS: 'view_logs',

  // Admin management (super only)
  MANAGE_ADMINS: 'manage_admins',
};

/**
 * Role-to-permission mapping.
 * Super admin has all permissions.
 */
const ROLE_PERMISSIONS = {
  super: Object.values(PERMISSIONS),

  support: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PROPERTIES,
    PERMISSIONS.MODERATE_PROPERTIES,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.VIEW_SUPPORT,
    PERMISSIONS.MANAGE_SUPPORT,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.VIEW_LOGS,
  ],

  finance: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.PROCESS_REFUNDS,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_LOGS,
  ],
};

/**
 * Check if a user has a specific permission.
 * Non-admin users always return false.
 * Admin users without adminRole default to 'super' (backward compat).
 */
function hasPermission(user, permission) {
  if (user.role !== 'admin') return false;
  const adminRole = user.adminRole || 'super';
  const rolePerms = ROLE_PERMISSIONS[adminRole];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
}

/**
 * Get all permissions for a given admin sub-role.
 */
function getPermissionsForRole(adminRole) {
  return ROLE_PERMISSIONS[adminRole] || [];
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsForRole,
};
