const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { emitToUser, emitToProperty } = require('../config/socket');

// Helper: overlap query for date-range conflicts (includes active holds)
function overlapQuery(propertyId, checkInDate, checkOutDate) {
  return {
    property: propertyId,
    $and: [
      // Active bookings OR non-expired holds
      {
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'held', holdExpiresAt: { $gt: new Date() } },
        ],
      },
      // Date overlap
      {
        $or: [
          { checkIn: { $lt: checkOutDate, $gte: checkInDate } },
          { checkOut: { $gt: checkInDate, $lte: checkOutDate } },
          { checkIn: { $lte: checkInDate }, checkOut: { $gte: checkOutDate } },
        ],
      },
    ],
  };
}

// Detect once at startup whether the MongoDB deployment supports transactions
// (requires a replica set). Cache the result so we don't re-test every request.
let _txSupported = null; // null = untested, true/false after first attempt

async function tryTransactionBooking(bookingData, checkInDate, checkOutDate) {
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      const conflicting = await Booking.findOne(
        overlapQuery(bookingData.property, checkInDate, checkOutDate)
      ).session(session);

      if (conflicting) {
        throw new Error('DATES_UNAVAILABLE');
      }

      const [created] = await Booking.create([bookingData], { session });
      booking = created;
    });
    _txSupported = true;
    return booking;
  } catch (error) {
    // If the error indicates transactions aren't supported, propagate for fallback
    if (
      error.codeName === 'IllegalOperation' ||
      error.message?.includes('Transaction numbers') ||
      error.message?.includes('transaction') && error.code === 263
    ) {
      _txSupported = false;
      throw new Error('TX_NOT_SUPPORTED');
    }
    throw error; // real error (DATES_UNAVAILABLE or other)
  } finally {
    session.endSession();
  }
}

// Fallback: create-then-verify approach for standalone MongoDB (no replica set).
// 1. Check availability  2. Create booking  3. Verify no duplicate was created concurrently
// If a race condition produced a duplicate, delete the younger booking (ours).
async function fallbackBooking(bookingData, checkInDate, checkOutDate) {
  // Step 1: Pre-check
  const conflicting = await Booking.findOne(
    overlapQuery(bookingData.property, checkInDate, checkOutDate)
  );
  if (conflicting) {
    throw new Error('DATES_UNAVAILABLE');
  }

  // Step 2: Create
  const booking = await Booking.create(bookingData);

  // Step 3: Post-create verification — find all active bookings that overlap
  const overlapping = await Booking.find({
    ...overlapQuery(bookingData.property, checkInDate, checkOutDate),
    _id: { $ne: booking._id }, // exclude self
  }).select('_id createdAt');

  if (overlapping.length > 0) {
    // Race condition detected — another booking was created in the gap.
    // Delete OUR booking (the newer one) to guarantee at most one survives.
    await Booking.deleteOne({ _id: booking._id });
    throw new Error('DATES_UNAVAILABLE');
  }

  return booking;
}

