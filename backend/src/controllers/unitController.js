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
  'capacity',
  'unavailableDates',
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
      select: 'title titleAr location host type images',
      populate: { path: 'host', select: 'name avatar isVerified _id' },
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
