const Unit = require('../models/Unit');
const Property = require('../models/Property');

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
      search, bedrooms, rating, discount, district, direction,
      pool, minArea, maxArea, suitability,
    } = req.query;

    // ── Step 1: Property-level filter ──────────────────────────────
    const propFilter = { isActive: true };
    if (city) propFilter['location.city'] = { $regex: new RegExp(String(city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    if (type) {
      const types = String(type).split(',').map(t => t.trim()).filter(Boolean);
      propFilter.type = types.length === 1 ? types[0] : { $in: types };
    }
    if (district) propFilter['location.district'] = { $regex: new RegExp(String(district).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    if (direction) propFilter.direction = direction;
    if (search) propFilter.$text = { $search: search };

    const matchingPropertyIds = await Property.distinct('_id', propFilter);
    if (matchingPropertyIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, pages: 0, limit: Number(limit) || 12 },
      });
    }

    // ── Step 2: Unit-level filter ──────────────────────────────────
    const unitFilter = { isActive: true, property: { $in: matchingPropertyIds } };
    if (guests) unitFilter['capacity.maxGuests'] = { $gte: Number(guests) };
    if (bedrooms) unitFilter['bedrooms.count'] = { $gte: Number(bedrooms) };
    if (rating) unitFilter['ratings.average'] = { $gte: Number(rating) };
    if (discount === '1' || discount === 'true') unitFilter['pricing.discountPercent'] = { $gt: 0 };
    if (pool === '1' || pool === 'true') unitFilter.hasPool = true;
    if (suitability && suitability !== 'both') unitFilter.suitability = { $in: [suitability, 'both'] };
    if (amenities) {
      const list = String(amenities).split(',').map(a => a.trim()).filter(Boolean);
      if (list.length) unitFilter.amenities = { $all: list };
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
    const pipeline = [
      { $match: unitFilter },
      {
        $addFields: {
          avgPrice: {
            $avg: [
              { $ifNull: ['$pricing.sunday', 0] },
              { $ifNull: ['$pricing.monday', 0] },
              { $ifNull: ['$pricing.tuesday', 0] },
              { $ifNull: ['$pricing.wednesday', 0] },
              { $ifNull: ['$pricing.thursday', 0] },
              { $ifNull: ['$pricing.friday', 0] },
              { $ifNull: ['$pricing.saturday', 0] },
            ],
          },
        },
      },
    ];

    if (priceFilter) {
      const priceMatch = {};
      if (priceFilter.$gte) priceMatch.$gte = priceFilter.$gte;
      if (priceFilter.$lte) priceMatch.$lte = priceFilter.$lte;
      pipeline.push({ $match: { avgPrice: priceMatch } });
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
        from: 'users',
        localField: 'property.host',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, avatar: 1, isVerified: 1 } }],
        as: 'hostData',
      },
    });
    pipeline.push({ $addFields: { 'property.host': { $arrayElemAt: ['$hostData', 0] } } });
    pipeline.push({ $project: { hostData: 0 } });

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

    const query = { property: propertyId, isActive: true };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    const skip = (safePage - 1) * safeLimit;

    const [units, total] = await Promise.all([
      Unit.find(query).sort('-createdAt').skip(skip).limit(safeLimit),
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
    const query = { property: propertyId };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    const skip = (safePage - 1) * safeLimit;

    const [units, total] = await Promise.all([
      Unit.find(query).sort('-createdAt').skip(skip).limit(safeLimit),
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

// @desc    Get single unit
// @route   GET /api/v1/units/:id
// @access  Public
exports.getUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id).populate({
      path: 'property',
      select: 'title titleAr location host type images ratings direction rules pricing capacity',
      populate: { path: 'host', select: 'name avatar isVerified _id createdAt' },
    });

    if (!unit || !unit.isActive) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    res.json({ success: true, data: unit });
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
exports.deleteUnit = async (req, res, next) => {
  try {
    const auth = await authorizeUnitOwner(req.params.id, req.user);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    auth.unit.isActive = false;
    await auth.unit.save();

    // If this was the last active unit, deactivate the property too
    const remainingActive = await Unit.countDocuments({
      property: auth.unit.property,
      isActive: true,
    });
    if (remainingActive === 0) {
      const totalUnits = await Unit.countDocuments({ property: auth.unit.property });
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

    // Remove excluded fields if specified
    // e.g. body: { exclude: ['images', 'pricing', 'unavailableDates'] }
    const { exclude = [] } = req.body;
    if (Array.isArray(exclude)) {
      for (const field of exclude) {
        delete doc[field];
      }
    }

    // Append "(Copy)" to names so duplicates are easy to spot
    if (doc.nameEn) doc.nameEn = `${doc.nameEn} (Copy)`;
    if (doc.nameAr) doc.nameAr = `${doc.nameAr} (نسخة)`;

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

    // 4. Date pricing overrides — merge into existing datePricing array
    if (datePricing && Array.isArray(datePricing)) {
      const existing = unit.datePricing || [];
      const dateMap = new Map();
      // Keep existing entries
      for (const dp of existing) {
        const key = new Date(dp.date).toISOString().slice(0, 10);
        dateMap.set(key, dp);
      }
      // Upsert new entries
      for (const dp of datePricing) {
        const key = new Date(dp.date).toISOString().slice(0, 10);
        if (dp.remove) {
          dateMap.delete(key); // Remove override
        } else {
          dateMap.set(key, { date: new Date(dp.date), price: dp.price, isBlocked: dp.isBlocked ?? false, discountPercent: dp.discountPercent ?? undefined });
        }
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

    // If deactivated and was last active unit, deactivate the property too
    if (!auth.unit.isActive) {
      const remainingActive = await Unit.countDocuments({
        property: auth.unit.property,
        isActive: true,
      });
      if (remainingActive === 0) {
        const totalUnits = await Unit.countDocuments({ property: auth.unit.property });
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
