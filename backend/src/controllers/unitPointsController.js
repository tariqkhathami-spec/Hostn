const mongoose = require('mongoose');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UnitPointsSnapshot = require('../models/UnitPointsSnapshot');

// ── Metric labels (AR/EN) ──────────────────────────────────────────────
const METRIC_LABELS = {
  nightsBooked:        { en: 'Nights Booked',              ar: 'الليالي' },
  reviews:             { en: 'Reviews',                     ar: 'التقييمات' },
  responseRate:        { en: 'Response Rate',               ar: 'معدل الرد' },
  responseSpeed:       { en: 'Response Speed',              ar: 'سرعة الرد' },
  photosUpdated:       { en: 'Photos Updated',              ar: 'تحديث الصور' },
  videoUpdated:        { en: 'Video Updated',               ar: 'تحديث الفيديو' },
  tourismPermit:       { en: 'Tourism Permit',              ar: 'تصريح السياحة' },
  unitAvailability:    { en: 'Unit Availability',           ar: 'اتاحة الوحدة' },
  arrivalInstructions: { en: 'Arrival Instructions',        ar: 'تعليمات الوصول' },
  discounts:           { en: 'Monthly & Weekly Discounts',  ar: 'خصم شهري وإسبوعي' },
};

const PERFORMANCE_MAX = 135;
const EXCELLENCE_MAX = 20;
const TOTAL_MAX = PERFORMANCE_MAX + EXCELLENCE_MAX;

// ── Helper: compute response metrics ────────────────────────────────────
async function computeResponseMetrics(hostId) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Find conversations where host is a participant (last 90 days)
  const conversations = await Conversation.find({
    participants: hostId,
    updatedAt: { $gte: ninetyDaysAgo },
  }).select('_id participants').lean();

  if (conversations.length === 0) {
    return { responseRate: 10, responseSpeed: 10 }; // Perfect score if no conversations
  }

  let respondedCount = 0;
  let totalResponseTimeMs = 0;
  let respondedWithTimeCount = 0;

  for (const conv of conversations) {
    const otherParticipant = conv.participants.find(
      (p) => p.toString() !== hostId.toString()
    );
    if (!otherParticipant) continue;

    // Get first message from guest in this conversation
    const firstGuestMsg = await Message.findOne({
      conversation: conv._id,
      sender: otherParticipant,
      messageType: 'text',
    })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();

    if (!firstGuestMsg) continue;

    // Get first reply from host after the guest message
    const firstHostReply = await Message.findOne({
      conversation: conv._id,
      sender: hostId,
      messageType: 'text',
      createdAt: { $gt: firstGuestMsg.createdAt },
    })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();

    if (firstHostReply) {
      respondedCount++;
      const responseTime =
        new Date(firstHostReply.createdAt) - new Date(firstGuestMsg.createdAt);
      totalResponseTimeMs += responseTime;
      respondedWithTimeCount++;
    }
  }

  // Response rate: % of conversations responded to
  const rate = conversations.length > 0
    ? Math.round((respondedCount / conversations.length) * 10)
    : 10;

  // Response speed: based on average time
  let speed = 0;
  if (respondedWithTimeCount > 0) {
    const avgMs = totalResponseTimeMs / respondedWithTimeCount;
    const avgHours = avgMs / (1000 * 60 * 60);
    if (avgHours < 1) speed = 10;
    else if (avgHours < 4) speed = 7;
    else if (avgHours < 12) speed = 5;
    else if (avgHours < 24) speed = 3;
    else speed = 0;
  } else if (conversations.length === 0) {
    speed = 10; // No conversations = perfect
  }

  return { responseRate: rate, responseSpeed: speed };
}

