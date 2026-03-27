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
} = require('../controllers/paymentController');

// Public webhook endpoint (called by Moyasar)
router.post('/webhook', webhook);

// Protected routes
router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
router.get('/my-payments', getMyPayments);
router.get('/:id', getPayment);

// Admin routes — super + finance
router.get('/', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_PAYMENTS), getAllPayments);
router.post('/:id/refund', authorize('admin'), authorizePermission(PERMISSIONS.PROCESS_REFUNDS), refundPayment);

module.exports = router;
