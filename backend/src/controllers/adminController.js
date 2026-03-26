const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// Dashboard Stats
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalHosts,
      totalGuests,
      totalProperties,
      activeProperties,
      pendingProperties,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      totalPayments,
      totalRevenue,
      totalReviews,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'host' }),
      User.countDocuments({ role: 'guest' }),
      Property.countDocuments(),
      Property.countDocuments({ isActive: true }),
      Property.countDocuments({ isApproved: false }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Payment.countDocuments({ status: 'completed' }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Review.countDocuments(),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, hosts: totalHosts, guests: totalGuests },
        properties: { total: totalProperties, active: activeProperties, pending: pendingProperties },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        payments: {
          total: totalPayments,
          revenue: totalRevenue[0]?.total || 0,
        },
        reviews: { total: totalReviews },
        monthlyRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
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

// Get single user detail
exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

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

// Update user
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
        details = 'Suspended user ' + user.email;
        break;
      case 'activate':
        user.isSuspended = false;
        logAction = 'user_activated';
        details = 'Activated user ' + user.email;
        break;
      case 'make_host':
        user.role = 'host';
        details = 'Changed role to host for ' + user.email;
        break;
      case 'make_admin':
        user.role = 'admin';
        details = 'Changed role to admin for ' + user.email;
        break;
      case 'verify':
        user.isVerified = true;
        details = 'Verified user ' + user.email;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await user.save();

    await ActivityLog.create({
      actor: req.user._id,
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

// Get host detail
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

exports.updateHost = exports.updateUser;

// Get properties
exports.getProperties = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'pending') query.isApproved = false;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
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

// Moderate property
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
        message: 'Your listing "' + property.title + '" has been approved and is now live!',
        data: { propertyId: property._id },
      });

      await ActivityLog.create({
        actor: req.user._id,
        action: 'property_approved',
        target: { type: 'Property', id: property._id },
        details: 'Approved listing "' + property.title + '"',
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
        message: 'Your listing "' + property.title + '" was not approved. ' + (reason || ''),
        data: { propertyId: property._id },
      });

      await ActivityLog.create({
        actor: req.user._id,
        action: 'property_rejected',
        target: { type: 'Property', id: property._id },
        details: 'Rejected listing "' + property.title + '" — ' + (reason || 'No reason'),
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

// Get bookings
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

// Update booking
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
      action: 'booking_' + (action === 'cancel' ? 'cancelled' : action === 'confirm' ? 'confirmed' : 'completed'),
      target: { type: 'Booking', id: booking._id },
      details: 'Admin ' + action + 'ed booking',
      ip: req.ip,
    });

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// Get logs
exports.getLogs = async (req, res, next) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;
    const query = {};
    if (action) query.action = action;

    const logs = await ActivityLog.find(query)
      .populate('actor', 'name email role')
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