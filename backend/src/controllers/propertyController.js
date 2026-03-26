const Property = require('../models/Property');
const { escapeRegex } = require('../middleware/validate');

// Fields a host is allowed to update on their own property.
const ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'type',
  'location',
  'images',
  'amenities',
  'pricing',
  'capacity',
  'rules',
  'unavailableDates',
];

// @desc    Get all properties with search & filter
// @route   GET /api/properties
// @access  Public
exports.getProperties = async (req, res, next) => {
  try {
    const {
      city,
      type,
      minPrice,
      maxPrice,
      guests,
      checkIn,
      checkOut,
      amenities,
      page = 1,
      limit = 12,
      sort = '-ratings.average',
      featured,
      search,
    } = req.query;

    const query = { isActive: true };

    if (city) query['location.city'] = { $regex: escapeRegex(String(city)), $options: 'i' };
    if (type) query.type = type;
    if (featured === 'true') query.isFeatured = true;

    if (minPrice || maxPrice) {
      query['pricing.perNight'] = {};
      if (minPrice) query['pricing.perNight'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.perNight'].$lte = Number(maxPrice);
    }

    if (guests) query['capacity.maxGuests'] = { $gte: Number(guests) };

    if (amenities) {
      const amenityList = amenities.split(',');
      query.amenities = { $all: amenityList };
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      query.unavailableDates = {
        $not: {
          $elemMatch: {
            start: { $lt: checkOutDate },
            end: { $gt: checkInDate },
          },
        },
      };
    }

    const MAX_LIMIT = 50;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 12), MAX_LIMIT);
    const skip = (safePage - 1) * safeLimit;
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate('host', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(safeLimit);

    res.json({
      success: true,
      data: properties,
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

// @desc    Get home feed data (aggregated for mobile)
// @route   GET /api/properties/home-feed
// @access  Public
exports.getHomeFeed = async (req, res, next) => {
  try {
    const [featured, cities, luxury, families, business, topRated] = await Promise.all([
      Property.find({ isActive: true, isFeatured: true })
        .populate('host', 'name avatar')
        .sort('-ratings.average')
        .limit(6),
      Property.distinct('location.city', { isActive: true }),
      Property.find({ isActive: true, tags: { $in: ['luxury'] } })
        .populate('host', 'name avatar')
        .sort('-ratings.average')
        .limit(6),
      Property.find({ isActive: true, tags: { $in: ['family', 'families'] } })
        .populate('host', 'name avatar')
        .sort('-ratings.average')
        .limit(6),
      Property.find({ isActive: true, tags: { $in: ['business'] } })
        .populate('host', 'name avatar')
        .sort('-ratings.average')
        .limit(6),
      Property.find({ isActive: true, 'ratings.count': { $gte: 1 } })
        .populate('host', 'name avatar')
        .sort('-ratings.average')
        .limit(6),
    ]);

    res.json({
      success: true,
      data: {
        featured,
        cities,
        categories: {
          luxury,
          families,
          business,
          topRated,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('host', 'name avatar createdAt');

    if (!property || !property.isActive) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Create property
// @route   POST /api/properties
// @access  Private (Host only)
exports.createProperty = async (req, res, next) => {
  try {
    const sanitizedBody = { host: req.user._id };
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        sanitizedBody[field] = req.body[field];
      }
    }

    const property = await Property.create(sanitizedBody);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Host owner only)
exports.updateProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const sanitizedBody = {};
    const allowedFields = req.user.role === 'admin'
      ? [...ALLOWED_UPDATE_FIELDS, 'isActive', 'isFeatured', 'tags']
      : ALLOWED_UPDATE_FIELDS;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sanitizedBody[field] = req.body[field];
      }
    }

    if (Object.keys(sanitizedBody).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    property = await Property.findByIdAndUpdate(req.params.id, sanitizedBody, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Host owner only)
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    property.isActive = false;
    await property.save();

    res.json({ success: true, message: 'Property removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host's properties
// @route   GET /api/properties/my-properties
// @access  Private
exports.getMyProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ host: req.user._id }).sort('-createdAt');
    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
};

// @desc    Check property availability
// @route   GET /api/properties/:id/availability
// @access  Public
exports.checkAvailability = async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.query;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const Booking = require('../models/Booking');
    const conflictingBooking = await Booking.findOne({
      property: req.params.id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
        { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
        {
          checkIn: { $lte: new Date(checkIn) },
          checkOut: { $gte: new Date(checkOut) },
        },
      ],
    });

    res.json({
      success: true,
      available: !conflictingBooking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unique cities
// @route   GET /api/properties/cities
// @access  Public
exports.getCities = async (req, res, next) => {
  try {
    const cities = await Property.distinct('location.city', { isActive: true });
    res.json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
};
