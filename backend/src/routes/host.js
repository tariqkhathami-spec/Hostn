const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentBookings,
  getNotifications,
  getEarnings,
  getCalendar,
  blockDates,
  getHostReviews,
  togglePropertyStatus,
  addPropertyImage,
  removePropertyImage,
} = require('../controllers/hostController');
const { protect, authorize } = require('../middleware/auth');
const { blockDatesRules, mongoIdParam } = require('../middleware/validate');
const { uploadSingle } = require('../middleware/upload');

// All routes require host or admin role
router.use(protect);
router.use(authorize('host', 'admin'));

router.get('/stats', getDashboardStats);
router.get('/recent-bookings', getRecentBookings);
router.get('/notifications', getNotifications);
router.get('/earnings', getEarnings);
router.get('/calendar/:propertyId', mongoIdParam('propertyId'), getCalendar);
router.put('/calendar/:propertyId/block', mongoIdParam('propertyId'), blockDatesRules, blockDates);
router.get('/reviews', getHostReviews);
router.put('/properties/:id/toggle', mongoIdParam(), togglePropertyStatus);
router.post('/properties/:id/images', mongoIdParam(), uploadSingle, addPropertyImage);
router.delete('/properties/:id/images', mongoIdParam(), removePropertyImage);

module.exports = router;
