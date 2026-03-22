import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProperty extends Document {
  _id: mongoose.Types.ObjectId;
  host: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: string;
  location: {
    city: string;
    district?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  images: { url: string; caption?: string; isPrimary?: boolean }[];
  amenities: string[];
  pricing: {
    perNight: number;
    cleaningFee: number;
    discountPercent: number;
    weeklyDiscount: number;
  };
  capacity: {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    beds: number;
  };
  rules: {
    checkInTime: string;
    checkOutTime: string;
    minNights: number;
    maxNights: number;
    smokingAllowed: boolean;
    petsAllowed: boolean;
    partiesAllowed: boolean;
  };
  ratings: {
    average: number;
    count: number;
  };
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  unavailableDates: { start: Date; end: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: ['chalet', 'apartment', 'villa', 'studio', 'farm', 'camp', 'hotel'],
      required: [true, 'Property type is required'],
    },
    location: {
      city: { type: String, required: true },
      district: { type: String },
      address: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    amenities: [
      {
        type: String,
        enum: [
          'wifi', 'pool', 'parking', 'ac', 'kitchen', 'tv', 'washer', 'dryer',
          'gym', 'bbq', 'garden', 'balcony', 'sea_view', 'mountain_view',
          'elevator', 'security', 'pet_friendly', 'smoking_allowed',
          'breakfast_included', 'heating',
        ],
      },
    ],
    pricing: {
      perNight: { type: Number, required: true, min: 0 },
      cleaningFee: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      weeklyDiscount: { type: Number, default: 0, min: 0, max: 100 },
    },
    capacity: {
      maxGuests: { type: Number, required: true, min: 1 },
      bedrooms: { type: Number, default: 1 },
      bathrooms: { type: Number, default: 1 },
      beds: { type: Number, default: 1 },
    },
    rules: {
      checkInTime: { type: String, default: '14:00' },
      checkOutTime: { type: String, default: '12:00' },
      minNights: { type: Number, default: 1 },
      maxNights: { type: Number, default: 30 },
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed: { type: Boolean, default: false },
      partiesAllowed: { type: Boolean, default: false },
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 10 },
      count: { type: Number, default: 0 },
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderationReason: { type: String },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    tags: [String],
    unavailableDates: [
      {
        start: { type: Date },
        end: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

propertySchema.index({ 'location.city': 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ 'pricing.perNight': 1 });
propertySchema.index({ 'ratings.average': -1 });
propertySchema.index({ isFeatured: 1 });
propertySchema.index({ moderationStatus: 1 });
propertySchema.index({ host: 1 });
propertySchema.index({ title: 'text', description: 'text', 'location.city': 'text' });

propertySchema.virtual('discountedPrice').get(function () {
  if (this.pricing.discountPercent > 0) {
    return this.pricing.perNight * (1 - this.pricing.discountPercent / 100);
  }
  return this.pricing.perNight;
});

propertySchema.set('toJSON', { virtuals: true });
propertySchema.set('toObject', { virtuals: true });

const Property: Model<IProperty> =
  mongoose.models.Property || mongoose.model<IProperty>('Property', propertySchema);
export default Property;
