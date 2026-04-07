const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const { escapeRegex } = require('../utils/sanitize');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { hasPermission, PERMISSIONS } = require('../config/permissions');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getStats = async (req, res, next) => {
  try {
    const adminRole = req.user.adminRole || 'super';
    const canViewUsers = hasPermission(req.user, PERMISSIONS.VIEW_USERS);
    const canViewPayments = hasPermission(req.user, PERMISSIONS.VIEW_PAYMENTS);

    // Base queries — all admin sub-roles can see these
    const baseQueries = [
      Property.countDocuments(),
      Property.countDocuments({ isActive: true }),
      Property.countDocuments({ isApproved: false }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Review.countDocuments(),
    ];

    const [
      totalProperties, activeProperties, pendingProperties,
      totalBookings, pendingBookings, confirmedBookings, completedBookings, cancelledBookings,
      totalReviews,
    ] = await Promise.all(baseQueries);

    const data = {
      properties: { total: totalProperties, active: activeProperties, pending: pendingProperties },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      reviews: { total: totalReviews },
      adminRole,
    };

    // User stats — super + support only
    if (canViewUsers) {
      const [totalUsers, totalHosts, totalGuests] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'host' }),
        User.countDocuments({ role: 'guest' }),
      ]);
      data.users = { total: totalUsers, hosts: totalHosts, guests: totalGuests };
    }

    // Payment/revenue stats — super + finance only
    if (canViewPayments) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [totalPayments, totalRevenue, monthlyRevenue] = await Promise.all([
        Payment.countDocuments({ status: 'completed' }),
        Payment.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'completed', paidAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ]);
      data.payments = { total: totalPayments, revenue: totalRevenue[0]?.total || 0 };
      data.monthlyRevenue = monthlyRevenue;
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── User Management ──────────────────────────────────────────────────────────

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user detail (admin)
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's activity
    const bookingCount = await Booking.countDocuments({ guest: user._id });
    const reviewCount = await Review.countDocuments({ user: user._id });
    const paymentTotal = await Payment.aggregate([
      { $match: { user: user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        stats: {
          bookings: bookingCount,
          reviews: reviewCount,
          totalSpent: paymentTotal[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin actions: suspend, activate, change role)
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { action } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let logAction = 'admin_action';
    let details = '';

    switch (action) {
      case 'suspend':
        user.isSuspended = true;
        logAction = 'user_suspended';
        details = `Suspended user ${user.email}`;
        break;
      case 'activate':
        user.isSuspended = false;
        logAction = 'user_activated';
        details = `Activated user ${user.email}`;
        break;
      case 'make_host':
        user.role = 'host';
        details = `Changed role to host for ${user.email}`;
        break;
      case 'make_admin':
        user.role = 'admin';
        user.adminRole = 'super';
        details = `Changed role to admin (super) for ${user.email}`;
        break;
      case 'set_admin_role': {
        const { adminRole } = req.body;
        if (!['super', 'support', 'finance'].includes(adminRole)) {
          return res.status(400).json({ success: false, message: 'Invalid admin role. Must be: super, support, or finance' });
        }
        // Only super admins can change admin roles
        if ((req.user.adminRole || 'super') !== 'super') {
          return res.status(403).json({ success: false, message: 'Only super admins can change admin roles' });
        }
        if (user.role !== 'admin') {
          return res.status(400).json({ success: false, message: 'User must be an admin to set admin role' });
        }
        const oldRole = user.adminRole || 'super';
        user.adminRole = adminRole;
        logAction = 'admin_role_changed';
        details = `Changed admin role from ${oldRole} to ${adminRole} for ${user.email}`;
        break;
      }
      case 'verify':
        user.isVerified = true;
        details = `Verified user ${user.email}`;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await user.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorRole: req.user.role,
      actorAdminRole: req.user.adminRole || null,
      action: logAction,
      target: { type: 'User', id: user._id },
      details,
      ip: req.ip,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── Host Management ──────────────────────────────────────────────────────────

// @desc    Get host detail with their properties and earnings
// @route   GET /api/admin/hosts/:id
// @access  Private (Admin)
exports.getHostDetail = async (req, res, next) => {
  try {
    const host = await User.findById(req.params.id).select('-password');
    if (!host || host.role !== 'host') {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }

    const properties = await Property.find({ host: host._id });
    const propertyIds = properties.map((p) => p._id);

    const bookings = await Booking.countDocuments({ property: { $in: propertyIds } });
    const earnings = await Payment.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingData',
        },
      },
      { $unwind: '$bookingData' },
      { $match: { 'bookingData.property': { $in: propertyIds }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: {
        ...host.toJSON(),
        properties,
        stats: {
          propertyCount: properties.length,
          bookingCount: bookings,
          totalEarnings: earnings[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin action on host (same as updateUser but specific URL)
// @route   PATCH /api/admin/hosts/:id
// @access  Private (Admin)
exports.updateHost = exports.updateUser;

// ─── Property Management ──────────────────────────────────────────────────────

// @desc    Get all properties (admin)
// @route   GET /api/admin/properties
// @access  Private (Admin)
exports.getProperties = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'pending') query.isApproved = false;
    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { 'location.city': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const properties = await Property.find(query)
      .populate('host', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: properties,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate a property (approve/reject)
// @route   POST /api/admin/properties/:id/moderate
// @access  Private (Admin)
exports.moderateProperty = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const property = await Property.findById(req.params.id).populate('host', 'name email');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (action === 'approve') {
      property.isApproved = true;
      property.isActive = true;
      property.moderationNote = null;

      await Notification.createNotification({
        user: property.host._id,
        type: 'listing_approved',
        title: 'Listing Approved',
        message: `Your listing "${property.title}" has been approved and is now live!`,
        data: { propertyId: property._id },
      });

      await ActivityLog.create({
        actor: req.user._id,
        actorRole: req.user.role,
        actorAdminRole: req.user.adminRole || null,
        action: 'property_approved',
        target: { type: 'Property', id: property._id },
        details: `Approved listing "${property.title}"`,
        ip: req.ip,
      });
    } else if (action === 'reject') {
      property.isApproved = false;
      property.isActive = false;
      property.moderationNote = reason;

      await Notification.createNotification({
        user: property.host._id,
        type: 'listing_rejected',
        title: 'Listing Rejected',
        message: `Your listing "${property.title}" was not approved. ${reason || ''}`,
        data: { propertyId: property._id },
      });

      await ActivityLog.create({
        actor: req.user._id,
        actorRole: req.user.role,
        actorAdminRole: req.user.adminRole || null,
        action: 'property_rejected',
        target: { type: 'Property', id: property._id },
        details: `Rejected listing "${property.title}" — ${reason || 'No reason'}`,
        ip: req.ip,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    await property.save();
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// ─── Booking Management ───────────────────────────────────────────────────────

// @desc    Get all bookings (admin)
// @route   GET /api/admin/bookings
// @access  Private (Admin)
exports.getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('property', 'title images location')
      .populate('guest', 'name email phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin action on booking
// @route   PATCH /api/admin/bookings/:id
// @access  Private (Admin)
exports.updateBooking = async (req, res, next) => {
  try {
    const { action } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    switch (action) {
      case 'cancel':
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = 'Cancelled by admin';
        break;
      case 'confirm':
        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        break;
      case 'complete':
        booking.status = 'completed';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await booking.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorRole: req.user.role,
      actorAdminRole: req.user.adminRole || null,
      action: `booking_${action === 'cancel' ? 'cancelled' : action === 'confirm' ? 'confirmed' : 'completed'}`,
      target: { type: 'Booking', id: booking._id },
      details: `Admin ${action}ed booking`,
      ip: req.ip,
    });

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete booking permanently
// @route   DELETE /api/admin/bookings/:id
// @access  Private (Admin — super only)
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await Booking.deleteOne({ _id: booking._id });

    // Non-blocking log — don't let logging failure break the response
    ActivityLog.create({
      actor: req.user._id,
      actorRole: req.user.role,
      actorAdminRole: req.user.adminRole || null,
      action: 'booking_deleted',
      target: { type: 'Booking', id: booking._id },
      details: `Admin permanently deleted booking (status was "${booking.status}")`,
      ip: req.ip,
    }).catch(() => {});

    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Payment Management ──────────────────────────────────────────────────────

// @desc    Get all payments (admin)
// @route   GET /api/admin/payments
// @access  Private (Admin)
exports.getPayments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .populate('booking', 'checkIn checkOut')
      .populate('property', 'title')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund a payment (admin)
// @route   POST /api/admin/payments/:id/refund
// @access  Private (Admin)
exports.refundPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Payment already refunded' });
    }

    if (payment.status !== 'paid' && payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only paid payments can be refunded' });
    }

    payment.status = 'refunded';
    payment.refundedAmount = payment.amount;
    payment.refundReason = reason || 'Admin refund';
    payment.refundedAt = new Date();
    await payment.save();

    await ActivityLog.create({
      actor: req.user._id,
      actorRole: req.user.role,
      actorAdminRole: req.user.adminRole || null,
      action: 'payment_refunded',
      target: { type: 'Payment', id: payment._id },
      details: `Refunded payment ${payment._id} (${payment.amount} ${payment.currency}). Reason: ${reason || 'N/A'}`,
      ip: req.ip,
    });

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// ─── Activity Logs ────────────────────────────────────────────────────────────

// @desc    Get activity logs
// @route   GET /api/admin/logs
// @access  Private (Admin)
exports.getLogs = async (req, res, next) => {
  try {
    const { action, actorAdminRole, from, to, page = 1, limit = 50 } = req.query;
    const query = {};
    if (action) query.action = action;
    if (actorAdminRole) query.actorAdminRole = actorAdminRole;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const logs = await ActivityLog.find(query)
      .populate('actor', 'name email role adminRole')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};
