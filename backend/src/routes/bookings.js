const express = require('express');
const router = express.Router();
const {
  createHold,
  createBooking,
  getMyBookings,
  getHostBookings,
  getUnitBookedDates,
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

// Public: the calendar must grey out taken nights for visitors who have not
// signed in yet. It only returns date ranges, never who booked.
router.get('/unit/:unitId/dates', getUnitBookedDates);

router.use(protect);

router.post('/hold', holdBookingRules, createHold);
router.post('/', createBookingRules, createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/host-bookings', getHostBookings);
router.get('/:id', mongoIdParam(), getBooking);
router.put('/:id/status', mongoIdParam(), updateBookingStatusRules, updateBookingStatus);
router.put('/:id/cancel', mongoIdParam(), cancelBooking);

module.exports = router;
