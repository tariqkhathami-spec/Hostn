const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const { sanitizeHtml } = require('../utils/sanitize');

// @desc    Get reviews for a property
// @route   GET /api/reviews/property/:propertyId
// @access  Public
exports.getPropertyReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const MAX_LIMIT = 50;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), MAX_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const total = await Review.countDocuments({ property: req.params.propertyId });
    const reviews = await Review.find({ property: req.params.propertyId })
      .populate('guest', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(safeLimit);

    res.json({
      success: true,
      data: reviews,
      pagination: { total, page: safePage, pages: Math.ceil(total / safeLimit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    const { propertyId, bookingId, ratings, comment } = req.body;

    // Booking ID is required
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required to leave a review' });
    }

    // Verify the booking exists and belongs to this user
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
    }

    // 24-hour post-checkout delay enforcement
    const checkoutDate = booking.checkOut || booking.updatedAt;
    const hoursSinceCheckout = (Date.now() - new Date(checkoutDate).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCheckout < 24) {
      return res.status(400).json({ success: false, message: 'Reviews can only be submitted 24 hours after checkout' });
    }

    // One review per booking (not per property)
    const existingReview = await Review.findOne({ booking: bookingId, guest: req.user._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    // Sanitize comment (DOMPurify — handles all XSS vectors, not just tags)
    const sanitizedComment = comment ? sanitizeHtml(comment) : '';

    const review = await Review.create({
      property: propertyId,
      guest: req.user._id,
      booking: bookingId,
      ratings,
      comment: sanitizedComment,
    });

    await review.populate('guest', 'name avatar');

    // Notify the host about the new review
    const property = await Property.findById(propertyId);
    if (property && property.host) {
      await Notification.createNotification({
        user: property.host,
        userType: 'Host',
        type: 'review_received',
        title: 'New Review',
        message: `A guest has left a review on your property "${property.title}"`,
        data: { propertyId: property._id, reviewId: review._id },
      });
    }

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.guest.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Host responds to a review
// @route   POST /api/reviews/:id/respond
// @access  Private (Host)
exports.respondToReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate('property');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const property = await Property.findById(review.property._id || review.property);
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    review.hostResponse = { comment: sanitizeHtml(req.body.comment), respondedAt: new Date() };
    await review.save();

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};
