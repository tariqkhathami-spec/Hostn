const Notification = require('../models/Notification');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { user: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread counts grouped by category (bookings, support, messages)
// @route   GET /api/notifications/unread-summary
// @access  Private
exports.getUnreadSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const results = await Notification.aggregate([
      { $match: { user: userId, isRead: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const bookingTypes = [
      'booking_created', 'booking_confirmed', 'booking_rejected',
      'booking_cancelled', 'booking_completed',
    ];

    let bookings = 0;
    let support = 0;
    let messages = 0;

    for (const r of results) {
      if (bookingTypes.includes(r._id)) bookings += r.count;
      else if (r._id === 'support_reply') support += r.count;
      else if (r._id === 'new_message') messages += r.count;
    }

    res.json({ success: true, data: { bookings, support, messages } });
  } catch (error) {
    next(error);
  }
};

// @desc    Register device token for push notifications
// @route   POST /api/notifications/device-token
// @access  Private
exports.registerDeviceToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Device token is required' });
    }

    // Store device token on the correct user collection
    const { getUserModel } = require('./authController');
    const Model = getUserModel(req.user);
    if (Model) {
      await Model.findByIdAndUpdate(req.user._id, {
        $addToSet: {
          deviceTokens: { token, platform: platform || 'ios', updatedAt: new Date() },
        },
      });
    }

    res.json({ success: true, message: 'Device token registered' });
  } catch (error) {
    next(error);
  }
};