// @desc    Create a reservation hold (15 min silent hold)
// @route   POST /api/bookings/hold
// @access  Private
exports.createHold = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, guests } = req.body;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ success: false, code: 'INVALID_DATES', message: 'Invalid date format' });
    }
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ success: false, code: 'CHECKOUT_BEFORE_CHECKIN', message: 'Check-out must be after check-in' });
    }

    const property = await Property.findById(propertyId);
    if (!property || !property.isActive) {
      return res.status(404).json({ success: false, code: 'PROPERTY_NOT_FOUND', message: 'Property not found' });
    }

    if (property.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, code: 'OWN_PROPERTY', message: 'Cannot hold your own property' });
    }

    // Cancel any existing holds by this user (one hold per user)
    await Booking.updateMany(
      { guest: req.user._id, status: 'held' },
      { status: 'cancelled', cancelledAt: new Date() }
    );

    // Check availability (includes active holds by other users)
    const conflicting = await Booking.findOne(overlapQuery(propertyId, checkInDate, checkOutDate));
    if (conflicting) {
      return res.status(400).json({ success: false, code: 'DATES_UNAVAILABLE', message: 'Property not available for selected dates' });
    }

    // Calculate pricing
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const perNight = property.pricing.perNight;
    const subtotal = perNight * nights;
    const cleaningFee = property.pricing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * 0.1);
    const discount = property.pricing.discountPercent > 0
      ? Math.round(subtotal * (property.pricing.discountPercent / 100))
      : 0;
    const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
    const vat = Math.round(taxableAmount * 0.15);
    const total = taxableAmount + vat;

    const holdExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    const hold = await Booking.create({
      property: propertyId,
      guest: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests || { adults: 1, children: 0, infants: 0 },
      pricing: { perNight, nights, subtotal, cleaningFee, serviceFee, discount, vat, total },
      status: 'held',
      holdExpiresAt,
    });

    res.status(201).json({ success: true, data: { holdId: hold._id, holdExpiresAt } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, guests, specialRequests, holdId } = req.body;

    // ── Convert hold → booking (if holdId provided) ─────────────────
    if (holdId) {
      const hold = await Booking.findById(holdId);
      if (hold && hold.guest.toString() === req.user._id.toString() && hold.status === 'held') {
        if (hold.holdExpiresAt > new Date()) {
          // Hold is still valid — convert to pending booking
          hold.status = 'pending';
          hold.specialRequests = specialRequests;
          hold.holdExpiresAt = undefined;
          await hold.save();

          await hold.populate('property', 'title images location');
          await hold.populate('guest', 'name email');

          const property = await Property.findById(hold.property._id || hold.property);
          if (property) {
            emitToUser(property.host.toString(), 'booking:created', hold.toObject());
            emitToProperty(hold.property._id?.toString() || hold.property.toString(), 'availability:changed', {
              propertyId: hold.property._id?.toString() || hold.property.toString(),
              checkIn: hold.checkIn,
              checkOut: hold.checkOut,
              status: 'pending',
            });
            Notification.createNotification({
              user: property.host,
              type: 'booking_created',
              title: 'New Booking Request',
              message: `${req.user.name} requested to book "${property.title}" for ${hold.pricing.nights} nights`,
              data: { bookingId: hold._id, propertyId: property._id },
            }).catch(() => {});
          }

          ActivityLog.create({
            actor: req.user._id,
            action: 'booking_created',
            target: { type: 'Booking', id: hold._id },
            details: `Booking created from hold for "${property?.title}" — ${hold.pricing.total} SAR`,
            ip: req.ip,
          }).catch(() => {});

          return res.status(201).json({ success: true, data: hold });
        }
        // Hold expired — mark as cancelled and fall through to normal creation
        hold.status = 'cancelled';
        hold.cancelledAt = new Date();
        await hold.save();
      }
      // Invalid/expired hold — fall through to normal booking creation
    }

    // ── Input validation (no DB needed) ─────────────────────────────
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ success: false, code: 'INVALID_DATES', message: 'Invalid date format' });
    }

    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ success: false, code: 'CHECKOUT_BEFORE_CHECKIN', message: 'Check-out must be after check-in' });
    }

    if (checkInDate < new Date(new Date().toDateString())) {
      return res.status(400).json({ success: false, code: 'CHECKIN_IN_PAST', message: 'Check-in date cannot be in the past' });
    }

    const property = await Property.findById(propertyId);
    if (!property || !property.isActive) {
      return res.status(404).json({ success: false, code: 'PROPERTY_NOT_FOUND', message: 'Property not found' });
    }

    // Check if user is trying to book their own property
    if (property.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, code: 'OWN_PROPERTY', message: 'Cannot book your own property' });
    }

    // ── Guest count validation ────────────────────────────────────────
    const totalGuests = (guests?.adults || 0) + (guests?.children || 0);
    if (!guests?.adults || guests.adults < 1) {
      return res.status(400).json({ success: false, code: 'NO_ADULTS', message: 'At least one adult guest required' });
    }
    if (totalGuests > property.capacity.maxGuests) {
      return res.status(400).json({
        success: false,
        code: 'MAX_CAPACITY',
        message: `Exceeds max capacity of ${property.capacity.maxGuests} guests`,
        params: { max: property.capacity.maxGuests },
      });
    }

    // ── Check blocked dates ──────────────────────────────────────────
    const blockedConflict = property.unavailableDates?.some((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return start < checkOutDate && end > checkInDate;
    });

    if (blockedConflict) {
      return res.status(400).json({ success: false, code: 'DATES_BLOCKED', message: 'Property is blocked for selected dates' });
    }

    // ── Night count validation ────────────────────────────────────────
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (property.rules?.minNights && nights < property.rules.minNights) {
      return res.status(400).json({
        success: false,
        code: 'MIN_STAY',
        message: `Minimum stay is ${property.rules.minNights} nights`,
        params: { min: property.rules.minNights },
      });
    }
    if (property.rules?.maxNights && nights > property.rules.maxNights) {
      return res.status(400).json({
        success: false,
        code: 'MAX_STAY',
        message: `Maximum stay is ${property.rules.maxNights} nights`,
        params: { max: property.rules.maxNights },
      });
    }

    // ── Calculate pricing ────────────────────────────────────────────
    // Always use original perNight; discount is a separate line item
    const perNight = property.pricing.perNight;
    const subtotal = perNight * nights;
    const cleaningFee = property.pricing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * 0.1);
    const discount = property.pricing.discountPercent > 0
      ? Math.round(subtotal * (property.pricing.discountPercent / 100))
      : 0;
    // Saudi Arabia 15% VAT — applied on taxable amount (after discount)
    const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
    const vat = Math.round(taxableAmount * 0.15);
    const total = taxableAmount + vat;

    // ── Create booking (atomic transaction or fallback) ──────────────
    const bookingData = {
      property: propertyId,
      guest: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      pricing: { perNight, nights, subtotal, cleaningFee, serviceFee, discount, vat, total },
      specialRequests,
    };

    let booking;
    if (_txSupported === false) {
      // Already know transactions aren't supported — use fallback directly
      booking = await fallbackBooking(bookingData, checkInDate, checkOutDate);
    } else {
      try {
        booking = await tryTransactionBooking(bookingData, checkInDate, checkOutDate);
      } catch (txErr) {
        if (txErr.message === 'TX_NOT_SUPPORTED') {
          console.log('[BOOKING] Transactions not supported — using create-then-verify fallback');
          booking = await fallbackBooking(bookingData, checkInDate, checkOutDate);
        } else {
          throw txErr;
        }
      }
    }

    // ── Populate & respond ──────────────────────────────────────────
    await booking.populate('property', 'title images location');
    await booking.populate('guest', 'name email');

    // ── Real-time: push booking to host + update property watchers ──
    const bookingPayload = booking.toObject();
    emitToUser(property.host.toString(), 'booking:created', bookingPayload);
    emitToProperty(propertyId, 'availability:changed', {
      propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: 'pending',
    });

    // Notify host about new booking (non-blocking)
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
      return res.status(400).json({ success: false, code: 'DATES_UNAVAILABLE', message: 'Property not available for selected dates' });
    }
    next(error);
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id, status: { $ne: 'held' } })
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

    const bookings = await Booking.find({ property: { $in: propertyIds }, status: { $ne: 'held' } })
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
  held: ['pending', 'cancelled'],       // hold → booking or expired/cancelled
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

    // ── Real-time: push status change to guest + property watchers ──
    const bookingObj = booking.toObject();
    emitToUser(booking.guest.toString(), 'booking:updated', bookingObj);
    emitToProperty(booking.property.toString(), 'availability:changed', {
      propertyId: booking.property.toString(),
      bookingId: booking._id,
      status,
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

    // ── Real-time: notify host about cancellation + update property ──
    const property = await Property.findById(booking.property).select('host');
    if (property) {
      emitToUser(property.host.toString(), 'booking:cancelled', booking.toObject());
      emitToProperty(booking.property.toString(), 'availability:changed', {
        propertyId: booking.property.toString(),
        bookingId: booking._id,
        status: 'cancelled',
      });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};
