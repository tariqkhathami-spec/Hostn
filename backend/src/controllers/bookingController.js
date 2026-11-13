const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { emitToUser, emitToProperty } = require('../config/socket');
const { GUEST_SERVICE_FEE_RATE, VAT_RATE, hostShare } = require('../config/fees');

// Helper: overlap query for date-range conflicts (includes active holds)
// When unitId is provided, checks unit-level availability instead of property-level.
function overlapQuery(propertyId, checkInDate, checkOutDate, unitId) {
  const query = {
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
  // If a unit is specified, only check for conflicts on that specific unit
  if (unitId) {
    query.unit = unitId;
  }
  return query;
}

// Helper: calculate pricing from a Unit's per-day rates (with per-date overrides).
//
// PR E stacking model:
// Every discount type carries a `stackable` flag. Per-night effective discount =
//   min(100, sum(stackable applicable) + max(non-stackable applicable, 0))
//
// Applicable discounts on a given night:
//   - Global (unit.pricing.discountPercent + globalStackable) — always applies
//   - Weekday OR Weekend rule (discountRules[]) — whichever matches day-of-week
//   - Date-specific (datePricing[n].discountPercent + discountStackable)
//   - Weekly (unit.pricing.weeklyDiscount) — applies when stay >= 7 nights
//   - Monthly (unit.pricing.monthlyDiscount) — applies when stay >= 30 nights
function calculateUnitPricing(unit, checkInDate, checkOutDate) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  // Weekday = Sun-Wed (indices 0-3), Weekend = Thu-Sat (indices 4-6)
  const WEEKDAY_INDICES = new Set([0, 1, 2, 3]);

  // Build a lookup map from datePricing for O(1) per-date checks
  const dateOverrides = new Map();
  if (unit.datePricing && unit.datePricing.length > 0) {
    for (const dp of unit.datePricing) {
      const key = new Date(dp.date).toISOString().slice(0, 10);
      dateOverrides.set(key, dp);
    }
  }

  // PR F: `enabled` defaults to true when undefined so legacy unit data
  // without the flag keeps applying its discounts as before.
  const isEnabled = (flag) => flag !== false;

  // Build discount rules lookup (weekday/weekend) — skip disabled rules entirely.
  const discountRuleMap = {};
  if (unit.discountRules && unit.discountRules.length > 0) {
    for (const rule of unit.discountRules) {
      if (!isEnabled(rule.enabled)) continue;
      discountRuleMap[rule.type] = { percent: rule.percent || 0, stackable: !!rule.stackable };
    }
  }

  // Compute stay length first so long-stay discounts can apply to every night.
  const msPerDay = 1000 * 60 * 60 * 24;
  const totalNights = Math.max(0, Math.round((checkOutDate - checkInDate) / msPerDay));

  const p = unit.pricing || {};
  const globalPct = isEnabled(p.globalEnabled) ? (p.discountPercent || 0) : 0;
  const globalStackable = !!p.globalStackable;
  const weeklyPct = (totalNights >= 7 && isEnabled(p.weeklyEnabled)) ? (p.weeklyDiscount || 0) : 0;
  const weeklyStackable = !!p.weeklyStackable;
  const monthlyPct = (totalNights >= 30 && isEnabled(p.monthlyEnabled)) ? (p.monthlyDiscount || 0) : 0;
  const monthlyStackable = !!p.monthlyStackable;

  // Aggregate which discount TYPES contributed (for UI/receipt display).
  const appliedTypes = new Set();

  let subtotalBase = 0;   // before discounts
  let subtotalAfter = 0;  // after discounts
  let nights = 0;

  const current = new Date(checkInDate);
  while (current < checkOutDate) {
    const dateKey = current.toISOString().slice(0, 10);
    const override = dateOverrides.get(dateKey);

    if (override && override.isBlocked) {
      const err = new Error('DATES_BLOCKED');
      err.blockedDate = dateKey;
      throw err;
    }

    const basePrice = (override && override.price != null)
      ? override.price
      : (unit.pricing?.[dayNames[current.getDay()]] || 0);

    // Collect discounts that apply TONIGHT
    const applicable = [];
    if (globalPct > 0)  { applicable.push({ type: 'global',  percent: globalPct,  stackable: globalStackable }); }
    if (weeklyPct > 0)  { applicable.push({ type: 'weekly',  percent: weeklyPct,  stackable: weeklyStackable }); }
    if (monthlyPct > 0) { applicable.push({ type: 'monthly', percent: monthlyPct, stackable: monthlyStackable }); }
    const dayIndex = current.getDay();
    const dayType = WEEKDAY_INDICES.has(dayIndex) ? 'weekday' : 'weekend';
    const rule = discountRuleMap[dayType];
    if (rule && rule.percent > 0) {
      applicable.push({ type: dayType, percent: rule.percent, stackable: rule.stackable });
    }
    if (override && override.discountPercent && override.discountPercent > 0) {
      applicable.push({ type: 'date', percent: override.discountPercent, stackable: !!override.discountStackable });
    }

    let stackableSum = 0;
    let nonStackableMax = 0;
    for (const d of applicable) {
      if (d.stackable) stackableSum += d.percent;
      else if (d.percent > nonStackableMax) nonStackableMax = d.percent;
      appliedTypes.add(d.type);
    }
    const effectivePct = Math.min(100, stackableSum + nonStackableMax);
    // PR L: keep full float precision per night — don't round here. We only
    // round the final displayable fields to 2 decimals below so the cumulative
    // per-step error that produced `173.00 vs 172.33` is gone.
    const nightPrice = basePrice * (1 - effectivePct / 100);

    subtotalBase += basePrice;
    subtotalAfter += nightPrice;
    nights++;
    current.setDate(current.getDate() + 1);
  }

  // Helper: round to 2 decimal places (halalas). Used once per output field.
  const r2 = (n) => Math.round(n * 100) / 100;

  const subtotal = r2(subtotalBase);                        // gross (pre-discount)
  const discount = r2(Math.max(0, subtotalBase - subtotalAfter));
  const discountPercent = subtotalBase > 0 ? r2((discount / subtotalBase) * 100) : 0;
  const discountType = appliedTypes.size > 0 ? Array.from(appliedTypes)[0] : '';

  const perNight = nights > 0 ? r2(subtotalBase / nights) : 0;
  const cleaningFee = r2(unit.pricing?.cleaningFee || 0);
  // PR G: service fee (GUEST_SERVICE_FEE_RATE) is charged on the POST-discount subtotal, pre-VAT.
  // PR L: all arithmetic done at full precision, rounded to 2dp only once.
  const discountedSubtotal = Math.max(0, subtotalBase - discount);
  const serviceFeeRaw = discountedSubtotal * GUEST_SERVICE_FEE_RATE;
  const serviceFee = r2(serviceFeeRaw);
  const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
  const vatRaw = taxableRaw * VAT_RATE;
  const vat = r2(vatRaw);
  const total = r2(taxableRaw + vatRaw);

  return {
    perNight, nights, subtotal, cleaningFee, serviceFee, discount,
    discountPercent, discountType, vat, total,
    ...hostShare({ subtotal, discount, cleaningFee }),
    appliedDiscountTypes: Array.from(appliedTypes),
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
        overlapQuery(bookingData.property, checkInDate, checkOutDate, bookingData.unit || null)
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
    overlapQuery(bookingData.property, checkInDate, checkOutDate, bookingData.unit || null)
  );
  if (conflicting) {
    throw new Error('DATES_UNAVAILABLE');
  }

  // Step 2: Create
  const booking = await Booking.create(bookingData);

  // Step 3: Post-create verification — find all active bookings that overlap
  const overlapping = await Booking.find({
    ...overlapQuery(bookingData.property, checkInDate, checkOutDate, bookingData.unit || null),
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

// When a property has active units, a booking must be for one of them: unit
// rates and unit-level availability are the source of truth, and a
// property-level booking would be priced from the legacy property rate and
// be invisible to unit overlap checks. If the caller omitted unitId and the
// property has exactly one active unit, use it; if it has several, refuse.
async function resolveUnitId(propertyId, unitId) {
  if (unitId) return { unitId };
  const units = await Unit.find({ property: propertyId, isActive: true, isDeleted: { $ne: true } })
    .select('_id')
    .limit(2)
    .lean();
  if (units.length === 1) return { unitId: units[0]._id.toString() };
  if (units.length > 1) return { error: { code: 'UNIT_REQUIRED', message: 'Please choose a unit for this property' } };
  return { unitId: null };
}

// Rules every reservation must satisfy, whether it is created directly or as
// a hold that is later converted. Returns null when OK, else { code, message }.
function checkStayRules({ property, unit, checkInDate, checkOutDate, guests }) {
  if (checkInDate < new Date(new Date().toDateString())) {
    return { code: 'CHECKIN_IN_PAST', message: 'Check-in date cannot be in the past' };
  }
  const overlaps = (range) => new Date(range.start) < checkOutDate && new Date(range.end) > checkInDate;
  if (property.unavailableDates?.some(overlaps)) {
    return { code: 'DATES_BLOCKED', message: 'Property is blocked for selected dates' };
  }
  if (unit?.unavailableDates?.some(overlaps)) {
    return { code: 'DATES_BLOCKED', message: 'Unit is blocked for selected dates' };
  }
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  if (property.rules?.minNights && nights < property.rules.minNights) {
    return { code: 'MIN_STAY', message: `Minimum stay is ${property.rules.minNights} nights`, params: { min: property.rules.minNights } };
  }
  if (property.rules?.maxNights && nights > property.rules.maxNights) {
    return { code: 'MAX_STAY', message: `Maximum stay is ${property.rules.maxNights} nights`, params: { max: property.rules.maxNights } };
  }
  if (guests && (guests.adults || guests.children)) {
    const totalGuests = (Number(guests.adults) || 0) + (Number(guests.children) || 0);
    const maxGuests = unit?.capacity?.maxGuests || property.capacity?.maxGuests;
    if (maxGuests && totalGuests > maxGuests) {
      return { code: 'MAX_CAPACITY', message: `Exceeds max capacity of ${maxGuests} guests`, params: { max: maxGuests } };
    }
  }
  return null;
}

// @desc    Create a reservation hold (15 min silent hold)
// @route   POST /api/bookings/hold
// @access  Private
exports.createHold = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, guests } = req.body;
    let { unitId } = req.body;

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

    const resolvedUnit = await resolveUnitId(propertyId, unitId);
    if (resolvedUnit.error) {
      return res.status(400).json({ success: false, ...resolvedUnit.error });
    }
    unitId = resolvedUnit.unitId;

    // Validate unit if provided
    let unit = null;
    if (unitId) {
      unit = await Unit.findById(unitId);
      if (!unit || !unit.isActive || unit.property.toString() !== propertyId) {
        return res.status(404).json({ success: false, code: 'UNIT_NOT_FOUND', message: 'Unit not found' });
      }
    }

    if (property.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, code: 'OWN_PROPERTY', message: 'Cannot hold your own property' });
    }

    // A hold is converted to a booking without re-validation, so it must
    // satisfy the same stay rules as a direct booking.
    const holdRuleError = checkStayRules({ property, unit, checkInDate, checkOutDate, guests });
    if (holdRuleError) {
      return res.status(400).json({ success: false, ...holdRuleError });
    }

    // Cancel any existing holds by this user (one hold per user)
    await Booking.updateMany(
      { guest: req.user._id, status: 'held' },
      { status: 'cancelled', cancelledAt: new Date() }
    );

    // Check availability (unit-level if unitId provided, otherwise property-level)
    const conflicting = await Booking.findOne(overlapQuery(propertyId, checkInDate, checkOutDate, unitId || null));
    if (conflicting) {
      return res.status(400).json({ success: false, code: 'DATES_UNAVAILABLE', message: unit ? 'Unit not available for selected dates' : 'Property not available for selected dates' });
    }

    // Calculate pricing — from unit's per-day rates or property's flat rate
    let pricing;
    if (unit) {
      pricing = calculateUnitPricing(unit, checkInDate, checkOutDate);
    } else {
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      const perNight = property.pricing.perNight;
      const subtotal = perNight * nights;
      const cleaningFee = property.pricing.cleaningFee || 0;
      // PR L: 2-decimal precision — round only at the end.
      const r2 = (n) => Math.round(n * 100) / 100;
      const discount = property.pricing.discountPercent > 0
        ? r2(subtotal * (property.pricing.discountPercent / 100))
        : 0;
      // PR G: service fee (GUEST_SERVICE_FEE_RATE) is post-discount, pre-VAT.
      const discountedSubtotal = Math.max(0, subtotal - discount);
      const serviceFeeRaw = discountedSubtotal * GUEST_SERVICE_FEE_RATE;
      const serviceFee = r2(serviceFeeRaw);
      const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
      const vat = r2(taxableRaw * VAT_RATE);
      const total = r2(taxableRaw * (1 + VAT_RATE));
      pricing = { perNight, nights, subtotal, cleaningFee, serviceFee, discount, vat, total, ...hostShare({ subtotal, discount, cleaningFee }) };
    }

    // Never take a booking for a unit that is not ready (no price set).
    if (!pricing || !(pricing.subtotal > 0) || !(pricing.total > 0)) {
      return res.status(400).json({ success: false, code: 'UNIT_NOT_BOOKABLE', message: 'This place is not available for booking yet' });
    }

    const holdExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    const hold = await Booking.create({
      property: propertyId,
      unit: unitId || null,
      guest: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests || { adults: 1, children: 0, infants: 0 },
      pricing,
      status: 'held',
      holdExpiresAt,
    });

    // The price is returned so clients show exactly what will be charged
    // instead of recomputing it (and drifting from) the server's rules.
    res.status(201).json({ success: true, data: { holdId: hold._id, holdExpiresAt, pricing } });
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
    let { unitId } = req.body;

    // ── Convert hold → booking (if holdId provided) ─────────────────
    if (holdId) {
      const hold = await Booking.findById(holdId);
      if (hold && hold.guest.toString() === req.user._id.toString() && hold.status === 'held') {
        // The listing may have left the marketplace while the hold was open
        // (host unlisted it or deleted their account).
        const heldProperty = await Property.findById(hold.property).select('isActive isDeleted');
        if (!heldProperty || heldProperty.isActive === false || heldProperty.isDeleted) {
          hold.status = 'cancelled';
          hold.cancelledAt = new Date();
          await hold.save();
          return res.status(400).json({
            success: false,
            code: 'PROPERTY_UNAVAILABLE',
            message: 'This property is no longer available',
          });
        }
        if (hold.holdExpiresAt > new Date()) {
          // Hold is still valid — convert to pending booking
          hold.status = 'pending';
          hold.specialRequests = specialRequests;
          hold.holdExpiresAt = undefined;
          await hold.save();

          await hold.populate('property', 'title titleAr images location');
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
              userType: 'Host',
              type: 'booking_created',
              title: 'طلب حجز جديد',
              message: `${req.user.name} يطلب حجز "${property.titleAr || property.title}" لمدة ${hold.pricing.nights} ${hold.pricing.nights === 1 ? 'ليلة' : 'ليالٍ'}`,
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

    const resolvedUnit = await resolveUnitId(propertyId, unitId);
    if (resolvedUnit.error) {
      return res.status(400).json({ success: false, ...resolvedUnit.error });
    }
    unitId = resolvedUnit.unitId;

    // Validate unit if provided
    let unit = null;
    if (unitId) {
      unit = await Unit.findById(unitId);
      if (!unit || !unit.isActive || unit.property.toString() !== propertyId) {
        return res.status(404).json({ success: false, code: 'UNIT_NOT_FOUND', message: 'Unit not found' });
      }
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
    // Use unit capacity if available, otherwise property capacity
    const maxGuests = unit ? (unit.capacity?.maxGuests || property.capacity.maxGuests) : property.capacity.maxGuests;
    if (totalGuests > maxGuests) {
      return res.status(400).json({
        success: false,
        code: 'MAX_CAPACITY',
        message: `Exceeds max capacity of ${maxGuests} guests`,
        params: { max: maxGuests },
      });
    }

    // ── Check blocked dates ──────────────────────────────────────────
    // Check property-level blocked dates
    const blockedConflict = property.unavailableDates?.some((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return start < checkOutDate && end > checkInDate;
    });
    if (blockedConflict) {
      return res.status(400).json({ success: false, code: 'DATES_BLOCKED', message: 'Property is blocked for selected dates' });
    }
    // Check unit-level blocked dates
    if (unit) {
      const unitBlocked = unit.unavailableDates?.some((range) => {
        const start = new Date(range.start);
        const end = new Date(range.end);
        return start < checkOutDate && end > checkInDate;
      });
      if (unitBlocked) {
        return res.status(400).json({ success: false, code: 'DATES_BLOCKED', message: 'Unit is blocked for selected dates' });
      }
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
    let pricing;
    if (unit) {
      pricing = calculateUnitPricing(unit, checkInDate, checkOutDate);
    } else {
      const perNight = property.pricing.perNight;
      const subtotal = perNight * nights;
      const cleaningFee = property.pricing.cleaningFee || 0;
      // PR L: 2-decimal precision — round only at the end.
      const r2 = (n) => Math.round(n * 100) / 100;
      const discount = property.pricing.discountPercent > 0
        ? r2(subtotal * (property.pricing.discountPercent / 100))
        : 0;
      // PR G: service fee (GUEST_SERVICE_FEE_RATE) is post-discount, pre-VAT.
      const discountedSubtotal = Math.max(0, subtotal - discount);
      const serviceFeeRaw = discountedSubtotal * GUEST_SERVICE_FEE_RATE;
      const serviceFee = r2(serviceFeeRaw);
      const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
      const vat = r2(taxableRaw * VAT_RATE);
      const total = r2(taxableRaw * (1 + VAT_RATE));
      pricing = { perNight, nights, subtotal, cleaningFee, serviceFee, discount, vat, total, ...hostShare({ subtotal, discount, cleaningFee }) };
    }

    // Never take a booking for a unit that is not ready (no price set).
    if (!pricing || !(pricing.subtotal > 0) || !(pricing.total > 0)) {
      return res.status(400).json({ success: false, code: 'UNIT_NOT_BOOKABLE', message: 'This place is not available for booking yet' });
    }

    // ── Create booking (atomic transaction or fallback) ──────────────
    const bookingData = {
      property: propertyId,
      unit: unitId || null,
      guest: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      pricing,
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
    await booking.populate('property', 'title titleAr images location');
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
      userType: 'Host',
      type: 'booking_created',
      title: 'طلب حجز جديد',
      message: `${req.user.name} يطلب حجز "${property.titleAr || property.title}" لمدة ${nights} ${nights === 1 ? 'ليلة' : 'ليالٍ'}`,
      data: { bookingId: booking._id, propertyId: property._id },
    }).catch(() => {});

    // Log activity (non-blocking)
    ActivityLog.create({
      actor: req.user._id,
      action: 'booking_created',
      target: { type: 'Booking', id: booking._id },
      details: `Booking created for "${property.title}" — ${pricing.total} SAR`,
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
    const query = { guest: req.user._id, status: { $ne: 'held' } };
    // ?status=upcoming | previous — the apps' two tabs.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (req.query.status === 'upcoming') {
      query.status = { $in: ['pending', 'confirmed'] };
      query.checkOut = { $gte: startOfToday };
    } else if (req.query.status === 'previous') {
      query.$or = [
        { status: { $in: ['cancelled', 'rejected', 'completed'] } },
        { checkOut: { $lt: startOfToday } },
      ];
    }
    const bookings = await Booking.find(query)
      .populate({ path: 'property', select: 'title titleAr images location type pricing host', populate: { path: 'host', select: 'name avatar isVerified' } })
      .populate('unit', 'nameEn nameAr images')
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
      .populate('property', 'title titleAr images location')
      .populate('unit', 'nameEn nameAr images')
      .populate('guest', 'name email phone avatar')
      .sort('-createdAt')
      .lean();

    // Attach invoice (if any) for each booking so the UI can link to it.
    const HostInvoice = require('../models/HostInvoice');
    const bookingIds = bookings.map((b) => b._id);
    const invoices = await HostInvoice.find({ bookings: { $in: bookingIds } })
      .select('_id invoiceNumber bookings')
      .lean();
    const invoiceByBooking = new Map();
    for (const inv of invoices) {
      for (const bid of inv.bookings || []) {
        invoiceByBooking.set(String(bid), { _id: inv._id, invoiceNumber: inv.invoiceNumber });
      }
    }
    const enriched = bookings.map((b) => ({
      ...b,
      invoice: invoiceByBooking.get(String(b._id)) || null,
    }));

    res.json({ success: true, data: enriched });
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
      .populate({
        path: 'property',
        select: 'title titleAr images location type pricing rules capacity host',
        populate: { path: 'host', select: 'name avatar isVerified _id' },
      })
      .populate('unit', 'nameEn nameAr images capacity pricing')
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
      status === 'confirmed' ? 'تم تأكيد حجزك' :
      status === 'rejected' ? 'تعذّر قبول حجزك' :
      status === 'completed' ? 'اكتمل حجزك' : 'تم إلغاء حجزك';
    const notifBody =
      status === 'confirmed' ? 'أكّد المضيف حجزك في' :
      status === 'rejected' ? 'اعتذر المضيف عن قبول حجزك في' :
      status === 'completed' ? 'نتمنى أن إقامتك كانت ممتعة في' : 'أُلغي حجزك في';

    await Notification.createNotification({
      user: booking.guest,
      userType: 'Guest',
      type: notifType,
      title: notifTitle,
      message: `${notifBody} "${property.titleAr || property.title}"`,
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
    // The host's other devices (and the dashboard) follow the change too.
    if (property && property.host) emitToUser(property.host.toString(), 'booking:updated', bookingObj);
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
    const property = await Property.findById(booking.property).select('host title titleAr');
    if (property) {
      // The host must hear about a cancellation even when the app is closed.
      Notification.createNotification({
        user: property.host,
        userType: 'Host',
        type: 'booking_cancelled',
        title: 'ألغى الضيف حجزه',
        message: `أُلغي حجز في "${property.titleAr || property.title}"، والتواريخ صارت متاحة من جديد`,
        data: { bookingId: booking._id, propertyId: booking.property },
      }).catch(() => {});
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

// @desc    Get booked date ranges for a unit (for host calendar)
// @route   GET /api/v1/bookings/unit/:unitId/dates
// @access  Private (Host/Admin)
exports.getUnitBookedDates = async (req, res, next) => {
  try {
    const { unitId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(String(unitId))) {
      return res.status(400).json({ success: false, message: 'Invalid unit ID' });
    }

    // Guests use this endpoint for availability, so dates are visible to any
    // signed-in user — but guest names only to the unit's host or an admin.
    const callerType = req.user?.constructor?.modelName;
    let canSeeGuests = callerType === 'Admin';
    if (callerType === 'Host') {
      const unitDoc = await Unit.findById(unitId).select('property').lean();
      if (unitDoc) {
        canSeeGuests = Boolean(await Property.exists({ _id: unitDoc.property, host: req.user._id }));
      }
    }

    // Find all active bookings for this unit (pending, confirmed, or active holds)
    // The apps sometimes hold a property id here (a listing with a single
    // unit is addressed by its property): match on whichever the id is.
    const idIsUnit = Boolean(await Unit.exists({ _id: unitId }));
    let bookingsQuery = Booking.find({
      ...(idIsUnit ? { unit: unitId } : { property: unitId }),
      $or: [
        { status: { $in: ['pending', 'confirmed'] } },
        { status: 'held', holdExpiresAt: { $gt: new Date() } },
      ],
    })
      .select(canSeeGuests ? 'checkIn checkOut status guest' : 'checkIn checkOut status')
      .sort('checkIn');
    if (canSeeGuests) bookingsQuery = bookingsQuery.populate('guest', 'name');
    const bookings = await bookingsQuery.lean();

    // Nights the host closed (blocked ranges, or single dates blocked on the
    // pricing calendar) are just as unavailable as booked ones.
    const blocked = [];
    const now = new Date();
    const pushRange = (start, end) => {
      if (start && end && new Date(end) > now) blocked.push({ checkIn: start, checkOut: end, status: 'blocked' });
    };
    if (idIsUnit) {
      const unitDoc = await Unit.findById(unitId).select('unavailableDates datePricing property').lean();
      if (unitDoc) {
        (unitDoc.unavailableDates || []).forEach((r) => pushRange(r.start, r.end));
        (unitDoc.datePricing || []).filter((d) => d.isBlocked && d.date).forEach((d) => {
          const start = new Date(d.date);
          pushRange(start, new Date(start.getTime() + 24 * 60 * 60 * 1000));
        });
        const prop = await Property.findById(unitDoc.property).select('unavailableDates').lean();
        ((prop && prop.unavailableDates) || []).forEach((r) => pushRange(r.start, r.end));
      }
    } else {
      const prop = await Property.findById(unitId).select('unavailableDates').lean();
      ((prop && prop.unavailableDates) || []).forEach((r) => pushRange(r.start, r.end));
    }

    res.json({ success: true, data: bookings.concat(blocked) });
  } catch (error) {
    next(error);
  }
};
