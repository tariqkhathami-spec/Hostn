const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

// @desc    Get host dashboard stats
// @route   GET /api/host/stats
// @access  Private (Host)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const hostId = req.user._id;

    // Get all host properties
    const properties = await Property.find({ host: hostId });
    const propertyIds = properties.map((p) => p._id);

    // Bookings
    const allBookings = await Booking.find({ property: { $in: propertyIds } });
    const pendingBookings = allBookings.filter((b) => b.status === 'pending');
    const confirmedBookings = allBookings.filter((b) => b.status === 'confirmed');
    const completedBookings = allBookings.filter((b) => b.status === 'completed');
    const cancelledBookings = allBookings.filter((b) => b.status === 'cancelled');

    // Earnings
    const totalEarnings = allBookings
      .filter((b) => ['confirmed', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

    // This month earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBookings = allBookings.filter(
      (b) =>
        ['confirmed', 'completed'].includes(b.status) &&
        new Date(b.createdAt) >= startOfMonth
    );
    const monthlyEarnings = monthlyBookings.reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

    // Reviews
    const reviews = await Review.find({ property: { $in: propertyIds } });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.ratings.overall, 0) / reviews.length
        : 0;

    // Active listings
    const activeListings = properties.filter((p) => p.isActive).length;
    const inactiveListings = properties.filter((p) => !p.isActive).length;

    // Occupancy rate (bookings in current month / total possible)
    const occupancyRate =
      properties.length > 0
        ? Math.round((monthlyBookings.length / (properties.length * 30)) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        properties: {
          total: properties.length,
          active: activeListings,
          inactive: inactiveListings,
        },
        bookings: {
          total: allBookings.length,
          pending: pendingBookings.length,
          confirmed: confirmedBookings.length,
          completed: completedBookings.length,
          cancelled: cancelledBookings.length,
        },
        earnings: {
          total: totalEarnings,
          monthly: monthlyEarnings,
        },
        reviews: {
          total: reviews.length,
          averageRating: Math.round(avgRating * 10) / 10,
        },
        occupancyRate: Math.min(occupancyRate, 100),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent bookings for host
// @route   GET /api/host/recent-bookings
// @access  Private (Host)
exports.getRecentBookings = async (req, res, next) => {
  try {
    const properties = await Property.find({ host: req.user._id }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('property', 'title images location type')
      .populate('guest', 'name email phone avatar')
      .sort('-createdAt')
      .limit(Math.min(parseInt(req.query.limit) || 10, 50));

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host notifications
// @route   GET /api/host/notifications
// @access  Private (Host)
exports.getNotifications = async (req, res, next) => {
  try {
    const properties = await Property.find({ host: req.user._id }).select('_id title');
    const propertyIds = properties.map((p) => p._id);
    const propertyMap = {};
    properties.forEach((p) => { propertyMap[p._id.toString()] = p.title; });

    // Recent pending bookings (need action)
    const pendingBookings = await Booking.find({
      property: { $in: propertyIds },
      status: 'pending',
    })
      .populate('guest', 'name')
      .sort('-createdAt')
      .limit(5);

    // Recent reviews (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentReviews = await Review.find({
      property: { $in: propertyIds },
      createdAt: { $gte: weekAgo },
    })
      .populate('guest', 'name')
      .sort('-createdAt')
      .limit(5);

    const notifications = [];

    pendingBookings.forEach((b) => {
      notifications.push({
        id: b._id,
        type: 'booking_pending',
        title: 'New Booking Request',
        message: `${b.guest?.name || 'A guest'} wants to book ${propertyMap[b.property.toString()] || 'your property'}`,
        time: b.createdAt,
        read: false,
        action: `/host/bookings?id=${b._id}`,
      });
    });

    recentReviews.forEach((r) => {
      notifications.push({
        id: r._id,
        type: 'review_new',
        title: 'New Review',
        message: `${r.guest?.name || 'A guest'} left a ${r.ratings.overall}/10 review on ${propertyMap[r.property.toString()] || 'your property'}`,
        time: r.createdAt,
        read: false,
        action: '/host/reviews',
      });
    });

    // Sort by time
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// @desc    Get earnings breakdown (monthly)
// @route   GET /api/host/earnings
// @access  Private (Host)
exports.getEarnings = async (req, res, next) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const properties = await Property.find({ host: req.user._id }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const bookings = await Booking.find({
      property: { $in: propertyIds },
      status: { $in: ['confirmed', 'completed'] },
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('property', 'title type')
      .sort('createdAt');

    // Monthly breakdown
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i).toLocaleString('en-US', { month: 'short' }),
      earnings: 0,
      bookings: 0,
      avgPerBooking: 0,
    }));

    bookings.forEach((b) => {
      const month = new Date(b.createdAt).getMonth();
      monthly[month].earnings += b.pricing?.total || 0;
      monthly[month].bookings += 1;
    });

    monthly.forEach((m) => {
      m.avgPerBooking = m.bookings > 0 ? Math.round(m.earnings / m.bookings) : 0;
    });

    // By property type
    const byType = {};
    bookings.forEach((b) => {
      const type = b.property?.type || 'unknown';
      if (!byType[type]) byType[type] = { earnings: 0, bookings: 0 };
      byType[type].earnings += b.pricing?.total || 0;
      byType[type].bookings += 1;
    });

    // Top performing properties
    const byProperty = {};
    bookings.forEach((b) => {
      const pid = b.property?._id?.toString();
      if (!pid) return;
      if (!byProperty[pid]) {
        byProperty[pid] = {
          propertyId: pid,
          title: b.property?.title || 'Unknown',
          type: b.property?.type || 'unknown',
          earnings: 0,
          bookings: 0,
        };
      }
      byProperty[pid].earnings += b.pricing?.total || 0;
      byProperty[pid].bookings += 1;
    });

    const topProperties = Object.values(byProperty)
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    const totalEarnings = monthly.reduce((sum, m) => sum + m.earnings, 0);
    const totalBookings = monthly.reduce((sum, m) => sum + m.bookings, 0);

    res.json({
      success: true,
      data: {
        year: targetYear,
        totalEarnings,
        totalBookings,
        avgPerBooking: totalBookings > 0 ? Math.round(totalEarnings / totalBookings) : 0,
        monthly,
        byType,
        topProperties,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get calendar data (bookings + blocked dates) for a property
// @route   GET /api/host/calendar/:propertyId
// @access  Private (Host)
exports.getCalendar = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.propertyId);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(start.getFullYear(), start.getMonth() + 3, 0);

    // Get bookings for this period
    const bookings = await Booking.find({
      property: req.params.propertyId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkIn: { $gte: start, $lte: end } },
        { checkOut: { $gte: start, $lte: end } },
        { checkIn: { $lte: start }, checkOut: { $gte: end } },
      ],
    })
      .populate('guest', 'name email')
      .sort('checkIn');

    // Blocked dates from property
    const blockedDates = (property.unavailableDates || []).filter(
      (d) =>
        (d.start >= start && d.start <= end) ||
        (d.end >= start && d.end <= end) ||
        (d.start <= start && d.end >= end)
    );

    res.json({
      success: true,
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        bookings: bookings.map((b) => ({
          _id: b._id,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          guest: b.guest,
          total: b.pricing?.total,
        })),
        blockedDates,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block/unblock dates for a property
// @route   PUT /api/host/calendar/:propertyId/block
// @access  Private (Host)
exports.blockDates = async (req, res, next) => {
  try {
    const { startDate, endDate, action } = req.body;

    const property = await Property.findById(req.params.propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (action === 'block') {
      // Check for existing bookings in this range
      const conflicting = await Booking.findOne({
        property: req.params.propertyId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { checkIn: { $lt: new Date(endDate), $gte: new Date(startDate) } },
          { checkOut: { $gt: new Date(startDate), $lte: new Date(endDate) } },
          { checkIn: { $lte: new Date(startDate) }, checkOut: { $gte: new Date(endDate) } },
        ],
      });

      if (conflicting) {
        return res.status(400).json({
          success: false,
          message: 'Cannot block dates with existing bookings',
        });
      }

      property.unavailableDates.push({
        start: new Date(startDate),
        end: new Date(endDate),
      });
    } else if (action === 'unblock') {
      property.unavailableDates = property.unavailableDates.filter(
        (d) =>
          !(
            d.start.getTime() === new Date(startDate).getTime() &&
            d.end.getTime() === new Date(endDate).getTime()
          )
      );
    }

    await property.save();

    res.json({
      success: true,
      data: { unavailableDates: property.unavailableDates },
      message: action === 'block' ? 'Dates blocked successfully' : 'Dates unblocked successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for host's properties
// @route   GET /api/host/reviews
// @access  Private (Host)
exports.getHostReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, propertyId, rating } = req.query;
    const MAX_LIMIT = 50;
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), MAX_LIMIT);

    const properties = await Property.find({ host: req.user._id }).select('_id title');
    const propertyIds = propertyId
      ? [propertyId]
      : properties.map((p) => p._id);

    const query = { property: { $in: propertyIds } };
    if (rating) {
      query['ratings.overall'] = { $gte: parseInt(rating), $lt: parseInt(rating) + 1 };
    }

    const skip = (safePage - 1) * safeLimit;
    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .populate('property', 'title images type location')
      .populate('guest', 'name avatar email')
      .sort('-createdAt')
      .skip(skip)
      .limit(safeLimit);

    // Rating distribution
    const allReviews = await Review.find({ property: { $in: propertyIds } });
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    allReviews.forEach((r) => {
      const rounded = Math.round(r.ratings.overall);
      if (distribution[rounded] !== undefined) distribution[rounded]++;
    });

    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.ratings.overall, 0) / allReviews.length
        : 0;

    // Sub-ratings averages
    const subRatings = { cleanliness: 0, accuracy: 0, communication: 0, location: 0, value: 0 };
    let subCount = 0;
    allReviews.forEach((r) => {
      if (r.ratings.cleanliness) {
        subRatings.cleanliness += r.ratings.cleanliness;
        subRatings.accuracy += r.ratings.accuracy || 0;
        subRatings.communication += r.ratings.communication || 0;
        subRatings.location += r.ratings.location || 0;
        subRatings.value += r.ratings.value || 0;
        subCount++;
      }
    });
    if (subCount > 0) {
      Object.keys(subRatings).forEach((k) => {
        subRatings[k] = Math.round((subRatings[k] / subCount) * 10) / 10;
      });
    }

    res.json({
      success: true,
      data: reviews,
      summary: {
        total: allReviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
        distribution,
        subRatings,
      },
      pagination: { total, page: safePage, pages: Math.ceil(total / safeLimit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle property active status
// @route   PUT /api/host/properties/:id/toggle
// @access  Private (Host)
exports.togglePropertyStatus = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    property.isActive = !property.isActive;
    await property.save();

    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

const MAX_IMAGES_PER_PROPERTY = 20;

// @desc    Add image to property
// @route   POST /api/host/properties/:id/images
// @access  Private (Host)
exports.addPropertyImage = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (property.images && property.images.length >= MAX_IMAGES_PER_PROPERTY) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_IMAGES_PER_PROPERTY} images per property`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const isPrimary = req.body.isPrimary === 'true';
    const caption = req.body.caption || undefined;

    // If setting as primary, unset all existing
    if (isPrimary && property.images) {
      property.images.forEach((img) => {
        img.isPrimary = false;
      });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const newImage = {
      url: imageUrl,
      caption,
      isPrimary: isPrimary || (!property.images || property.images.length === 0),
    };

    property.images.push(newImage);
    await property.save();

    res.status(201).json({
      success: true,
      data: { image: newImage, totalImages: property.images.length },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove image from property
// @route   DELETE /api/host/properties/:id/images
// @access  Private (Host)
exports.removePropertyImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'imageUrl is required' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const imageIndex = property.images.findIndex((img) => img.url === imageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, message: 'Image not found on this property' });
    }

    property.images.splice(imageIndex, 1);
    await property.save();

    res.json({ success: true, message: 'Image removed', totalImages: property.images.length });
  } catch (error) {
    next(error);
  }
};
