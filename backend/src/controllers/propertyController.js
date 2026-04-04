const Property = require('../models/Property');
const { escapeRegex } = require('../middleware/validate');
const { cacheGet, cacheSet, cacheDel } = require('../config/cache');

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
  'area',
  'direction',
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
      bedrooms,
      rating,
      discount,
      area,
      district,
      direction,
      pool,
      minArea,
      maxArea,
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
    if (bedrooms) query['capacity.bedrooms'] = { $gte: Number(bedrooms) };
    if (rating) query['ratings.average'] = { $gte: Number(rating) };
    if (discount === '1' || discount === 'true') query['pricing.discountPercent'] = { $gt: 0 };
    if (direction) query.direction = direction;
    if (pool === '1' || pool === 'true') query.amenities = { ...(query.amenities || {}), $all: [...((query.amenities || {})?.$all || []), 'pool'] };

    if (district) query['location.district'] = { $regex: escapeRegex(String(district)), $options: 'i' };
    if (area) query['location.district'] = { $regex: escapeRegex(String(area)), $options: 'i' };

    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = Number(minArea);
      if (maxArea) query.area.$lte = Number(maxArea);
    }

    if (amenities) {
      const amenityList = String(amenities).split(',');
      query.amenities = { ...(query.amenities || {}), $all: [...((query.amenities || {})?.$all || []), ...amenityList] };
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
      .populate('host', 'name avatar isVerified')
      .sort(sort)
      .skip(skip)
      .limit(safeLimit);

    // Strip exact coordinates from search results (privacy)
    const sanitizedProperties = properties.map(p => {
      const obj = p.toObject();
      if (obj.location && obj.location.coordinates) {
        delete obj.location.coordinates;
      }
      if (obj.location) {
        delete obj.location.address;
      }
      return obj;
    });

    res.json({
      success: true,
      data: sanitizedProperties,
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

    // Strip exact coordinates from home feed results (privacy)
    const stripLocation = (props) => props.map(p => {
      const obj = p.toObject();
      if (obj.location && obj.location.coordinates) {
        delete obj.location.coordinates;
      }
      if (obj.location) {
        delete obj.location.address;
      }
      return obj;
    });

    res.json({
      success: true,
      data: {
        featured: stripLocation(featured),
        cities,
        categories: {
          luxury: stripLocation(luxury),
          families: stripLocation(families),
          business: stripLocation(business),
          topRated: stripLocation(topRated),
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
      .populate('host', 'name avatar createdAt isVerified');

    if (!property || !property.isActive) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const propertyObj = property.toObject();

    // Location privacy: hide exact coordinates from public view
    // Only show exact location to the property host or users with confirmed bookings
    const isHost = req.user && property.host._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    let hasConfirmedBooking = false;
    if (req.user && !isHost && !isAdmin) {
      const Booking = require('../models/Booking');
      hasConfirmedBooking = await Booking.exists({
        property: property._id,
        guest: req.user._id,
        status: { $in: ['confirmed', 'completed'] },
        paymentStatus: 'paid',
      });
    }

    if (!isHost && !isAdmin && !hasConfirmedBooking) {
      // Return approximate location only
      if (propertyObj.location && propertyObj.location.coordinates) {
        // Add random jitter of ~300-800m
        const jitterLat = (Math.random() - 0.5) * 0.01; // ~500m
        const jitterLng = (Math.random() - 0.5) * 0.01;
        propertyObj.location.coordinates = {
          lat: propertyObj.location.coordinates.lat + jitterLat,
          lng: propertyObj.location.coordinates.lng + jitterLng,
        };
        propertyObj.location.isApproximate = true;
      }
      // Remove exact street address, keep city and district
      if (propertyObj.location) {
        delete propertyObj.location.address;
      }
    }

    res.json({ success: true, data: propertyObj });
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

    // Invalidate cached cities and stats since a new property was added
    cacheDel('cities').catch(() => {});
    cacheDel('public-stats').catch(() => {});

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

    // Invalidate caches if location or active status changed
    if (sanitizedBody.location || sanitizedBody.isActive !== undefined) {
      cacheDel('cities').catch(() => {});
    }
    cacheDel('public-stats').catch(() => {});

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

    // Invalidate caches
    cacheDel('cities').catch(() => {});
    cacheDel('public-stats').catch(() => {});

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
    const cached = await cacheGet('cities');
    if (cached) return res.json({ success: true, data: cached });

    const cities = await Property.distinct('location.city', { isActive: true });
    await cacheSet('cities', cities, 600); // 10 min TTL
    res.json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
};

// @desc    Search suggestions (titles + cities)
// @route   GET /api/properties/suggestions
// @access  Public
exports.getSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({ success: true, data: { properties: [], cities: [] } });
    }

    const regex = new RegExp(escapeRegex(String(q)), 'i');

    const [properties, cities] = await Promise.all([
      Property.find({ isActive: true, title: regex })
        .select('title location.city type pricing.perNight images')
        .limit(5),
      Property.distinct('location.city', { isActive: true, 'location.city': regex }),
    ]);

    res.json({ success: true, data: { properties, cities: cities.slice(0, 5) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby properties (geospatial)
// @route   GET /api/properties/nearby
// @access  Public
exports.getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 20, limit = 12 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const radiusKm = Math.min(Number(radius), 100); // cap at 100km
    const safeLimit = Math.min(Math.max(1, Number(limit) || 12), 50);

    const properties = await Property.find({
      isActive: true,
      'location.geoJSON.coordinates': { $exists: true, $ne: [] },
      'location.geoJSON': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: radiusKm * 1000, // meters
        },
      },
    })
      .populate('host', 'name avatar isVerified')
      .limit(safeLimit);

    res.json({ success: true, data: properties });
  } catch (error) {
    // Handle geospatial query errors gracefully (missing/incompatible index, no geo data)
    if (error.name === 'MongoServerError' || error.code === 27 || error.codeName === 'IndexNotFound') {
      const logger = require('../config/logger');
      logger.warn('Nearby search failed — likely 2dsphere index issue', { error: error.message });
      return res.json({ success: true, data: [] });
    }
    next(error);
  }
};

// @desc    Reverse geocode coordinates to address
// @route   GET /api/properties/geocode/reverse
// @access  Public
exports.reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const geocoding = require('../services/geocoding');
    if (!geocoding.isAvailable()) {
      return res.status(503).json({ success: false, message: 'Geocoding service unavailable' });
    }

    const result = await geocoding.reverseGeocode(Number(lat), Number(lng));
    if (!result) {
      return res.status(404).json({ success: false, message: 'No address found for coordinates' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Public platform statistics (for homepage trust signals)
// @route   GET /api/properties/stats/public
// @access  Public
exports.getPublicStats = async (req, res, next) => {
  try {
    const cached = await cacheGet('public-stats');
    if (cached) return res.json({ success: true, data: cached });

    const Booking = require('../models/Booking');
    const Review = require('../models/Review');
    const User = require('../models/User');

    const [propertyCount, hostCount, bookingCount, reviewCount] = await Promise.all([
      Property.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'host' }),
      Booking.countDocuments({ status: 'completed' }),
      Review.countDocuments(),
    ]);

    const data = {
      properties: propertyCount,
      hosts: hostCount,
      completedBookings: bookingCount,
      reviews: reviewCount,
    };

    await cacheSet('public-stats', data, 120); // 2 min TTL

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
