const mongoose = require('mongoose');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Unit = require('../models/Unit');

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
    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('property', 'title titleAr images location type')
      .populate('unit', 'nameEn nameAr')
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
    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id title');
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

    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const bookings = await Booking.find({
      property: { $in: propertyIds },
      status: { $in: ['confirmed', 'completed'] },
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('property', 'title titleAr type')
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

    const { startDate, endDate, unitId } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(start.getFullYear(), start.getMonth() + 3, 0);

    // If unitId is provided, validate and load the unit
    let unit = null;
    if (unitId) {
      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        return res.status(400).json({ success: false, message: 'Invalid unit ID' });
      }
      unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }
      if (unit.property.toString() !== req.params.propertyId) {
        return res.status(400).json({ success: false, message: 'Unit does not belong to this property' });
      }
    }

    // Build booking query
    const bookingQuery = {
      property: req.params.propertyId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkIn: { $gte: start, $lte: end } },
        { checkOut: { $gte: start, $lte: end } },
        { checkIn: { $lte: start }, checkOut: { $gte: end } },
      ],
    };
    if (unitId) {
      bookingQuery.unit = unitId;
    }

    // Get bookings for this period
    const bookings = await Booking.find(bookingQuery)
      .populate('guest', 'name email')
      .populate('unit', 'nameEn nameAr')
      .sort('checkIn');

    // Blocked dates from unit or property
    const unavailableSource = unit ? unit.unavailableDates : property.unavailableDates;
    const blockedDates = (unavailableSource || []).filter(
      (d) =>
        (d.start >= start && d.start <= end) ||
        (d.end >= start && d.end <= end) ||
        (d.start <= start && d.end >= end)
    );

    const responseData = {
      propertyId: property._id,
      propertyTitle: property.title,
      bookings: bookings.map((b) => ({
        _id: b._id,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        guest: b.guest,
        total: b.pricing?.total,
        unit: b.unit || null,
      })),
      blockedDates,
    };

    if (unit) {
      responseData.unitId = unit._id;
      responseData.unitName = unit.nameEn;
    }

    res.json({
      success: true,
      data: responseData,
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
    const { startDate, endDate, action, unitId } = req.body;

    const property = await Property.findById(req.params.propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // If unitId is provided, load and validate the unit
    let unit = null;
    if (unitId) {
      unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }
      if (unit.property.toString() !== req.params.propertyId) {
        return res.status(400).json({ success: false, message: 'Unit does not belong to this property' });
      }
    }

    // Determine which document to update (unit or property)
    const target = unit || property;

    if (action === 'block') {
      // Check for existing bookings in this range
      const conflictQuery = {
        property: req.params.propertyId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { checkIn: { $lt: new Date(endDate), $gte: new Date(startDate) } },
          { checkOut: { $gt: new Date(startDate), $lte: new Date(endDate) } },
          { checkIn: { $lte: new Date(startDate) }, checkOut: { $gte: new Date(endDate) } },
        ],
      };
      if (unitId) {
        conflictQuery.unit = unitId;
      }

      const conflicting = await Booking.findOne(conflictQuery);

      if (conflicting) {
        return res.status(400).json({
          success: false,
          message: 'Cannot block dates with existing bookings',
        });
      }

      target.unavailableDates.push({
        start: new Date(startDate),
        end: new Date(endDate),
      });
    } else if (action === 'unblock') {
      target.unavailableDates = target.unavailableDates.filter(
        (d) =>
          !(
            d.start.getTime() === new Date(startDate).getTime() &&
            d.end.getTime() === new Date(endDate).getTime()
          )
      );
    }

    await target.save();

    res.json({
      success: true,
      data: { unavailableDates: target.unavailableDates },
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

    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id title');
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
      .populate('property', 'title titleAr images type location')
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

    // If trying to activate, check if property has units but none are active
    if (!property.isActive) {
      const totalUnits = await Unit.countDocuments({ property: property._id });
      if (totalUnits > 0) {
        const activeUnits = await Unit.countDocuments({ property: property._id, isActive: true });
        if (activeUnits === 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot activate property — all units are inactive. Activate at least one unit first.',
          });
        }
      }
    }

    property.isActive = !property.isActive;
    await property.save();

    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// ── Host Properties (grouped as "property → units" for host app) ──────────────

// @desc    Get host properties grouped by tag (property group → units)
// @route   GET /api/v1/host/properties
// @access  Private (Host)
exports.getHostProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).sort('title');

    // Group properties by their tag (e.g., "شاليهات ميفارا") to form property groups
    const groups = {};
    properties.forEach((p) => {
      const groupTag = (p.tags && p.tags[0]) || p.title;
      if (!groups[groupTag]) {
        groups[groupTag] = {
          id: p._id, // Use first property's ID as group ID
          name: groupTag,
          nameAr: groupTag,
          classification: p.type,
          status: p.isActive ? 'listed' : 'unlisted',
          unitCount: 0,
          units: [],
          address: {
            city: p.location.city,
            street: p.location.address || '',
            direction: p.location.district || '',
            coordinates: p.location.coordinates || {},
          },
        };
      }
      groups[groupTag].unitCount++;
      groups[groupTag].units.push({
        id: p._id,
        propertyId: groups[groupTag].id,
        name: p.title,
        code: (p.tags && p.tags[1] === 'mivara')
          ? `4493${groups[groupTag].units.length + 1}`
          : p._id.toString().slice(-5),
        status: p.isActive ? 'listed' : 'unlisted',
        area: 120,
        capacity: p.capacity.maxGuests,
        occupancyPercent: 0,
        suitability: 'families_and_singles',
        deposit: 0,
        securityDeposit: 500,
        description: p.description,
        images: p.images.map(img => img.url),
        photos: p.images.map(img => img.url),
        amenities: p.amenities,
        features: p.amenities,
        pricing: {
          midWeek: p.pricing.perNight,
          thursday: Math.round(p.pricing.perNight * 1.15),
          friday: Math.round(p.pricing.perNight * 1.3),
          saturday: Math.round(p.pricing.perNight * 1.15),
        },
      });
    });

    res.json({ success: true, data: Object.values(groups) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host bookings formatted for host app
// @route   GET /api/v1/host/bookings
// @access  Private (Host)
exports.getHostBookings = async (req, res, next) => {
  try {
    const { status, page = 1 } = req.query;
    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id title');
    const propertyIds = properties.map(p => p._id);

    const query = { property: { $in: propertyIds } };
    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('property', 'title titleAr images location type tags')
      .populate('guest', 'name phone avatar')
      .sort('-createdAt')
      .limit(20)
      .skip((parseInt(page) - 1) * 20);

    const formatted = bookings.map(b => ({
      id: b._id,
      bookingNumber: b._id.toString().slice(-7).toUpperCase(),
      guestName: b.guest?.name || 'ضيف',
      guestPhone: b.guest?.phone || '',
      propertyName: b.property?.tags?.[0] || b.property?.title || '',
      unitName: b.property?.title || '',
      checkIn: b.checkIn.toISOString().split('T')[0],
      checkOut: b.checkOut.toISOString().split('T')[0],
      totalAmount: b.pricing?.total || 0,
      hostAmount: Math.round((b.pricing?.total || 0) * 0.85),
      status: b.status === 'pending' ? 'waiting'
        : b.status === 'confirmed' ? 'confirmed'
        : b.status === 'completed' ? 'completed'
        : b.status === 'cancelled' ? 'cancelled'
        : b.status,
      createdAt: b.createdAt.toISOString().split('T')[0],
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming guests for host
// @route   GET /api/v1/host/bookings/upcoming
// @access  Private (Host)
exports.getUpcomingGuests = async (req, res, next) => {
  try {
    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id');
    const propertyIds = properties.map(p => p._id);
    const now = new Date();

    const bookings = await Booking.find({
      property: { $in: propertyIds },
      status: { $in: ['confirmed', 'pending'] },
      checkIn: { $gte: now },
    })
      .populate('property', 'title titleAr tags')
      .populate('guest', 'name phone')
      .sort('checkIn')
      .limit(10);

    const formatted = bookings.map(b => ({
      id: b._id,
      bookingNumber: b._id.toString().slice(-7).toUpperCase(),
      guestName: b.guest?.name || 'ضيف',
      guestPhone: b.guest?.phone || '',
      propertyName: b.property?.tags?.[0] || b.property?.title || '',
      unitName: b.property?.title || '',
      checkIn: b.checkIn.toISOString().split('T')[0],
      checkOut: b.checkOut.toISOString().split('T')[0],
      totalAmount: b.pricing?.total || 0,
      hostAmount: Math.round((b.pricing?.total || 0) * 0.85),
      status: b.status === 'pending' ? 'waiting' : b.status,
      createdAt: b.createdAt.toISOString().split('T')[0],
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host profile
// @route   GET /api/v1/host/profile
// @access  Private (Host)
exports.getHostProfile = async (req, res, next) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email || '',
        phone: user.phone,
        avatar: user.avatar,
        nationalId: '',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host calendar data for all units
// @route   GET /api/v1/host/calendar
// @access  Private (Host)
exports.getHostCalendarAll = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id title tags isActive');
    const propertyIds = properties.map(p => p._id);

    // Fetch units for all properties
    const units = await Unit.find({ property: { $in: propertyIds }, isDeleted: { $ne: true } }).select('_id property nameEn nameAr isActive unavailableDates');

    const bookings = await Booking.find({
      property: { $in: propertyIds },
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkIn: { $gte: startDate, $lte: endDate } },
        { checkOut: { $gte: startDate, $lte: endDate } },
        { checkIn: { $lte: startDate }, checkOut: { $gte: endDate } },
      ],
    });

    // Helper: compute booked date strings from a list of bookings
    const computeBookedDates = (bookingList) => {
      const bookedDates = [];
      bookingList.forEach(b => {
        const start = new Date(Math.max(b.checkIn.getTime(), startDate.getTime()));
        const end = new Date(Math.min(b.checkOut.getTime(), endDate.getTime()));
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          bookedDates.push(d.toISOString().split('T')[0]);
        }
      });
      return [...new Set(bookedDates)];
    };

    // Helper: compute blocked date strings from unavailableDates array
    const computeBlockedDates = (unavailableDates) => {
      const blocked = [];
      (unavailableDates || []).forEach(d => {
        if (
          (d.start >= startDate && d.start <= endDate) ||
          (d.end >= startDate && d.end <= endDate) ||
          (d.start <= startDate && d.end >= endDate)
        ) {
          const s = new Date(Math.max(d.start.getTime(), startDate.getTime()));
          const e = new Date(Math.min(d.end.getTime(), endDate.getTime()));
          for (let day = new Date(s); day <= e; day.setDate(day.getDate() + 1)) {
            blocked.push(day.toISOString().split('T')[0]);
          }
        }
      });
      return [...new Set(blocked)];
    };

    // Group units by property
    const unitsByProperty = {};
    units.forEach(u => {
      const pid = u.property.toString();
      if (!unitsByProperty[pid]) unitsByProperty[pid] = [];
      unitsByProperty[pid].push(u);
    });

    // Group by tag
    const groups = {};
    properties.forEach((p) => {
      const groupTag = (p.tags && p.tags[0]) || p.title;
      if (!groups[groupTag]) {
        groups[groupTag] = {
          propertyId: p._id,
          propertyName: groupTag,
          units: [],
        };
      }

      const pid = p._id.toString();
      const propertyUnits = unitsByProperty[pid];

      if (propertyUnits && propertyUnits.length > 0) {
        // Property has real units - create a sub-entry for each
        propertyUnits.forEach(u => {
          const unitBookings = bookings.filter(
            b => b.property.toString() === pid && b.unit && b.unit.toString() === u._id.toString()
          );
          groups[groupTag].units.push({
            unitId: u._id,
            unitName: u.nameEn || u.nameAr || p.title,
            unitCode: u._id.toString().slice(-5),
            isListed: u.isActive,
            bookedDates: computeBookedDates(unitBookings),
            blockedDates: computeBlockedDates(u.unavailableDates),
          });
        });
      } else {
        // No units - property itself is the "unit" (existing behavior)
        const unitBookings = bookings.filter(b => b.property.toString() === pid);
        groups[groupTag].units.push({
          unitId: p._id,
          unitName: p.title,
          unitCode: p._id.toString().slice(-5),
          isListed: p.isActive,
          bookedDates: computeBookedDates(unitBookings),
        });
      }
    });

    res.json({ success: true, data: Object.values(groups) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats formatted for host app
// @route   GET /api/v1/host/dashboard/stats
// @access  Private (Host)
exports.getHostDashboardStats = async (req, res, next) => {
  try {
    const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).select('_id');
    const propertyIds = properties.map(p => p._id);

    const allBookings = await Booking.find({ property: { $in: propertyIds } });
    const activeBookings = allBookings.filter(b => ['confirmed', 'completed'].includes(b.status));
    const totalEarnings = activeBookings.reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

    res.json({
      success: true,
      data: {
        totalProperties: properties.length,
        activeListings: properties.length,
        totalBookings: allBookings.length,
        totalEarnings,
        pendingBookings: allBookings.filter(b => b.status === 'pending').length,
        confirmedBookings: allBookings.filter(b => b.status === 'confirmed').length,
      },
    });
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

    // Upload to S3 (or Cloudinary fallback) via the shared upload service
    const uploadRoutes = require('../routes/upload');
    const result = await uploadRoutes.uploadImage(req.file.buffer, { folder: 'properties' });

    const newImage = {
      url: result.url,
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
