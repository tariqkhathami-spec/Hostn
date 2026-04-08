const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getUnreadSummary,
  registerDeviceToken,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/unread-summary', getUnreadSummary);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.post('/device-token', registerDeviceToken);

module.exports = router;
