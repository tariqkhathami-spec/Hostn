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

// Bookings — super + support + finance (view), super + support (manage)
router.get('/bookings', authorizePermission(PERMISSIONS.VIEW_BOOKINGS), getBookings);
router.patch('/bookings/:id', authorizePermission(PERMISSIONS.MANAGE_BOOKINGS), updateBooking);
router.delete('/bookings/:id', authorizePermission(PERMISSIONS.MANAGE_BOOKINGS), deleteBooking);

// Payments — super + finance
router.get('/payments', authorizePermission(PERMISSIONS.VIEW_PAYMENTS), getPayments);
router.post('/payments/:id/refund', authorizePermission(PERMISSIONS.MANAGE_PAYMENTS), refundPayment);

// Activity Logs — super + support + finance
router.get('/logs', authorizePermission(PERMISSIONS.VIEW_LOGS), getLogs);

module.exports = router;
