const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  // Use a MongoDB session/transaction to ensure atomic availability check + booking creation.
  // This prevents race conditions where two concurrent requests could both pass
  // the availability check before either creates a booking (double-booking).
  const session = await mongoose.startSession();

  try {
    const { propertyId, checkIn, checkOut, guests, specialRequests } = req.body;

    // ── Input validation (no DB needed) ─────────────────────────────
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    }

    if (checkInDate < new Date(new Date().toDateString())) {
      return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past' });
    }

    const property = await Property.findById(propertyId);
    if (!property || !property.isActive) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check if user is trying to book their own property
    if (property.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot book your own property' });
    }

    // ── Guest count validation ────────────────────────────────────────
    const totalGuests = (guests?.adults || 0) + (guests?.children || 0);
    if (!guests?.adults || guests.adults < 1) {
      return res.status(400).json({ success: false, message: 'At least one adult guest required' });
    }
    if (totalGuests > property.capacity.maxGuests) {
      return res.status(400).json({
        success: false,
        message: `Exceeds max capacity of ${property.capacity.maxGuests} guests`,
      });
    }

    // ── Check blocked dates (no session needed) ──────────────────────
    const blockedConflict = property.unavailableDates?.some((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return start < checkOutDate && end > checkInDate;
    });

    if (blockedConflict) {
      return res.status(400).json({ success: false, message: 'Property is blocked for selected dates' });
    }

    // ── Night count validation ────────────────────────────────────────
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (property.rules?.minNights && nights < property.rules.minNights) {
      return res.status(400).json({
        success: false,
        message: `Minimum stay is ${property.rules.minNights} nights`,
      });
    }
    if (property.rules?.maxNights && nights > property.rules.maxNights) {
      return res.status(400).json({
        success: false,
        message: `Maximum stay is ${property.rules.maxNights} nights`,
      });
    }

    // ── Calculate pricing ────────────────────────────────────────────
    const perNight = property.discountedPrice || property.pricing.perNight;
    const subtotal = perNight * nights;
    const cleaningFee = property.pricing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * 0.1);
    const discount = property.pricing.discountPercent > 0
      ? Math.round(subtotal * (property.pricing.discountPercent / 100))
      : 0;
    const total = subtotal + cleaningFee + serviceFee - discount;

    // ── ATOMIC: Availability check + booking creation in transaction ──
    let booking;
    await session.withTransaction(async () => {
      // Re-check availability INSIDE the transaction with session lock
      const conflicting = await Booking.findOne({
        property: propertyId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { checkIn: { $lt: checkOutDate, $gte: checkInDate } },
          { checkOut: { $gt: checkInDate, $lte: checkOutDate } },
          { checkIn: { $lte: checkInDate }, checkOut: { $gte: checkOutDate } },
        ],
      }).session(session);

      if (conflicting) {
        throw new Error('DATES_UNAVAILABLE');
      }

      // Create booking inside the same transaction
      const [created] = await Booking.create(
        [{
          property: propertyId,
          guest: req.user._id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests,
          pricing: { perNight, nights, subtotal, cleaningFee, serviceFee, discount, total },
          specialRequests,
        }],
        { session }
      );
      booking = created;
    });

    // Transaction committed successfully — booking is now guaranteed unique
    await booking.populate('property', 'title images location');
    await booking.populate('guest', 'name email');

    // Notify host about new booking (non-blocking, outside transaction)
    Notification.createNotification({
      user: property.host,
      type: 'booking_created',
      title: 'New Booking Request',
      message: `${req.user.name} requested to book "${property.title}" for ${nights} nights`,
      data: { bookingId: booking._id, propertyId: property._id },
    }).catch(() => {});

    // Log activity (non-blocking)
    ActivityLog.create({
      actor: req.user._id,
      action: 'booking_created',
      target: { type: 'Booking', id: booking._id },
      details: `Booking created for "${property.title}" — ${total} SAR`,
      ip: req.ip,
    }).catch(() => {});

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    if (error.message === 'DATES_UNAVAILABLE') {
      return res.status(400).json({ success: false, message: 'Property not available for selected dates' });
    }
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate('property', 'title images location type pricing')
      .sort('-createdAt');

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host's received bookings
// @route   GET /api/bookings/host-bookings
// @access  Private (Host)
exports.getHostBookings = async (req, res, next) => {
  try {
    const hostProperties = await Property.find({ host: req.user._id }).select('_id');
    const propertyIds = hostProperties.map((p) => p._id);

    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('property', 'title images location')
      .populate('guest', 'name email phone avatar')
      .sort('-createdAt');

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property', 'title images location type pricing rules capacity host')
      .populate('guest', 'name email phone avatar');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only the guest, host, or admin can view
    const isGuest = booking.guest._id.toString() === req.user._id.toString();
    const property = await Property.findById(booking.property._id);
    const isHost = property && property.host.toString() === req.user._id.toString();

    if (!isGuest && !isHost && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// Valid state transitions — prevents impossible states like cancelled → confirmed
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],    // terminal state
  cancelled: [],    // terminal state
  rejected: [],     // terminal state
};

// @desc    Update booking status (host confirm/reject)
// @route   PUT /api/bookings/:id/status
// @access  Private (Host)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const property = await Property.findById(booking.property);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Enforce valid state transitions
    const allowed = VALID_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${booking.status}" to "${status}"`,
      });
    }

    booking.status = status;
    if (status === 'confirmed') booking.confirmedAt = new Date();
    if (status === 'cancelled') booking.cancelledAt = new Date();
    if (status === 'rejected') booking.cancelledAt = new Date();

    await booking.save();

    // Notify guest about status change
    const notifType =
      status === 'confirmed' ? 'booking_confirmed' :
      status === 'rejected' ? 'booking_rejected' :
      status === 'completed' ? 'booking_completed' : 'booking_cancelled';

    const notifTitle =
      status === 'confirmed' ? 'Booking Confirmed' :
      status === 'rejected' ? 'Booking Rejected' :
      status === 'completed' ? 'Booking Completed' : 'Booking Cancelled';

    await Notification.createNotification({
      user: booking.guest,
      type: notifType,
      title: notifTitle,
      message: `Your booking at "${property.title}" has been ${status}`,
      data: { bookingId: booking._id, propertyId: booking.property },
    });

    await ActivityLog.create({
      actor: req.user._id,
      action: `booking_${status}`,
      target: { type: 'Booking', id: booking._id },
      details: `Booking status changed to ${status}`,
      ip: req.ip,
    });

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking (guest)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Guest)
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason;
    await booking.save();

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};
