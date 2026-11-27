/**
 * What a unit needs before guests can see or book it.
 *
 * A host can save a unit step by step, so a freshly created unit may have no
 * name, no photos and a price of zero. Such a unit must never reach search
 * results or the booking flow — a guest would be offered a nameless place
 * for 0 SAR. Public queries add PUBLISHABLE_UNIT_FILTER, and the host's own
 * lists carry `publishIssues` so the dashboard can say what is missing.
 */
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Saudi Ministry of Tourism rules: every unit offered on a booking platform
 * must hold a valid tourism licence, and platforms must take unlicensed
 * listings down. A unit counts as licensed once an admin has approved its
 * permit (status 'active') and the permit has not expired.
 *
 * TOURISM_LICENSE_REQUIRED=false switches the requirement off (for local
 * development and test data only; never in production).
 */
function licenseRequired() {
  return process.env.TOURISM_LICENSE_REQUIRED !== 'false';
}

function hasActiveLicense(unit, now = new Date()) {
  const lic = unit && unit.tourismLicense;
  if (!lic || lic.status !== 'active' || !hasText(lic.licenseNumber)) return false;
  if (lic.expiryDate && new Date(lic.expiryDate) <= now) return false;
  return true;
}

/** @returns {string[]} codes among: missing_name, missing_price, missing_photos, missing_license */
function unitPublishIssues(unit) {
  const issues = [];
  if (!unit) {
    return ['missing_name', 'missing_price', 'missing_photos', ...(licenseRequired() ? ['missing_license'] : [])];
  }
  if (!hasText(unit.nameAr) && !hasText(unit.nameEn)) issues.push('missing_name');
  const pricing = unit.pricing || {};
  if (!DAYS.every((d) => Number(pricing[d]) > 0)) issues.push('missing_price');
  if (!Array.isArray(unit.images) || unit.images.length === 0) issues.push('missing_photos');
  if (licenseRequired() && !hasActiveLicense(unit)) issues.push('missing_license');
  return issues;
}

/** Mongo conditions for the name, price and photo checks of unitPublishIssues(). */
const PUBLISHABLE_UNIT_CONDITIONS = [
  { 'images.0': { $exists: true } },
  { $or: [{ nameAr: { $regex: /\S/ } }, { nameEn: { $regex: /\S/ } }] },
  ...DAYS.map((d) => ({ [`pricing.${d}`]: { $gt: 0 } })),
];

/** Mongo conditions matching only units with a valid licence (see hasActiveLicense). */
function licenseConditions(now = new Date()) {
  return [
    { 'tourismLicense.status': 'active' },
    { 'tourismLicense.licenseNumber': { $regex: /\S/ } },
    {
      $or: [
        { 'tourismLicense.expiryDate': { $exists: false } },
        { 'tourismLicense.expiryDate': null },
        { 'tourismLicense.expiryDate': { $gt: now } },
      ],
    },
  ];
}

/**
 * Adds the conditions of unitPublishIssues() to an existing filter object
 * (mutates and returns it).
 */
function requirePublishable(filter) {
  filter.$and = (filter.$and || []).concat(
    PUBLISHABLE_UNIT_CONDITIONS,
    licenseRequired() ? licenseConditions() : []
  );
  return filter;
}

module.exports = {
  unitPublishIssues,
  requirePublishable,
  hasActiveLicense,
  licenseRequired,
  PUBLISHABLE_UNIT_CONDITIONS,
  DAYS,
};
