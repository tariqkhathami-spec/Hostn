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

/** @returns {string[]} codes among: missing_name, missing_price, missing_photos */
function unitPublishIssues(unit) {
  const issues = [];
  if (!unit) return ['missing_name', 'missing_price', 'missing_photos'];
  if (!hasText(unit.nameAr) && !hasText(unit.nameEn)) issues.push('missing_name');
  const pricing = unit.pricing || {};
  if (!DAYS.every((d) => Number(pricing[d]) > 0)) issues.push('missing_price');
  if (!Array.isArray(unit.images) || unit.images.length === 0) issues.push('missing_photos');
  return issues;
}

/** Mongo conditions matching only units that pass unitPublishIssues(). */
const PUBLISHABLE_UNIT_CONDITIONS = [
  { 'images.0': { $exists: true } },
  { $or: [{ nameAr: { $regex: /\S/ } }, { nameEn: { $regex: /\S/ } }] },
  ...DAYS.map((d) => ({ [`pricing.${d}`]: { $gt: 0 } })),
];

/** Adds the publishable conditions to an existing filter object (mutates and returns it). */
function requirePublishable(filter) {
  filter.$and = (filter.$and || []).concat(PUBLISHABLE_UNIT_CONDITIONS);
  return filter;
}

module.exports = { unitPublishIssues, requirePublishable, PUBLISHABLE_UNIT_CONDITIONS, DAYS };
