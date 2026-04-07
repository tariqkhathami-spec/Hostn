const express = require('express');
const router = express.Router();
const {
  createHold,
  createBooking,
  getMyBookings,
  getHostBookings,
  getBooking,
  updateBookingStatus,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const {
  createBookingRules,
  holdBookingRules,
  updateBookingStatusRules,
  mongoIdParam,
} = require('../middleware/validate');

router.use(protect);

router.post('/hold', holdBookingRules, createHold);
router.post('/', createBookingRules, createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/host-bookings', getHostBookings);
router.get('/:id', mongoIdParam(), getBooking);
router.put('/:id/status', mongoIdParam(), updateBookingStatusRules, updateBookingStatus);
router.put('/:id/cancel', mongoIdParam(), cancelBooking);

module.exports = router;
