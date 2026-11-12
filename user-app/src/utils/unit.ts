// The API's bookable item is a Unit; location, host, type, rules, ratings and
// the title live on its parent Property. The screens were written against a
// flat "listing", so every unit that reaches the UI goes through
// flattenUnit() first.

type Lang = 'en' | 'ar' | string;

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** True when the object is a Unit document (flattened or not). */
export function isUnit(item: any): boolean {
  return !!item && (item._isUnit === true || !!item.nameEn || !!item.nameAr);
}

/** Average of the unit's day prices that are set (0 when none are). */
export function unitAveragePrice(pricing: any): number {
  if (!pricing) return 0;
  const prices = DAY_KEYS.map((k) => Number(pricing[k]) || 0).filter((v) => v > 0);
  if (prices.length === 0) return 0;
  return r2(prices.reduce((a, b) => a + b, 0) / prices.length);
}

/**
 * Unit document (with a populated `property`) -> the flat listing shape the
 * screens read. Unit fields are kept; `location`, `host`, `type`, `rules`,
 * `ratings`, `direction` and the titles come from the property.
 * Anything that is not a unit is returned untouched.
 */
export function flattenUnit<T = any>(raw: T): T {
  const unit = raw as any;
  if (!unit || typeof unit !== 'object' || unit._isUnit || !(unit.nameEn || unit.nameAr)) return raw;

  const property = unit.property && typeof unit.property === 'object' ? unit.property : undefined;
  const propertyId = property ? String(property._id ?? property.id ?? '') : unit.property ? String(unit.property) : undefined;
  const host = property?.host && typeof property.host === 'object' ? property.host : undefined;

  // Search already computes avgPrice / effectivePrice; on detail derive them
  // from the day prices and the unit discount.
  const average = Number(unit.avgPrice) > 0 ? r2(Number(unit.avgPrice)) : unitAveragePrice(unit.pricing);
  const discountPercent = Number(unit.pricing?.discountPercent) || 0;
  const effective = Number(unit.effectivePrice) > 0
    ? r2(Number(unit.effectivePrice))
    : r2(average * (1 - discountPercent / 100));

  return {
    ...unit,
    _isUnit: true,
    propertyId,
    propertyTitle: property?.title ?? '',
    propertyTitleAr: property?.titleAr ?? '',
    title: property?.title ?? unit.title ?? '',
    titleAr: property?.titleAr ?? unit.titleAr ?? '',
    location: property?.location ?? unit.location,
    host: host ?? unit.host,
    type: property?.type ?? unit.type,
    rules: property?.rules ?? unit.rules,
    direction: property?.direction ?? unit.direction,
    ratings: property?.ratings ?? unit.ratings,
    images: unit.images?.length ? unit.images : property?.images ?? [],
    // Amenities and features are two enum lists on the unit; shown together.
    amenities: [...(unit.amenities ?? []), ...(unit.features ?? [])],
    capacity: {
      ...(property?.capacity ?? {}),
      ...(unit.capacity ?? {}),
      bedrooms: unit.bedrooms?.count ?? property?.capacity?.bedrooms,
      bathrooms: unit.bathroomCount ?? property?.capacity?.bathrooms,
    },
    pricing: { ...(unit.pricing ?? {}), perNight: average, discountPercent },
    discountedPrice: effective,
  } as T;
}

/** Unit name in the app language, falling back to the other one. */
export function unitName(unit: any, language: Lang): string {
  if (!unit || typeof unit !== 'object') return '';
  return (language === 'ar' ? unit.nameAr || unit.nameEn : unit.nameEn || unit.nameAr) || '';
}

/** Property title in the app language, falling back to the other one. */
export function propertyTitle(property: any, language: Lang): string {
  if (!property || typeof property !== 'object') return '';
  return (language === 'ar' ? property.titleAr || property.title : property.title || property.titleAr) || '';
}

/** "Property title · Unit name", language-aware, for a property + unit pair. */
export function stayTitle(property: any, unit: any, language: Lang): string {
  return [propertyTitle(property, language), unitName(unit, language)].filter(Boolean).join(' · ');
}

/** Display title of a listing: a flattened unit, a raw unit or a property. */
export function listingTitle(item: any, language: Lang): string {
  if (!item) return '';
  if (isUnit(item)) {
    const parent = item.property && typeof item.property === 'object'
      ? item.property
      : { title: item.propertyTitle ?? item.title, titleAr: item.propertyTitleAr ?? item.titleAr };
    return stayTitle(parent, item, language);
  }
  return propertyTitle(item, language);
}
