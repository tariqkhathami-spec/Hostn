const User = require('../models/User');
const Property = require('../models/Property');
const Review = require('../models/Review');

// @desc    Get public host profile
// @route   GET /api/v1/hosts/:id
// @access  Public
exports.getPublicHostProfile = async (req, res, next) => {
  try {
    const MAX_LIMIT = 50;
    const {
      reviewPage = 1,
      reviewLimit = 10,
      propertyPage = 1,
      propertyLimit = 6,
    } = req.query;

    const safeReviewPage = Math.max(1, parseInt(reviewPage) || 1);
    const safeReviewLimit = Math.min(Math.max(1, parseInt(reviewLimit) || 10), MAX_LIMIT);
    const safePropPage = Math.max(1, parseInt(propertyPage) || 1);
    const safePropLimit = Math.min(Math.max(1, parseInt(propertyLimit) || 6), MAX_LIMIT);

    // Fetch host (must be a host role)
    const host = await User.findOne({ _id: req.params.id, role: { $in: ['host', 'admin'] } })
      .select('name avatar createdAt isVerified');

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }

    // Get all active property IDs for this host
    const allProperties = await Property.find({ host: req.params.id, isActive: true })
      .select('_id');
    const propertyIds = allProperties.map((p) => p._id);
    const propertyCount = propertyIds.length;

    // Aggregate rating across all reviews for host's properties
    let averageRating = 0;
    let totalReviews = 0;
    if (propertyIds.length > 0) {
      const ratingAgg = await Review.aggregate([
        { $match: { property: { $in: propertyIds } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$ratings.overall' },
            count: { $sum: 1 },
          },
        },
      ]);
      if (ratingAgg.length > 0) {
        averageRating = Math.round(ratingAgg[0].avgRating * 10) / 10;
        totalReviews = ratingAgg[0].count;
      }
    }

    // Paginated reviews
    const reviewSkip = (safeReviewPage - 1) * safeReviewLimit;
    const reviews = await Review.find({ property: { $in: propertyIds } })
      .populate('guest', 'name avatar')
      .populate('property', 'title titleAr')
      .sort('-createdAt')
      .skip(reviewSkip)
      .limit(safeReviewLimit);

    const reviewTotal = totalReviews;

    // Paginated properties
    const propSkip = (safePropPage - 1) * safePropLimit;
    const properties = await Property.find({ host: req.params.id, isActive: true })
      .select('title titleAr images location type pricing capacity ratings tags isFeatured')
      .sort('-ratings.average')
      .skip(propSkip)
      .limit(safePropLimit);

    res.json({
      success: true,
      data: {
        host,
        stats: {
          propertyCount,
          averageRating,
          totalReviews,
          memberSince: new Date(host.createdAt).getFullYear(),
        },
        reviews,
        reviewsPagination: {
          total: reviewTotal,
          page: safeReviewPage,
          pages: Math.ceil(reviewTotal / safeReviewLimit),
        },
        properties,
        propertiesPagination: {
          total: propertyCount,
          page: safePropPage,
          pages: Math.ceil(propertyCount / safePropLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
