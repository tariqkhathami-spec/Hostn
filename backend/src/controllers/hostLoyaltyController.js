const mongoose = require('mongoose');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const HostLoyaltySnapshot = require('../models/HostLoyaltySnapshot');

// ── Tier levels (ordered low → high) ─────────────────────────────────
const TIERS = ['basic', 'silver', 'gold', 'summit'];

const TIER_LABELS = {
  basic:  { en: 'Basic Ambassador',  ar: 'سفير اساسي' },
  silver: { en: 'Silver Ambassador', ar: 'سفير فضي' },
  gold:   { en: 'Gold Ambassador',   ar: 'سفير ذهبي' },
  summit: { en: 'Summit Ambassador', ar: 'سفير القمة' },
};

// ── Metric thresholds per tier ────────────────────────────────────────
// Standard metrics: value >= threshold earns that tier.
// cancelledBookings is REVERSE: value <= threshold earns that tier.
const METRIC_THRESHOLDS = {
  confirmedNights:       { basic: 0,  silver: 10, gold: 20, summit: 30 },
  averageReviews:        { basic: 0,  silver: 8,  gold: 9,  summit: 9.7 },
  unitAvailability:      { basic: 0,  silver: 70, gold: 80, summit: 95 },
  bookingsRatedByGuests: { basic: 0,  silver: 30, gold: 40, summit: 60 },
  bookingsYouRated:      { basic: 0,  silver: 30, gold: 50, summit: 70 },
  cancelledBookings:     { basic: 6,  silver: 5,  gold: 2,  summit: 0 },
};

const METRIC_LABELS = {
  confirmedNights:       { en: 'Confirmed Nights',              ar: 'الليالي المؤكدة' },
  averageReviews:        { en: 'Average Reviews',               ar: 'متوسط التقييمات' },
  unitAvailability:      { en: 'Unit Availability',             ar: 'اتاحة الوحدة' },
  bookingsRatedByGuests: { en: 'Bookings Rated by Guests',      ar: 'نسبة الحجوزات التي قيمها ضيوفك' },
  bookingsYouRated:      { en: 'Bookings You Rated',            ar: 'نسبة الحجوزات التي قيمتها' },
  cancelledBookings:     { en: 'Cancelled Bookings',            ar: 'الحجوزات الملغاة' },
};

// ── Tier benefits ────────────────────────────────────────────────────
const TIER_BENEFITS = {
  basic:  { cashbackPercent: 0, bonusPoints: 0,  hasCertificate: false, hasBadge: false, hasMonthlyReport: false },
  silver: { cashbackPercent: 0, bonusPoints: 5,  hasCertificate: false, hasBadge: true,  hasMonthlyReport: true },
  gold:   { cashbackPercent: 1, bonusPoints: 10, hasCertificate: true,  hasBadge: true,  hasMonthlyReport: true },
  summit: { cashbackPercent: 6, bonusPoints: 15, hasCertificate: true,  hasBadge: true,  hasMonthlyReport: true },
};

// ── Quarter display labels ──────────────────────────────────────────
const QUARTER_DISPLAY = {
  1: { en: 'January - March',    ar: 'يناير - مارس' },
  2: { en: 'April - June',       ar: 'أبريل - يونيو' },
  3: { en: 'July - September',   ar: 'يوليو - سبتمبر' },
  4: { en: 'October - December', ar: 'أكتوبر - ديسمبر' },
};

// ── Helper: get quarter bounds for a date ───────────────────────────
function getQuarterBounds(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();

  let q;
  if (month < 3) q = 1;
  else if (month < 6) q = 2;
  else if (month < 9) q = 3;
  else q = 4;

  const startMonth = (q - 1) * 3;
  return {
    label: `${year}-Q${q}`,
    q,
    year,
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 1),
    displayLabel: QUARTER_DISPLAY[q],
  };
}

// ── Helper: parse "2026-Q2" → bounds ────────────────────────────────
function parseQuarterString(str) {
  const match = str.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const q = parseInt(match[2], 10);
  const startMonth = (q - 1) * 3;

  return {
    label: `${year}-Q${q}`,
    q,
    year,
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 1),
    displayLabel: QUARTER_DISPLAY[q],
  };
}

// ── Helper: tier for a single metric ────────────────────────────────
function getTierForMetric(key, value) {
  const thresholds = METRIC_THRESHOLDS[key];
  const isReverse = key === 'cancelledBookings';

  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tier = TIERS[i];
    if (isReverse ? value <= thresholds[tier] : value >= thresholds[tier]) {
      return tier;
    }
  }
  return 'basic';
}

