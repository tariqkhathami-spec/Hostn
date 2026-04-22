const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    ratings: {
      overall: { type: Number, required: true, min: 1, max: 10 },
      cleanliness: { type: Number, min: 1, max: 10 },
      accuracy: { type: Number, min: 1, max: 10 },
      communication: { type: Number, min: 1, max: 10 },
      location: { type: Number, min: 1, max: 10 },
      value: { type: Number, min: 1, max: 10 },
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    hostResponse: {
      comment: String,
      respondedAt: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One review per guest per property
reviewSchema.index({ property: 1, guest: 1 }, { unique: true });
// Sort reviews by property+date (host review listing, property review page)
reviewSchema.index({ property: 1, createdAt: -1 });

// Update property rating after review save
reviewSchema.post('save', async function () {
  const Property = mongoose.model('Property');
  const reviews = await mongoose.model('Review').find({ property: this.property });
  const avgRating =
    reviews.reduce((sum, r) => sum + r.ratings.overall, 0) / reviews.length;
  await Property.findByIdAndUpdate(this.property, {
    'ratings.average': Math.round(avgRating * 10) / 10,
    'ratings.count': reviews.length,
  });
});

// Update property rating after review delete
reviewSchema.post('deleteOne', { document: true }, async function () {
  const Property = mongoose.model('Property');
  const reviews = await mongoose.model('Review').find({ property: this.property });
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.ratings.overall, 0) / reviews.length
      : 0;
  await Property.findByIdAndUpdate(this.property, {
    'ratings.average': Math.round(avgRating * 10) / 10,
    'ratings.count': reviews.length,
  });
});

module.exports = mongoose.model('Review', reviewSchema);
