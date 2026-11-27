const express = require('express');
const router = express.Router();
const { protect, authorize, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const {
  getStats,
  getUsers,
  getUserDetail,
  updateUser,
  getHostDetail,
  updateHost,
  getProperties,
  moderateProperty,
  getPropertyUnits,
  toggleUnitStatus,
  getBookings,
  updateBooking,
  deleteBooking,
  getPayments,
  refundPayment,
  getLogs,
} = require('../controllers/adminController');
const { mongoIdParam } = require('../middleware/validate');
const { getLicenses, reviewLicense } = require('../controllers/adminLicenseController');

// All admin routes require auth + admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard — all admin sub-roles
router.get('/stats', authorizePermission(PERMISSIONS.VIEW_DASHBOARD), getStats);

// Users — super + support (view), super only (manage)
router.get('/users', authorizePermission(PERMISSIONS.VIEW_USERS), getUsers);
router.get('/users/:id', authorizePermission(PERMISSIONS.VIEW_USERS), getUserDetail);
router.patch('/users/:id', authorizePermission(PERMISSIONS.MANAGE_USERS), updateUser);

// Hosts — super + support
router.get('/hosts/:id', authorizePermission(PERMISSIONS.VIEW_USERS), getHostDetail);
router.patch('/hosts/:id', authorizePermission(PERMISSIONS.MANAGE_USERS), updateHost);

// Properties — super + support
router.get('/properties', authorizePermission(PERMISSIONS.VIEW_PROPERTIES), getProperties);
router.post('/properties/:id/moderate', authorizePermission(PERMISSIONS.MODERATE_PROPERTIES), moderateProperty);

// Units
router.get('/properties/:propertyId/units', mongoIdParam('propertyId'), authorizePermission(PERMISSIONS.VIEW_PROPERTIES), getPropertyUnits);
router.patch('/units/:id/toggle', mongoIdParam(), authorizePermission(PERMISSIONS.MODERATE_PROPERTIES), toggleUnitStatus);

// Tourism permits — hosts submit, admins approve or reject
router.get('/licenses', authorizePermission(PERMISSIONS.VIEW_PROPERTIES), getLicenses);
router.put('/licenses/:unitId', authorizePermission(PERMISSIONS.MODERATE_PROPERTIES), reviewLicense);

// Bookings — super + support + finance (view), super + support (manage)
router.get('/bookings', authorizePermission(PERMISSIONS.VIEW_BOOKINGS), getBookings);
router.patch('/bookings/:id', authorizePermission(PERMISSIONS.MANAGE_BOOKINGS), updateBooking);
router.delete('/bookings/:id', authorizePermission(PERMISSIONS.MANAGE_BOOKINGS), deleteBooking);

// Payments — super + finance
router.get('/payments', authorizePermission(PERMISSIONS.VIEW_PAYMENTS), getPayments);
router.post('/payments/:id/refund', authorizePermission(PERMISSIONS.MANAGE_PAYMENTS), refundPayment);

// Staff and account managers — super admins only
const staff = require('../controllers/adminStaffController');
router.get('/staff', authorizePermission(PERMISSIONS.MANAGE_ADMINS), staff.getStaff);
router.post('/staff', authorizePermission(PERMISSIONS.MANAGE_ADMINS), staff.createStaff);
router.get('/host-assignments', authorizePermission(PERMISSIONS.MANAGE_ADMINS), staff.getAssignments);
router.post('/host-assignments/distribute', authorizePermission(PERMISSIONS.MANAGE_ADMINS), staff.distributeUnassigned);
router.put('/hosts/:id/account-manager', authorizePermission(PERMISSIONS.MANAGE_ADMINS), staff.assignManager);

// Integration keys and AI settings — super admins only, step-up for changes
const integrations = require('../controllers/adminIntegrationsController');
const userRateLimit = require('../middleware/userRateLimit');
const stepUpLimiter = userRateLimit({ name: 'stepup', windowMs: 15 * 60 * 1000, max: 8, message: 'محاولات كثيرة، حاول بعد ربع ساعة' });
const manageIntegrations = authorizePermission(PERMISSIONS.MANAGE_INTEGRATIONS);
router.get('/integrations', manageIntegrations, integrations.list);
router.post('/integrations/step-up/send', manageIntegrations, stepUpLimiter, integrations.sendStepUp);
router.post('/integrations/step-up/verify', manageIntegrations, stepUpLimiter, integrations.verifyStepUp);
router.put('/integrations/:key', manageIntegrations, integrations.requireStepUp, integrations.setKey);
router.delete('/integrations/:key', manageIntegrations, integrations.requireStepUp, integrations.clearKey);

// Activity Logs — super + support + finance
router.get('/logs', authorizePermission(PERMISSIONS.VIEW_LOGS), getLogs);

module.exports = router;