// ── Helper: overall tier = weakest metric ───────────────────────────
function getOverallTier(metricTiers) {
  let lowestIndex = TIERS.length - 1;
  for (const tier of Object.values(metricTiers)) {
    const idx = TIERS.indexOf(tier);
    if (idx < lowestIndex) lowestIndex = idx;
  }
  return TIERS[lowestIndex];
}

// ── Helper: unit availability % within quarter ──────────────────────
function computeQuarterAvailability(unit, quarterStart, quarterEnd) {
  const totalDays = Math.ceil(
    (quarterEnd - quarterStart) / (1000 * 60 * 60 * 24)
  );
  let blockedDays = 0;

  if (unit.datePricing && unit.datePricing.length > 0) {
    for (const dp of unit.datePricing) {
      if (dp.isBlocked && dp.date >= quarterStart && dp.date < quarterEnd) {
        blockedDays++;
      }
    }
  }

  if (unit.unavailableDates && unit.unavailableDates.length > 0) {
    for (const range of unit.unavailableDates) {
      if (!range.start || !range.end) continue;
      const s = new Date(Math.max(new Date(range.start), quarterStart));
      const e = new Date(Math.min(new Date(range.end), quarterEnd));
      if (s < e) {
        blockedDays += Math.ceil((e - s) / (1000 * 60 * 60 * 24));
      }
    }
  }

  blockedDays = Math.min(blockedDays, totalDays);
  return totalDays > 0
    ? Math.round(((totalDays - blockedDays) / totalDays) * 100)
    : 0;
}

// ── Helper: build available-quarters list ───────────────────────────
function getAvailableQuarters() {
  const year = new Date().getFullYear();
  return [1, 2, 3, 4].map((q) => ({
    label: `${year}-Q${q}`,
    displayLabel: QUARTER_DISPLAY[q],
  }));
}

