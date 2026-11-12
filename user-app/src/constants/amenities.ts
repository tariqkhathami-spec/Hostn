// Values of the Unit `amenities` and `features` enums
// (backend/src/models/Unit.js). Labels live in i18n under `amenity.<value>`.

export const UNIT_AMENITIES = [
  'two_sections', 'womens_pool', 'outdoor_annex', 'tent', 'slide', 'dining_hall',
  'sand_skiing', 'drivers_room', 'two_separate_sections', 'cinema_room',
  'two_sections_connected', 'balcony', 'shared_pool', 'tv', 'bbq_area', 'fire_pit',
  'mist_fan', 'luxury_salon', 'hair_salon', 'outdoor_seating', 'green_area', 'zipline',
  'volleyball', 'basketball', 'football', 'table_tennis', 'playstation', 'sand_games',
  'kids_playground', 'billiards', 'trampoline', 'massage_chairs', 'lit_pool', 'speakers',
  'extra_lighting', 'projector', 'bridal_room',
] as const;

export const UNIT_FEATURES = [
  'mountain_view', 'self_checkin', 'elevator', 'workspace', 'sea_view', 'garden_view',
  'mountain_waterfall', 'internet', 'wardrobe', 'personal_care', 'private_beach',
  'security_office', 'parking', 'cleaning',
] as const;

/** Filter chip for "has a pool": sent as `pool=1`, not as an amenity value. */
export const POOL_FILTER = 'pool';

/** Amenity chips offered on the filters screen, most asked-for first. */
export const FILTER_AMENITIES: string[] = [
  POOL_FILTER,
  'internet',
  'parking',
  'bbq_area',
  'kids_playground',
  'outdoor_seating',
  'green_area',
  'tv',
  'balcony',
  'two_sections',
  'womens_pool',
  'football',
  'volleyball',
  'playstation',
  'billiards',
  'trampoline',
  'tent',
  'fire_pit',
  'sea_view',
  'mountain_view',
  'self_checkin',
  'elevator',
];
