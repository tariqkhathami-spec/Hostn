const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStats,
  getUsers,
  getUserDetail,
  updateUser,
  getHostDetail,
  updateHost,
  getProperties,
  moderateProperty,
  getBookings,
  updateBooking,
  getLogs,
} = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/stats', getStats);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id', updateUser);

// Hosts
router.get('/hosts/:id', getHostDetail);
router.patch('/hosts/:id', updateHost);

// Properties
router.get('/properties', getProperties);
router.post('/properties/:id/moderate', moderateProperty);

// Bookings
router.get('/bookings', getBookings);
router.patch('/bookings/:id', updateBooking);

// Activity Logs
router.get('/logs', getLogs);

module.exports = router;