// ─────────────────────────────────────────────────────────────────────
// @desc    Get host loyalty status (full metric breakdown)
// @route   GET /api/host/loyalty?quarter=2026-Q2
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────
exports.getLoyaltyStatus = async (req, res, next) => {
  try {
    const hostId = req.user._id;
    const { quarter: quarterParam } = req.query;

    // Determine quarter bounds
    let qBounds;
    if (quarterParam) {
      qBounds = parseQuarterString(quarterParam);
      if (!qBounds) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid quarter format. Use YYYY-QN (e.g. 2026-Q2)' });
      }
    } else {
      qBounds = getQuarterBounds();
    }

    const { label, start, end, displayLabel } = qBounds;

    // Get host's properties
    const properties = await Property.find({ host: hostId }).select('_id').lean();
    const propertyIds = properties.map((p) => p._id);

    // No properties → all-basic
    if (propertyIds.length === 0) {
      const emptyMetrics = {};
      for (const key of Object.keys(METRIC_THRESHOLDS)) {
        emptyMetrics[key] = { value: 0, tier: 'basic' };
      }
      return res.status(200).json({
        success: true,
        data: {
          quarter: label,
          quarterStart: start,
          quarterEnd: end,
          displayLabel,
          tier: 'basic',
          tierLabel: TIER_LABELS.basic,
          metrics: emptyMetrics,
          benefits: TIER_BENEFITS.basic,
          thresholds: METRIC_THRESHOLDS,
          metricLabels: METRIC_LABELS,
          tierLabels: TIER_LABELS,
          tiers: TIERS,
          tierBenefits: TIER_BENEFITS,
          availableQuarters: getAvailableQuarters(),
        },
      });
    }

    const units = await Unit.find(
      { property: { $in: propertyIds }, isActive: true }
    ).lean();

    // ── Compute all 6 metrics in parallel ────────────────────────────
    const [nightsResult, reviewsInQuarter, bookingsInQuarter, cancelledCount] =
      await Promise.all([
        // 1. Confirmed Nights
        Booking.aggregate([
          {
            $match: {
              property: { $in: propertyIds.map((id) => new mongoose.Types.ObjectId(id)) },
              status: { $in: ['confirmed', 'completed'] },
              checkIn: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: null, totalNights: { $sum: '$pricing.nights' } } },
        ]),

        // 2 / 4 / 5. Reviews created in quarter
        Review.find({
          property: { $in: propertyIds },
          createdAt: { $gte: start, $lt: end },
        })
          .select('ratings.overall booking hostResponse')
          .lean(),

        // 4 / 5. All confirmed/completed bookings in quarter
        Booking.find({
          property: { $in: propertyIds },
          status: { $in: ['confirmed', 'completed'] },
          checkIn: { $gte: start, $lt: end },
        })
          .select('_id')
          .lean(),

        // 6. Cancelled bookings in quarter
        Booking.countDocuments({
          property: { $in: propertyIds },
          status: 'cancelled',
          cancelledAt: { $gte: start, $lt: end },
        }),
      ]);

    // 1. Confirmed Nights
    const confirmedNights =
      nightsResult.length > 0 ? nightsResult[0].totalNights : 0;

    // 2. Average Reviews
    const avgReviews =
      reviewsInQuarter.length > 0
        ? Math.round(
            (reviewsInQuarter.reduce(
              (sum, r) => sum + (r.ratings?.overall || 0),
              0
            ) /
              reviewsInQuarter.length) *
              10
          ) / 10
        : 0;

    // 3. Unit Availability (average % across active units)
    let unitAvailability = 0;
    if (units.length > 0) {
      const avails = units.map((u) =>
        computeQuarterAvailability(u, start, end)
      );
      unitAvailability = Math.round(
        avails.reduce((s, a) => s + a, 0) / avails.length
      );
    }

    // 4. % Bookings Rated by Guests
    const totalBookings = bookingsInQuarter.length;
    const bookingIds = bookingsInQuarter.map((b) => b._id);

    const reviewsWithBooking = reviewsInQuarter.filter(
      (r) => r.booking && bookingIds.some((id) => id.equals(r.booking))
    );
    const bookingsRatedByGuests =
      totalBookings > 0
        ? Math.round((reviewsWithBooking.length / totalBookings) * 100)
        : 0;

    // 5. % Bookings You Rated (host responded)
    const reviewsHostResponded = reviewsInQuarter.filter(
      (r) =>
        r.booking &&
        bookingIds.some((id) => id.equals(r.booking)) &&
        r.hostResponse &&
        r.hostResponse.comment
    );
    const bookingsYouRated =
      totalBookings > 0
        ? Math.round((reviewsHostResponded.length / totalBookings) * 100)
        : 0;

    // ── Per-metric tiers + overall ───────────────────────────────────
    const metricValues = {
      confirmedNights,
      averageReviews: avgReviews,
      unitAvailability,
      bookingsRatedByGuests,
      bookingsYouRated,
      cancelledBookings: cancelledCount,
    };

    const metricTiers = {};
    const metricsData = {};
    for (const [key, value] of Object.entries(metricValues)) {
      const tier = getTierForMetric(key, value);
      metricTiers[key] = tier;
      metricsData[key] = { value, tier };
    }

    const overallTier = getOverallTier(metricTiers);
    const benefits = TIER_BENEFITS[overallTier];

    // ── Upsert snapshot ──────────────────────────────────────────────
    await HostLoyaltySnapshot.findOneAndUpdate(
      { host: hostId, quarter: label },
      {
        host: hostId,
        quarter: label,
        quarterStart: start,
        quarterEnd: end,
        tier: overallTier,
        metrics: metricsData,
        benefits,
      },
      { upsert: true, new: true }
    );

    // ── Response ─────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        quarter: label,
        quarterStart: start,
        quarterEnd: end,
        displayLabel,
        tier: overallTier,
        tierLabel: TIER_LABELS[overallTier],
        metrics: metricsData,
        benefits,
        thresholds: METRIC_THRESHOLDS,
        metricLabels: METRIC_LABELS,
        tierLabels: TIER_LABELS,
        tiers: TIERS,
        tierBenefits: TIER_BENEFITS,
        availableQuarters: getAvailableQuarters(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get host loyalty summary (lightweight, for dashboard widget)
// @route   GET /api/host/loyalty/summary
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────
exports.getLoyaltySummary = async (req, res, next) => {
  try {
    const hostId = req.user._id;
    const qBounds = getQuarterBounds();

    const snapshot = await HostLoyaltySnapshot.findOne({
      host: hostId,
      quarter: qBounds.label,
    }).lean();

    if (!snapshot) {
      return res.status(200).json({
        success: true,
        data: {
          quarter: qBounds.label,
          displayLabel: qBounds.displayLabel,
          tier: 'basic',
          tierLabel: TIER_LABELS.basic,
          benefits: TIER_BENEFITS.basic,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        quarter: snapshot.quarter,
        displayLabel: qBounds.displayLabel,
        tier: snapshot.tier,
        tierLabel: TIER_LABELS[snapshot.tier],
        benefits: snapshot.benefits,
      },
    });
  } catch (err) {
    next(err);
  }
};
