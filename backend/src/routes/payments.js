const express = require('express');
const router = express.Router();
const { protect, authorize, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const {
  initiatePayment,
  verifyPayment,
  webhook,
  getPayment,
  getMyPayments,
  getAllPayments,
  refundPayment,
  simulatePayment,
  getPaymentStatus,
} = require('../controllers/paymentController');

// Public webhook endpoint (called by Moyasar)
router.post('/webhook', webhook);

// Protected routes
router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
// PR K: simulator endpoints — gated server-side by `PAYMENT_SIMULATOR_ENABLED`.
// `simulate` sets the chosen outcome on the Payment + Booking; `status`
// returns current state without a Moyasar round-trip.
router.post('/simulate', simulatePayment);
router.get('/:id/status', getPaymentStatus);
router.get('/my-payments', getMyPayments);
router.get('/:id', getPayment);

// Admin routes — super + finance
router.get('/', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_PAYMENTS), getAllPayments);
router.post('/:id/refund', authorize('admin'), authorizePermission(PERMISSIONS.PROCESS_REFUNDS), refundPayment);

module.exports = router;
