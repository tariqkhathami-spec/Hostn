const mongoose = require('mongoose');

// ── Pool sub-schema ──────────────────────────────────────────────────
const poolSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'inside_with_barrier',
        'inside_without_barrier',
        'outside_without_barrier',
        'outside_with_barrier',
        'waterpark_with_barrier',
        'waterpark_without_barrier',
        'heated',
      ],
      required: true,
    },
    variableDepth: { type: Boolean, default: false },
    depthMin: { type: Number, min: 0 },   // meters (if variableDepth)
    depthMax: { type: Number, min: 0 },   // meters (if variableDepth)
    depth: { type: Number, min: 0 },      // meters (if !variableDepth)
    lengthM: { type: Number, min: 0 },    // meters
    widthM: { type: Number, min: 0 },     // meters
    isEmpty: { type: Boolean, default: false },
  },
  { _id: true }
);

// ── Unit schema ──────────────────────────────────────────────────────
const unitSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
      index: true,
    },

    // ── A. Toggle ─────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },

    // ── C-i. Name (bilingual) ────────────────────────────────────
    nameEn: {
      type: String,
      trim: true,
      maxlength: [200, 'English name cannot exceed 200 characters'],
    },
    nameAr: {
      type: String,
      trim: true,
      maxlength: [200, 'Arabic name cannot exceed 200 characters'],
    },

    // ── C-ii. Area ───────────────────────────────────────────────
    area: { type: Number, min: 0 }, // m²

    // ── C-iii. Deposit ───────────────────────────────────────────
    depositPercent: { type: Number, default: 0, min: 0, max: 100 },

    // ── D. Reservation terms ─────────────────────────────────────
    insuranceOnArrival: { type: Boolean, default: false },
    insuranceAmount: { type: Number, min: 0, default: 0 }, // SAR (only when insuranceOnArrival=true)
    writtenRules: { type: String, maxlength: 5000 },

    // ── E. Cancellation policy ───────────────────────────────────
    cancellationPolicy: {
      type: String,
      enum: ['free', 'flexible', 'normal', 'restricted'],
      default: 'flexible',
    },
    cancellationDescription: { type: String, maxlength: 2000 },

    // ── F. Description ───────────────────────────────────────────
    description: { type: String, maxlength: 5000 },

    // ── G. Suitability ───────────────────────────────────────────
    suitability: {
      type: String,
      enum: ['family', 'singles', 'both'],
      default: 'both',
    },

    // ── H. Living rooms & sitting areas ──────────────────────────
    hasLivingRooms: { type: Boolean, default: false },
    livingRooms: {
      main: { type: Number, default: 0, min: 0 },
      additional: { type: Number, default: 0, min: 0 },
      outdoor: { type: Number, default: 0, min: 0 },
      outdoorRoom: { type: Number, default: 0, min: 0 },
    },

    // ── I. Bedrooms ──────────────────────────────────────────────
    hasBedrooms: { type: Boolean, default: false },
    bedrooms: {
      count: { type: Number, default: 0, min: 0 },
      singleBeds: { type: Number, default: 0, min: 0 },
      doubleBeds: { type: Number, default: 0, min: 0 },
    },

    // ── J. Bathrooms ─────────────────────────────────────────────
    bathroomCount: { type: Number, default: 0, min: 0 },
    bathroomAmenities: [
      {
        type: String,
        enum: [
          'bath',
          'tissues',
          'soap',
          'shampoo',
          'slippers',
          'robe',
          'shower',
          'jacuzzi',
          'sauna',
        ],
      },
    ],

    // ── K. Kitchen ───────────────────────────────────────────────
    hasKitchen: { type: Boolean, default: false },
    kitchen: {
      diningCapacity: { type: Number, default: 0, min: 0 },
      amenities: [
        {
          type: String,
          enum: [
            'freezer',
            'furnace',
            'refrigerator',
            'microwave',
            'water_kettle',
            'dishes',
            'coffee_machine',
            'equipped_kitchen',
            'washing_machine',
          ],
        },
      ],
    },

    // ── L. Pools ─────────────────────────────────────────────────
    hasPool: { type: Boolean, default: false },
    pools: [poolSchema],

    // ── M. Amenities ─────────────────────────────────────────────
    amenities: [
      {
        type: String,
        enum: [
          'two_sections',
          'womens_pool',
          'outdoor_annex',
          'tent',
          'slide',
          'dining_hall',
          'sand_skiing',
          'drivers_room',
          'two_separate_sections',
          'cinema_room',
          'two_sections_connected',
          'balcony',
          'shared_pool',
          'tv',
          'bbq_area',
          'fire_pit',
          'mist_fan',
          'luxury_salon',
          'hair_salon',
          'outdoor_seating',
          'green_area',
          'zipline',
          'volleyball',
          'basketball',
          'football',
          'table_tennis',
          'playstation',
          'sand_games',
          'kids_playground',
          'billiards',
          'trampoline',
          'massage_chairs',
          'lit_pool',
          'speakers',
          'extra_lighting',
          'projector',
          'bridal_room',
        ],
      },
    ],

    // ── N. Features ──────────────────────────────────────────────
    features: [
      {
        type: String,
        enum: [
          'mountain_view',
          'self_checkin',
          'elevator',
          'workspace',
          'sea_view',
          'garden_view',
          'mountain_waterfall',
          'internet',
          'wardrobe',
          'personal_care',
          'private_beach',
          'security_office',
          'parking',
          'cleaning',
        ],
      },
    ],

    // ── B. Photos ────────────────────────────────────────────────
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // ── Pricing (per-day breakdown) ──────────────────────────────
    pricing: {
      sunday: { type: Number, min: 0, default: 0 },
      monday: { type: Number, min: 0, default: 0 },
      tuesday: { type: Number, min: 0, default: 0 },
      wednesday: { type: Number, min: 0, default: 0 },
      thursday: { type: Number, min: 0, default: 0 },
      friday: { type: Number, min: 0, default: 0 },
      saturday: { type: Number, min: 0, default: 0 },
      cleaningFee: { type: Number, default: 0, min: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      weeklyDiscount: { type: Number, default: 0, min: 0, max: 100 },
    },

    // ── Per-date price overrides ─────────────────────────────────────
    datePricing: [
      {
        date: { type: Date, required: true },
        price: { type: Number, min: 0 },         // override price (null = use day-of-week default)
        isBlocked: { type: Boolean, default: false }, // true = unavailable
      },
    ],

    // ── Capacity ─────────────────────────────────────────────────
    capacity: {
      maxGuests: { type: Number, default: 1, min: 1 },
    },

    // ── Ratings (per-unit) ───────────────────────────────────────
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 10 },
      count: { type: Number, default: 0 },
    },

    // ── Availability ─────────────────────────────────────────────
    unavailableDates: [
      {
        start: { type: Date },
        end: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────
unitSchema.index({ property: 1, isActive: 1 });
unitSchema.index({ property: 1, createdAt: 1 });
unitSchema.index({ _id: 1, 'datePricing.date': 1 });

// ── Virtuals ─────────────────────────────────────────────────────────
unitSchema.virtual('name').get(function () {
  // Convenience: returns Arabic name if available, else English
  return this.nameAr || this.nameEn || '';
});

unitSchema.set('toJSON', { virtuals: true });
unitSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Unit', unitSchema);