// ── Helper: compute availability score ──────────────────────────────────
function computeAvailability(unit) {
  const now = new Date();
  const ninetyDaysLater = new Date();
  ninetyDaysLater.setDate(now.getDate() + 90);

  let blockedDays = 0;

  // Count blocked days from datePricing
  if (unit.datePricing && unit.datePricing.length > 0) {
    for (const dp of unit.datePricing) {
      if (dp.isBlocked && dp.date >= now && dp.date <= ninetyDaysLater) {
        blockedDays++;
      }
    }
  }

  // Count blocked days from unavailableDates ranges
  if (unit.unavailableDates && unit.unavailableDates.length > 0) {
    for (const range of unit.unavailableDates) {
      if (!range.start || !range.end) continue;
      const start = new Date(Math.max(range.start, now));
      const end = new Date(Math.min(range.end, ninetyDaysLater));
      if (start < end) {
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        blockedDays += days;
      }
    }
  }

  blockedDays = Math.min(blockedDays, 90);
  return Math.round(((90 - blockedDays) / 90) * 15);
}

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get host's properties with their units (for dropdown selectors)
// @route   GET /api/host/properties-units
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────────
exports.getPropertiesWithUnits = async (req, res, next) => {
  try {
    const hostId = req.user._id;

    const properties = await Property.find({ host: hostId, isDeleted: { $ne: true } })
      .select('_id title titleAr')
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      properties.map(async (prop) => {
        const units = await Unit.find({ property: prop._id, isActive: true, isDeleted: { $ne: true } })
          .select('_id nameEn nameAr')
          .sort({ createdAt: 1 })
          .lean();
        return { ...prop, units };
      })
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get unit quality points breakdown
// @route   GET /api/host/units/:unitId/points
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────────
exports.getUnitPoints = async (req, res, next) => {
  try {
    const hostId = req.user._id;
    const { unitId } = req.params;

    // Fetch unit and verify ownership
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const property = await Property.findById(unit.property).select('host').lean();
    if (!property || property.host.toString() !== hostId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // ── Compute all metrics in parallel ──────────────────────────────

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [nightsResult, reviewCount, responseMetrics] = await Promise.all([
      // 1. Nights booked (last 365 days)
      Booking.aggregate([
        {
          $match: {
            unit: new mongoose.Types.ObjectId(unitId),
            status: { $in: ['confirmed', 'completed'] },
            createdAt: { $gte: oneYearAgo },
          },
        },
        { $group: { _id: null, totalNights: { $sum: '$pricing.nights' } } },
      ]),
      // 2. Review count (property-level, since reviews don't have unit ref)
      Review.countDocuments({ property: unit.property }),
      // 3. Response rate & speed
      computeResponseMetrics(hostId),
    ]);

    const totalNights = nightsResult.length > 0 ? nightsResult[0].totalNights : 0;

    // Build metric scores
    const metrics = {
      nightsBooked: Math.min(50, Math.round(totalNights * 0.5)),
      reviews: Math.min(20, reviewCount * 2),
      responseRate: responseMetrics.responseRate,
      responseSpeed: responseMetrics.responseSpeed,
      photosUpdated: Math.min(10, (unit.images || []).length),
      videoUpdated: unit.video && unit.video.url ? 10 : 0,
      tourismPermit: unit.tourismLicense && unit.tourismLicense.status === 'active' ? 10 : 0,
      unitAvailability: computeAvailability(unit),
      arrivalInstructions: unit.arrivalInstructions && unit.arrivalInstructions.length > 50 ? 10 : 0,
      discounts:
        ((unit.pricing && unit.pricing.weeklyDiscount > 0) ? 5 : 0) +
        ((unit.pricing && unit.pricing.monthlyDiscount > 0) ? 5 : 0),
    };

    // Performance metrics (first 8)
    const performanceKeys = [
      'nightsBooked', 'reviews', 'responseRate', 'responseSpeed',
      'photosUpdated', 'videoUpdated', 'tourismPermit', 'unitAvailability',
    ];
    const performanceMaxes = {
      nightsBooked: 50, reviews: 20, responseRate: 10, responseSpeed: 10,
      photosUpdated: 10, videoUpdated: 10, tourismPermit: 10, unitAvailability: 15,
    };

    // Excellence metrics (last 2)
    const excellenceKeys = ['arrivalInstructions', 'discounts'];
    const excellenceMaxes = { arrivalInstructions: 10, discounts: 10 };

    const performancePoints = performanceKeys.reduce((sum, k) => sum + metrics[k], 0);
    const excellencePoints = excellenceKeys.reduce((sum, k) => sum + metrics[k], 0);
    const totalPoints = performancePoints + excellencePoints;

    // ── Snapshot for delta comparison ────────────────────────────────

    const previousSnapshot = await UnitPointsSnapshot.findOne({ unit: unitId })
      .sort({ createdAt: -1 })
      .lean();

    const previousPoints = previousSnapshot ? previousSnapshot.totalPoints : null;
    const delta = previousPoints !== null ? totalPoints - previousPoints : null;

    // Save new snapshot
    await UnitPointsSnapshot.create({
      unit: unitId,
      totalPoints,
      performancePoints,
      excellencePoints,
      breakdown: metrics,
    });

    // ── Build response ───────────────────────────────────────────────

    res.status(200).json({
      success: true,
      data: {
        unitId,
        unitName: unit.nameAr || unit.nameEn || '',
        totalPoints,
        maxPoints: TOTAL_MAX,
        previousPoints,
        delta,
        performance: {
          total: performancePoints,
          max: PERFORMANCE_MAX,
          metrics: performanceKeys.map((key) => ({
            key,
            score: metrics[key],
            max: performanceMaxes[key],
            label: METRIC_LABELS[key],
          })),
        },
        excellence: {
          total: excellencePoints,
          max: EXCELLENCE_MAX,
          metrics: excellenceKeys.map((key) => ({
            key,
            score: metrics[key],
            max: excellenceMaxes[key],
            label: METRIC_LABELS[key],
          })),
        },
        complaints: 0, // Placeholder for future complaints feature
      },
    });
  } catch (err) {
    next(err);
  }
};
