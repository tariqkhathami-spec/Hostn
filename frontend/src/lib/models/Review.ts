import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  property: mongoose.Types.ObjectId;
  guest: mongoose.Types.ObjectId;
  booking?: mongoose.Types.ObjectId;
  ratings: {
    overall: number;
    cleanliness?: number;
    accuracy?: number;
    communication?: number;
    location?: number;
    value?: number;
  };
  comment: string;
  hostResponse?: {
    comment: string;
    respondedAt: Date;
  };
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    guest: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
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

reviewSchema.index({ property: 1, guest: 1 }, { unique: true });
reviewSchema.index({ property: 1, createdAt: -1 });

// Update property rating after review operations
async function updatePropertyRating(propertyId: mongoose.Types.ObjectId) {
  const ReviewModel = mongoose.model('Review');
  const PropertyModel = mongoose.model('Property');
  const reviews = await ReviewModel.find({ property: propertyId });
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.ratings.overall, 0) / reviews.length
      : 0;
  await PropertyModel.findByIdAndUpdate(propertyId, {
    'ratings.average': Math.round(avgRating * 10) / 10,
    'ratings.count': reviews.length,
  });
}

reviewSchema.post('save', async function () {
  await updatePropertyRating((this as any).property);
});

reviewSchema.post('deleteOne', { document: true } as any, async function () {
  await updatePropertyRating((this as any).property);
});

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);
export default Review;
