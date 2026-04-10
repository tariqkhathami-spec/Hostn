const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    titleAr: {
      type: String,
      trim: true,
      maxlength: [200, 'Arabic title cannot exceed 200 characters'],
    },
    description: {
      type: String,
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
      // GeoJSON for MongoDB 2dsphere queries (nearby search)
      geoJSON: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] }, // [lng, lat]
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
          'wifi',
          'pool',
          'parking',
          'ac',
          'kitchen',
          'tv',
          'washer',
          'dryer',
          'gym',
          'bbq',
          'garden',
          'balcony',
          'sea_view',
          'mountain_view',
          'elevator',
          'security',
          'pet_friendly',
          'smoking_allowed',
          'breakfast_included',
          'heating',
          'hot_tub',
          'beach_access',
          'fireplace',
        ],
      },
    ],
    area: { type: Number, min: 0 }, // property size in m²
    direction: {
      type: String,
      enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'],
    },
    pricing: {
      perNight: { type: Number, min: 0 },
      cleaningFee: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      weeklyDiscount: { type: Number, default: 0, min: 0, max: 100 },
    },
    capacity: {
      maxGuests: { type: Number, min: 1 },
      bedrooms: { type: Number },
      bathrooms: { type: Number },
      beds: { type: Number },
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
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: true },
    moderationNote: { type: String },
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

propertySchema.index(
  { 'location.geoJSON': '2dsphere' },
  { partialFilterExpression: { 'location.geoJSON.coordinates': { $exists: true, $ne: [] } } }
);
propertySchema.index({ 'location.city': 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ 'pricing.perNight': 1 });
propertySchema.index({ 'ratings.average': -1 });
propertySchema.index({ isFeatured: 1 });
propertySchema.index({ title: 'text', titleAr: 'text', description: 'text', 'location.city': 'text' });

// Sync coordinates to GeoJSON on save
propertySchema.pre('save', function (next) {
  if (this.location?.coordinates?.lat && this.location?.coordinates?.lng) {
    this.location.geoJSON = {
      type: 'Point',
      coordinates: [this.location.coordinates.lng, this.location.coordinates.lat],
    };
  }
  next();
});

propertySchema.virtual('discountedPrice').get(function () {
  if (!this.pricing?.perNight) return undefined;
  if (this.pricing.discountPercent > 0) {
    return this.pricing.perNight * (1 - this.pricing.discountPercent / 100);
  }
  return this.pricing.perNight;
});

// Virtual: count of active units (populated via Unit model)
propertySchema.virtual('units', {
  ref: 'Unit',
  localField: '_id',
  foreignField: 'property',
  count: true,
  match: { isActive: true },
});

propertySchema.set('toJSON', { virtuals: true });
propertySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Property', propertySchema);