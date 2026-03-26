const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  initiatePayment,
  verifyPayment,
  webhook,
  getPayment,
  getMyPayments,
  getAllPayments,
  refundPayment,
} = require('../controllers/paymentController');

// Public webhook endpoint (called by Moyasar)
router.post('/webhook', webhook);

// Protected routes
router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
router.get('/my-payments', getMyPayments);
router.get('/:id', getPayment);

// Admin routes
router.get('/', authorize('admin'), getAllPayments);
router.post('/:id/refund', authorize('admin'), refundPayment);

module.exports = router;
