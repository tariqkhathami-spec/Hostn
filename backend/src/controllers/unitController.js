const Unit = require('../models/Unit');
const Property = require('../models/Property');
const { unitPublishIssues, requirePublishable } = require('../utils/unitPublish');

// SECURITY: the licence holder's national ID, commercial register and the
// uploaded licence document are private to the host and admins. Public unit
// responses keep only the licence number and status.
const PRIVATE_LICENSE_FIELDS = [
  'tourismLicense.nationalId',
  'tourismLicense.commercialRegister',
  'tourismLicense.documentUrl',
];
const PUBLIC_UNIT_SELECT = PRIVATE_LICENSE_FIELDS.map((f) => `-${f}`).join(' ');

// Fields a host is allowed to set / update on a unit.
const ALLOWED_UNIT_FIELDS = [
  'nameEn',
  'nameAr',
  'area',
  'depositPercent',
  'insuranceOnArrival',
  'insuranceAmount',
  'writtenRules',
  'cancellationPolicy',
  'cancellationDescription',
  'description',
  'suitability',
  'hasLivingRooms',
  'livingRooms',
  'hasBedrooms',
  'bedrooms',
  'bathroomCount',
  'bathroomAmenities',
  'hasKitchen',
  'kitchen',
  'hasPool',
  'pools',
  'amenities',
  'features',
  'images',
  'pricing',
  'datePricing',
  'capacity',
  'unavailableDates',
  'discountRules',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verify property exists and caller owns it (or is admin). */
async function authorizePropertyOwner(propertyId, user) {
  const property = await Property.findById(propertyId);
  if (!property) return { error: 'Property not found', status: 404 };
  if (property.host.toString() !== user._id.toString() && user.role !== 'admin') {
    return { error: 'Not authorized', status: 403 };
  }
  return { property };
}

/** Verify unit exists, populate property.host, and check ownership. */
async function authorizeUnitOwner(unitId, user) {
  const unit = await Unit.findById(unitId).populate('property', 'host');
  if (!unit) return { error: 'Unit not found', status: 404 };
  if (unit.property.host.toString() !== user._id.toString() && user.role !== 'admin') {
    return { error: 'Not authorized', status: 403 };
  }
  return { unit };
}

/** Whitelist-sanitize request body. */
function sanitize(body, fields) {
  const out = {};
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  return out;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// @desc    Search units (public, for guest browsing)
// @route   GET /api/v1/units/search
// @access  Public
exports.searchUnits = async (req, res, next) => {
  try {
    const {
      city, type, minPrice, maxPrice, guests, checkIn, checkOut,
      amenities, page = 1, limit = 12, sort = '-ratings.average',
      search, bedrooms, bathrooms, rating, discount, district, direction,
      pool, minArea, maxArea, suitability,
    } = req.query;

    // ── Step 1: Property-level filter ──────────────────────────────
    const propFilter = { isActive: true, isDeleted: { $ne: true } };
    if (city) propFilter['location.city'] = { $regex: new RegExp(String(city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    if (type) {
      const types = String(type).split(',').map(t => t.trim()).filter(Boolean);
      propFilter.type = types.length === 1 ? types[0] : { $in: types };
    }
    if (district) propFilter['location.district'] = { $regex: new RegExp(String(district).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    if (direction) propFilter.direction = direction;
    if (search) propFilter.$text = { $search: search };
    // Reviews are written against the property, so a minimum rating is a
    // property filter (a unit carries no rating of its own).
    if (rating && Number(rating) > 0) propFilter['ratings.average'] = { $gte: Number(rating) };

    const matchingPropertyIds = await Property.distinct('_id', propFilter);
    if (matchingPropertyIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, pages: 0, limit: Number(limit) || 12 },
      });
    }

    // ── Step 2: Unit-level filter ──────────────────────────────────
    const unitFilter = {
      isActive: true,
      isDeleted: { $ne: true },
      property: { $in: matchingPropertyIds },
    };
    // Incomplete units (no name, no photos or a zero price) stay private.
    requirePublishable(unitFilter);
    if (guests) unitFilter['capacity.maxGuests'] = { $gte: Number(guests) };
    if (bedrooms) unitFilter['bedrooms.count'] = { $gte: Number(bedrooms) };
    if (bathrooms) unitFilter.bathroomCount = { $gte: Number(bathrooms) };
    if (discount === '1' || discount === 'true') unitFilter['pricing.discountPercent'] = { $gt: 0 };
    if (pool === '1' || pool === 'true') unitFilter.hasPool = true;
    if (suitability && suitability !== 'both') unitFilter.suitability = { $in: [suitability, 'both'] };
    if (amenities) {
      const list = String(amenities).split(',').map(a => a.trim()).filter(Boolean);
      // A value may live in the unit's amenities or in its features
      // (internet, parking, sea view…): every requested value must be in one.
      if (list.length) {
        unitFilter.$and = (unitFilter.$and || []).concat(
          list.map((v) => ({ $or: [{ amenities: v }, { features: v }] }))
        );
      }
    }
    if (minArea || maxArea) {
      unitFilter.area = {};
      if (minArea) unitFilter.area.$gte = Number(minArea);
      if (maxArea) unitFilter.area.$lte = Number(maxArea);
    }

    // ── Step 3: Date availability ──────────────────────────────────
    if (checkIn && checkOut) {
      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);

      // Exclude units with manually blocked dates overlapping the stay
      unitFilter.unavailableDates = {
        $not: { $elemMatch: { start: { $lt: coDate }, end: { $gt: ciDate } } },
      };

      // Exclude units with blocked datePricing dates in range
      unitFilter.datePricing = {
        $not: {
          $elemMatch: {
            date: { $gte: ciDate, $lt: coDate },
            isBlocked: true,
          }
        }
      };

      // Exclude units with confirmed/pending bookings overlapping the stay
      const Booking = require('../models/Booking');
      const bookedUnitIds = await Booking.distinct('unit', {
        unit: { $ne: null },
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { checkIn: { $lt: coDate, $gte: ciDate } },
          { checkOut: { $gt: ciDate, $lte: coDate } },
          { checkIn: { $lte: ciDate }, checkOut: { $gte: coDate } },
        ],
      });
      if (bookedUnitIds.length > 0) {
        unitFilter._id = { ...(unitFilter._id || {}), $nin: bookedUnitIds };
      }
    }

    // ── Step 4: Price filter config ────────────────────────────────
    let priceFilter = null;
    if (minPrice || maxPrice) {
      priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);
    }

    // ── Step 5: Pagination setup ───────────────────────────────────
    const MAX_LIMIT = 50;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 12), MAX_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    // ── Step 6: Aggregation pipeline ───────────────────────────────

    // Build date-aware price computation when checkIn/checkOut are provided
    let avgPriceExpr;
    if (checkIn && checkOut) {
      // Compute average price for only the specific days in the guest's date range
      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayPrices = [];
      const cur = new Date(ciDate);
      while (cur < coDate) {
        const dayField = `$pricing.${dayNames[cur.getDay()]}`;
        dayPrices.push({ $ifNull: [dayField, 0] });
        cur.setDate(cur.getDate() + 1);
      }
      avgPriceExpr = dayPrices.length > 0 ? { $avg: dayPrices } : { $literal: 0 };
    } else {
      // No dates selected — use 7-day average
      avgPriceExpr = {
        $avg: [
          { $ifNull: ['$pricing.sunday', 0] },
          { $ifNull: ['$pricing.monday', 0] },
          { $ifNull: ['$pricing.tuesday', 0] },
          { $ifNull: ['$pricing.wednesday', 0] },
          { $ifNull: ['$pricing.thursday', 0] },
          { $ifNull: ['$pricing.friday', 0] },
          { $ifNull: ['$pricing.saturday', 0] },
        ],
      };
    }

    const pipeline = [
      { $match: unitFilter },
      { $addFields: { avgPrice: avgPriceExpr } },
      // Apply discount to avgPrice so price filter matches what the guest actually pays
      {
        $addFields: {
          effectivePrice: {
            $multiply: [
              '$avgPrice',
              { $subtract: [1, { $divide: [{ $ifNull: ['$pricing.discountPercent', 0] }, 100] }] },
            ],
          },
        },
      },
    ];

    if (priceFilter) {
      const priceMatch = {};
      if (priceFilter.$gte) priceMatch.$gte = priceFilter.$gte;
      if (priceFilter.$lte) priceMatch.$lte = priceFilter.$lte;
      pipeline.push({ $match: { effectivePrice: priceMatch } });
    }

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Unit.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Sort
    let sortStage;
    switch (sort) {
      case 'price':    sortStage = { avgPrice: 1 };            break;
      case '-price':   sortStage = { avgPrice: -1 };           break;
      case 'rating':   sortStage = { 'ratings.average': 1 };   break;
      case '-rating':  sortStage = { 'ratings.average': -1 };  break;
      case 'newest':   sortStage = { createdAt: -1 };          break;
      default:         sortStage = { 'ratings.average': -1 };  break;
    }
    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: safeLimit });

    // Lookup property (strip private location fields in projection)
    pipeline.push({
      $lookup: {
        from: 'properties',
        localField: 'property',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              title: 1, titleAr: 1, type: 1,
              location: { city: 1, district: 1 },
              direction: 1, ratings: 1, host: 1,
            },
          },
        ],
        as: 'propertyData',
      },
    });
    pipeline.push({ $addFields: { property: { $arrayElemAt: ['$propertyData', 0] } } });
    pipeline.push({ $project: { propertyData: 0 } });

    // Lookup host within property
    pipeline.push({
      $lookup: {
        from: 'hosts',
        localField: 'property.host',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, avatar: 1, isVerified: 1 } }],
        as: 'hostData',
      },
    });
    pipeline.push({ $addFields: { 'property.host': { $arrayElemAt: ['$hostData', 0] } } });
    pipeline.push({ $project: { hostData: 0 } });
    pipeline.push({ $unset: PRIVATE_LICENSE_FIELDS });

    const units = await Unit.aggregate(pipeline);

    res.json({
      success: true,
      data: units,
      pagination: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
        limit: safeLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create unit for a property
// @route   POST /api/v1/properties/:propertyId/units
// @access  Private (Host owner / Admin)
exports.createUnit = async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId || req.body.property;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const auth = await authorizePropertyOwner(propertyId, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const sanitizedBody = sanitize(req.body, ALLOWED_UNIT_FIELDS);
    sanitizedBody.property = propertyId;

    const unit = await Unit.create(sanitizedBody);

    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

// @desc    List active units for a property (public)
// @route   GET /api/v1/properties/:propertyId/units
// @access  Public
exports.getUnits = async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId || req.query.property;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const { page = 1, limit = 20 } = req.query;

    const query = requirePublishable({ property: propertyId, isActive: true, isDeleted: { $ne: true } });

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    const skip = (safePage - 1) * safeLimit;

    const [units, total] = await Promise.all([
      Unit.find(query).select(PUBLIC_UNIT_SELECT).sort('-createdAt').skip(skip).limit(safeLimit),
      Unit.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: units,
      pagination: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
        limit: safeLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List ALL units for a property (including inactive — host dashboard)
// @route   GET /api/v1/properties/:propertyId/units/manage
// @access  Private (Host owner / Admin)
exports.getMyPropertyUnits = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const auth = await authorizePropertyOwner(propertyId, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const { page = 1, limit = 20 } = req.query;
    // Exclude soft-deleted units from the host's management view — admin-only.
    const query = { property: propertyId, isDeleted: { $ne: true } };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    const skip = (safePage - 1) * safeLimit;

    const [units, total] = await Promise.all([
      Unit.find(query).sort('-createdAt').skip(skip).limit(safeLimit),
      Unit.countDocuments(query),
    ]);

    // Tell the dashboard what each unit still needs before guests can see it.
    const withIssues = units.map((u) => ({ ...u.toObject({ virtuals: true }), publishIssues: unitPublishIssues(u) }));

    res.json({
      success: true,
      data: withIssues,
      pagination: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
        limit: safeLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single unit
// @route   GET /api/v1/units/:id
// @access  Public
exports.getUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id).select(PUBLIC_UNIT_SELECT).populate({
      path: 'property',
      select: 'title titleAr location host type images ratings direction rules pricing capacity isDeleted',
      populate: { path: 'host', select: 'name avatar isVerified _id createdAt' },
    });

    if (!unit || unit.isDeleted) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // If the parent property has been soft-deleted, hide the unit from everyone.
    if (unit.property && unit.property.isDeleted) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // The owner (and admins) can open their own unit while it is unlisted or
    // still incomplete; everyone else only sees finished, active units.
    const ownerId = unit.property && unit.property.host && (unit.property.host._id || unit.property.host);
    const isOwner = req.user && ownerId && String(ownerId) === String(req.user._id);
    const isAdmin = req.user && req.user.role === 'admin';
    const issues = unitPublishIssues(unit);
    if (!isOwner && !isAdmin && (!unit.isActive || issues.length > 0)) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const data = unit.toObject({ virtuals: true });
    if (isOwner || isAdmin) data.publishIssues = issues;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update unit
// @route   PUT /api/v1/units/:id
// @access  Private (Host owner / Admin)
exports.updateUnit = async (req, res, next) => {
  try {
    const auth = await authorizeUnitOwner(req.params.id, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const allowedFields =
      req.user.role === 'admin'
        ? [...ALLOWED_UNIT_FIELDS, 'isActive']
        : ALLOWED_UNIT_FIELDS;

    const sanitizedBody = sanitize(req.body, allowedFields);

    if (Object.keys(sanitizedBody).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    // Merge pricing instead of replacing it: the details form only knows the
    // day prices, and replacing the object used to wipe the discount switches
    // (weekly/monthly discounts, stackable flags) set on the pricing screen.
    if (sanitizedBody.pricing && typeof sanitizedBody.pricing === 'object') {
      const current = auth.unit.pricing && auth.unit.pricing.toObject ? auth.unit.pricing.toObject() : (auth.unit.pricing || {});
      sanitizedBody.pricing = { ...current, ...sanitizedBody.pricing };
    }

    const unit = await Unit.findByIdAndUpdate(req.params.id, sanitizedBody, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete unit (soft-delete)
// @route   DELETE /api/v1/units/:id
// @access  Private (Host owner / Admin)
//
// Soft-delete: `isDeleted: true` + `deletedAt` + also clears `isActive` so
// existing isActive-only filters don't need to know about deletion.
exports.deleteUnit = async (req, res, next) => {
  try {
    const auth = await authorizeUnitOwner(req.params.id, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    auth.unit.isActive = false;
    auth.unit.isDeleted = true;
    auth.unit.deletedAt = new Date();
    await auth.unit.save();

    // If this was the last active (non-deleted) unit, deactivate the property too.
    const remainingActive = await Unit.countDocuments({
      property: auth.unit.property,
      isActive: true,
      isDeleted: { $ne: true },
    });
    if (remainingActive === 0) {
      const totalUnits = await Unit.countDocuments({
        property: auth.unit.property,
        isDeleted: { $ne: true },
      });
      if (totalUnits > 0) {
        // Property has units but none are active — deactivate property
        await Property.findByIdAndUpdate(auth.unit.property, { isActive: false });
      }
    }

    res.json({ success: true, message: 'Unit removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate a unit (copy with optional exclusions)
// @route   POST /api/v1/units/:id/duplicate
// @access  Private (Host owner / Admin)
exports.duplicateUnit = async (req, res, next) => {
  try {
    const auth = await authorizeUnitOwner(req.params.id, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    // Flatten to plain object, strip system fields
    const doc = auth.unit.toObject();
    delete doc._id;
    delete doc.id;
    delete doc.createdAt;
    delete doc.updatedAt;
    delete doc.__v;

    // Reset ratings on the copy
    doc.ratings = { average: 0, count: 0 };

    // Remove excluded fields if specified.
    // Body: { exclude: ['images', 'pricing', 'unavailableDates'] }
    //
    // NOTE: "blocked dates" aren't just `unavailableDates` — they ALSO live as
    // `{ isBlocked: true }` entries inside `datePricing`. Likewise, "pricing"
    // covers both the day-of-week `pricing` object AND per-date price overrides
    // in `datePricing`. So we expand the high-level exclude keys into the
    // individual fields they actually touch.
    const { exclude = [] } = req.body;
    if (Array.isArray(exclude)) {
      const set = new Set(exclude);

      if (set.has('images')) {
        delete doc.images;
      }

      if (set.has('pricing')) {
        delete doc.pricing;
        delete doc.discountRules;
        // Drop price-override entries but keep blocked-date entries (unless the
        // user also asked to exclude blocked dates — handled below).
        if (Array.isArray(doc.datePricing)) {
          doc.datePricing = doc.datePricing
            .filter((e) => e.isBlocked)
            .map((e) => ({ date: e.date, isBlocked: true }));
        }
      }

      if (set.has('unavailableDates')) {
        delete doc.unavailableDates;
        // Strip any blocked-date entries that snuck into datePricing.
        if (Array.isArray(doc.datePricing)) {
          doc.datePricing = doc.datePricing.filter((e) => !e.isBlocked);
        }
      }

      // If BOTH pricing and unavailableDates were excluded, datePricing is now
      // either empty or irrelevant — just clear it for a clean slate.
      if (set.has('pricing') && set.has('unavailableDates')) {
        doc.datePricing = [];
      }
    }

    // Append "(Copy)" to names so duplicates are easy to spot
    if (doc.nameEn) doc.nameEn = `${doc.nameEn} (Copy)`;
    if (doc.nameAr) doc.nameAr = `${doc.nameAr} (نسخة)`;
    // A copy is a different unit: it needs its own tourism permit review,
    // and starts with no ratings or blocked dates of the original.
    delete doc.tourismLicense;
    delete doc.ratings;
    delete doc.isDeleted;
    delete doc.deletedAt;
    // A copy starts unlisted so the host can rename and review it before
    // guests see "… (نسخة)" next to the original.
    doc.isActive = false;

    // Generate fresh _id values for pool sub-documents
    if (doc.pools && Array.isArray(doc.pools)) {
      const mongoose = require('mongoose');
      doc.pools = doc.pools.map((pool) => {
        const { _id, ...rest } = pool;
        return { ...rest, _id: new mongoose.Types.ObjectId() };
      });
    }

    // Strip populated property back to ObjectId
    if (doc.property && doc.property._id) {
      doc.property = doc.property._id;
    }

    const duplicate = await Unit.create(doc);

    res.status(201).json({ success: true, data: duplicate });
  } catch (error) {
    next(error);
  }
};

// @desc    Update unit day-of-week pricing + per-date overrides
// @route   PUT /api/v1/units/:id/pricing
// @access  Private (Host owner / Admin)
exports.updateUnitPricing = async (req, res, next) => {
  try {
    const auth = await authorizeUnitOwner(req.params.id, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const { weekday, weekend, pricing, datePricing, applyWeekday, applyWeekend } = req.body;
    const unit = auth.unit;

    // 1. If "Apply weekday" — set Sun, Mon, Tue, Wed to the weekday price
    if (applyWeekday && weekday != null) {
      unit.pricing = unit.pricing || {};
      unit.pricing.sunday = weekday;
      unit.pricing.monday = weekday;
      unit.pricing.tuesday = weekday;
      unit.pricing.wednesday = weekday;
    }

    // 2. If "Apply weekend" — set Thu, Fri, Sat to the weekend price
    if (applyWeekend && weekend != null) {
      unit.pricing = unit.pricing || {};
      unit.pricing.thursday = weekend;
      unit.pricing.friday = weekend;
      unit.pricing.saturday = weekend;
    }

    // 3. Direct pricing update (overwrite individual day prices if provided)
    if (pricing) {
      unit.pricing = { ...(unit.pricing?.toObject?.() || unit.pricing || {}), ...pricing };
    }

    // 4. Date pricing overrides — merge-patch into existing datePricing.
    //
    // Semantics (PR F):
    //   - Field missing from payload  → keep the existing value
    //   - Field === null              → clear the existing value
    //   - Field set to anything else  → overwrite
    //
    // This lets unblock-a-date preserve the custom price (item 4) while still
    // letting the frontend explicitly wipe fields when the user sets a
    // competing override (item 10: setting a date discount clears the price,
    // and vice-versa).
    if (datePricing && Array.isArray(datePricing)) {
      const existing = unit.datePricing || [];
      const dateMap = new Map();
      for (const dp of existing) {
        const key = new Date(dp.date).toISOString().slice(0, 10);
        // Convert subdoc to plain object so we can mutate fields freely
        dateMap.set(key, dp.toObject ? dp.toObject() : { ...dp });
      }

      // Resolve a merge-patch field — undefined=keep, null=clear, else=set
      const merge = (patch, existingVal) => {
        if (patch === undefined) return existingVal;
        if (patch === null) return undefined;
        return patch;
      };

      for (const dp of datePricing) {
        const key = new Date(dp.date).toISOString().slice(0, 10);
        if (dp.remove) {
          dateMap.delete(key);
          continue;
        }
        const prev = dateMap.get(key) || {};
        const mergedPrice    = merge(dp.price,             prev.price);
        const mergedBlocked  = dp.isBlocked !== undefined ? !!dp.isBlocked : !!prev.isBlocked;
        const mergedDiscount = merge(dp.discountPercent,   prev.discountPercent);
        const mergedDStack   = dp.discountStackable !== undefined ? !!dp.discountStackable : !!prev.discountStackable;

        // If the entry has no meaningful data left, drop it entirely.
        const hasPrice    = typeof mergedPrice    === 'number' && mergedPrice > 0;
        const hasDiscount = typeof mergedDiscount === 'number' && mergedDiscount > 0;
        if (!hasPrice && !hasDiscount && !mergedBlocked) {
          dateMap.delete(key);
          continue;
        }

        dateMap.set(key, {
          date: new Date(dp.date),
          price: mergedPrice,
          isBlocked: mergedBlocked,
          discountPercent: mergedDiscount,
          discountStackable: mergedDStack,
        });
      }
      unit.datePricing = Array.from(dateMap.values());
    }

    // 5. Discount rules (weekday/weekend)
    if (req.body.discountRules) {
      unit.discountRules = req.body.discountRules;
    }

    await unit.save();

    res.json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle unit active status (host-facing)
// @route   PATCH /api/v1/units/:id/toggle
// @access  Private (Host owner / Admin)
exports.toggleUnitStatus = async (req, res, next) => {
  try {
    const auth = await authorizeUnitOwner(req.params.id, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    auth.unit.isActive = !auth.unit.isActive;
    await auth.unit.save();

    // Switching a unit back on brings its property back too (unless an admin
    // rejected the property) — otherwise the unit says "active" while the
    // whole listing stays hidden.
    if (auth.unit.isActive) {
      await Property.updateOne(
        { _id: auth.unit.property, isActive: false, isApproved: { $ne: false }, isDeleted: { $ne: true } },
        { isActive: true }
      );
    }

    // If deactivated and was last active unit, deactivate the property too
    if (!auth.unit.isActive) {
      const remainingActive = await Unit.countDocuments({
        property: auth.unit.property,
        isActive: true,
        isDeleted: { $ne: true },
      });
      if (remainingActive === 0) {
        const totalUnits = await Unit.countDocuments({
          property: auth.unit.property,
          isDeleted: { $ne: true },
        });
        if (totalUnits > 0) {
          await Property.findByIdAndUpdate(auth.unit.property, { isActive: false });
        }
      }
    }

    res.json({
      success: true,
      data: { isActive: auth.unit.isActive },
      message: auth.unit.isActive ? 'Unit activated' : 'Unit deactivated',
    });
  } catch (error) {
    next(error);
  }
};
