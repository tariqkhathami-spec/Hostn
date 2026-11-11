// Host mobile app compatibility routes (units). Mounted under /api/v1/host
// after protect + authorize('host', 'admin') — see routes/host.js.
//
// Everything here reads and writes the same fields the booking engine uses
// (Unit.pricing, Unit.datePricing, Unit.unavailableDates, Property.rules,
// Property.unavailableDates, Unit.tourismLicense), so a change made in the
// app changes what guests are actually charged / allowed to book.
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const Unit = require('../../models/Unit');
const Property = require('../../models/Property');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MIDWEEK_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday'];
const WEEKEND_DAYS = ['thursday', 'friday', 'saturday'];
const MAX_PRICE = 1000000;
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const isAdmin = (user) => user.userType === 'admin';
const fail = (res, status, message, extra) => res.status(status).json({ success: false, message, ...(extra || {}) });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Load a property the caller owns. Returns { property } or { status, message }. */
async function loadOwnedProperty(propertyId, user) {
  if (!isId(propertyId)) return { status: 400, message: 'Invalid property ID' };
  const property = await Property.findById(propertyId);
  if (!property || property.isDeleted) return { status: 404, message: 'Property not found' };
  if (!isAdmin(user) && String(property.host) !== String(user._id)) {
    return { status: 403, message: 'Not authorized' };
  }
  return { property };
}

/**
 * Load a unit the caller owns (unit → property → host).
 *
 * The host app's property list (GET /host/properties) currently hands out
 * PROPERTY ids in its `units[].id` field, so the id may be a property id.
 * In that case it resolves to the property's unit when there is exactly one
 * (the same rule bookingController.resolveUnitId applies to guests).
 */
async function loadOwnedUnit(id, user) {
  if (!isId(id)) return { status: 400, message: 'Invalid unit ID' };

  let unit = await Unit.findById(id);
  let property;
  if (unit) {
    if (unit.isDeleted) return { status: 404, message: 'Unit not found' };
    property = await Property.findById(unit.property);
    if (!property || property.isDeleted) return { status: 404, message: 'Unit not found' };
    if (!isAdmin(user) && String(property.host) !== String(user._id)) {
      return { status: 403, message: 'Not authorized' };
    }
    return { unit, property };
  }

  property = await Property.findById(id);
  if (!property || property.isDeleted) return { status: 404, message: 'Unit not found' };
  if (!isAdmin(user) && String(property.host) !== String(user._id)) {
    return { status: 403, message: 'Not authorized' };
  }
  const units = await Unit.find({ property: property._id, isDeleted: { $ne: true } }).limit(2);
  if (units.length === 0) return { status: 404, message: 'This property has no units yet' };
  if (units.length > 1) {
    return { status: 400, message: 'This property has several units; a unit ID is required', code: 'UNIT_REQUIRED' };
  }
  return { unit: units[0], property };
}

/** Express helper: resolve the unit from a route param or answer with the error. */
async function unitFromReq(req, res, param) {
  const found = await loadOwnedUnit(req.params[param], req.user);
  if (!found.unit) {
    fail(res, found.status, found.message, found.code ? { code: found.code } : undefined);
    return null;
  }
  return found;
}

const unitName = (unit) => unit.nameAr || unit.nameEn || '';
const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Parse 'YYYY-MM-DD' (or any ISO date) to a UTC-midnight Date, or null. */
function parseDay(value) {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** Parse any date/time value, or null. */
function parseDate(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
}

function unitPayload(unit, property) {
  const data = unit.toObject({ virtuals: true });
  data.id = String(unit._id);
  data.status = unit.isActive ? 'listed' : 'unlisted';
  data.propertyId = String(property._id);
  data.property = { _id: property._id, title: property.title, titleAr: property.titleAr };
  return data;
}

function pricingPayload(unit) {
  const p = (unit.pricing && unit.pricing.toObject ? unit.pricing.toObject() : unit.pricing) || {};
  const out = {};
  for (const day of DAYS) out[day] = p[day] || 0;
  // The app shows Sunday–Wednesday as a single "mid-week" rate. When the four
  // days differ (set from the website), Sunday's rate is shown and
  // `midWeekUniform` is false.
  out.midWeek = out.sunday;
  out.midWeekUniform = MIDWEEK_DAYS.every((d) => out[d] === out.sunday);
  out.cleaningFee = p.cleaningFee || 0;
  out.discountPercent = p.discountPercent || 0;
  out.globalEnabled = p.globalEnabled !== false;
  out.globalStackable = !!p.globalStackable;
  out.weeklyDiscount = p.weeklyDiscount || 0;
  out.weeklyEnabled = p.weeklyEnabled !== false;
  out.weeklyStackable = !!p.weeklyStackable;
  out.monthlyDiscount = p.monthlyDiscount || 0;
  out.monthlyEnabled = p.monthlyEnabled !== false;
  out.monthlyStackable = !!p.monthlyStackable;
  return out;
}

// ─── Unit detail / edit / status ─────────────────────────────────────────────

// GET /host/units/:id — owner view (also returns unlisted units)
router.get('/units/:id', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'id');
  if (!found) return;
  res.json({ success: true, data: unitPayload(found.unit, found.property) });
}));

// Fields the host may edit here. Pricing, images, availability and the
// tourism licence have their own endpoints.
const EDITABLE_UNIT_FIELDS = [
  'nameEn', 'nameAr', 'area', 'depositPercent', 'insuranceOnArrival', 'insuranceAmount',
  'writtenRules', 'cancellationPolicy', 'cancellationDescription', 'description',
  'suitability', 'hasLivingRooms', 'livingRooms', 'hasBedrooms', 'bedrooms',
  'bathroomCount', 'bathroomAmenities', 'hasKitchen', 'kitchen', 'hasPool', 'pools',
  'amenities', 'features', 'capacity', 'arrivalInstructions',
];
// Nested objects: only these sub-keys are accepted (merged into the existing value).
const NESTED_UNIT_FIELDS = {
  livingRooms: ['main', 'additional', 'outdoor', 'outdoorRoom'],
  bedrooms: ['count', 'singleBeds', 'doubleBeds'],
  kitchen: ['diningCapacity', 'amenities'],
  capacity: ['maxGuests'],
};

// PATCH /host/units/:id
router.patch('/units/:id', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'id');
  if (!found) return;
  const { unit, property } = found;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  let changed = 0;
  for (const field of EDITABLE_UNIT_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    const subKeys = NESTED_UNIT_FIELDS[field];
    if (subKeys) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return fail(res, 400, `${field} must be an object`);
      }
      for (const key of subKeys) {
        if (value[key] !== undefined) {
          unit.set(`${field}.${key}`, value[key]);
          changed++;
        }
      }
    } else {
      unit.set(field, value);
      changed++;
    }
  }
  if (changed === 0) return fail(res, 400, 'No valid fields to update');

  await unit.save(); // schema validators run here (ValidationError / CastError → 400)
  res.json({ success: true, data: unitPayload(unit, property) });
}));

// PATCH /host/units/:id/status  { status: 'listed' | 'unlisted' }
router.patch('/units/:id/status', wrap(async (req, res) => {
  const status = req.body && req.body.status;
  if (status !== 'listed' && status !== 'unlisted') {
    return fail(res, 400, "status must be 'listed' or 'unlisted'");
  }
  const found = await unitFromReq(req, res, 'id');
  if (!found) return;
  const { unit, property } = found;

  const wantActive = status === 'listed';
  if (unit.isActive !== wantActive) {
    unit.isActive = wantActive;
    await unit.save();

    // Same rule as unitController.toggleUnitStatus: a property whose last
    // active unit is unlisted is taken off the site too.
    if (!wantActive) {
      const remainingActive = await Unit.countDocuments({
        property: property._id, isActive: true, isDeleted: { $ne: true },
      });
      if (remainingActive === 0) {
        await Property.updateOne({ _id: property._id }, { $set: { isActive: false } });
      }
    }
  }

  // Listing a unit of a hidden property would leave it unfindable (the app
  // shows the property's own status), so bring the property back with it —
  // unless an admin rejected the listing. The host can already do this
  // through PUT /host/properties/:id/toggle.
  if (wantActive && !property.isActive && property.isApproved !== false) {
    await Property.updateOne({ _id: property._id }, { $set: { isActive: true } });
  }

  res.json({
    success: true,
    data: { id: String(unit._id), status, isActive: unit.isActive },
    message: unit.isActive ? 'Unit activated' : 'Unit deactivated',
  });
}));

// ─── Pricing ─────────────────────────────────────────────────────────────────

// GET /host/units/:unitId/pricing
router.get('/units/:unitId/pricing', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  res.json({ success: true, data: pricingPayload(found.unit) });
}));

// PUT /host/units/:unitId/pricing
// Accepts day rates either flat ({ thursday: 500 }) or nested
// ({ pricing: { thursday: 500 } }), plus `midWeek` (Sun–Wed), the website's
// { weekday, applyWeekday } / { weekend, applyWeekend }, `cleaningFee`, and
// the discount percentages / flags stored in Unit.pricing.
router.put('/units/:unitId/pricing', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  const { unit } = found;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const nested = body.pricing && typeof body.pricing === 'object' && !Array.isArray(body.pricing) ? body.pricing : {};
  const input = { ...body, ...nested };

  const updates = {};
  const price = (label, raw) => {
    const n = toNumber(raw);
    if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) throw Object.assign(new Error(`${label} must be a number between 0 and ${MAX_PRICE}`), { statusCode: 400 });
    return Math.round(n * 100) / 100;
  };
  const percent = (label, raw) => {
    const n = toNumber(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw Object.assign(new Error(`${label} must be a number between 0 and 100`), { statusCode: 400 });
    return n;
  };

  try {
    if (input.midWeek !== undefined) {
      const v = price('midWeek', input.midWeek);
      for (const d of MIDWEEK_DAYS) updates[d] = v;
    }
    if (toBool(input.applyWeekday) && input.weekday != null) {
      const v = price('weekday', input.weekday);
      for (const d of MIDWEEK_DAYS) updates[d] = v;
    }
    if (toBool(input.applyWeekend) && input.weekend != null) {
      const v = price('weekend', input.weekend);
      for (const d of WEEKEND_DAYS) updates[d] = v;
    }
    for (const d of DAYS) {
      if (input[d] !== undefined) updates[d] = price(d, input[d]);
    }
    if (input.cleaningFee !== undefined) updates.cleaningFee = price('cleaningFee', input.cleaningFee);
    for (const f of ['discountPercent', 'weeklyDiscount', 'monthlyDiscount']) {
      if (input[f] !== undefined) updates[f] = percent(f, input[f]);
    }
    for (const f of ['globalEnabled', 'globalStackable', 'weeklyEnabled', 'weeklyStackable', 'monthlyEnabled', 'monthlyStackable']) {
      if (input[f] !== undefined) {
        const b = toBool(input[f]);
        if (b === undefined) throw Object.assign(new Error(`${f} must be true or false`), { statusCode: 400 });
        updates[f] = b;
      }
    }
  } catch (err) {
    if (err.statusCode === 400) return fail(res, 400, err.message);
    throw err;
  }

  if (Object.keys(updates).length === 0) return fail(res, 400, 'No valid pricing fields to update');

  for (const [key, value] of Object.entries(updates)) unit.set(`pricing.${key}`, value);
  await unit.save();

  res.json({ success: true, data: pricingPayload(unit) });
}));

// ─── Long-stay discounts (weekly / monthly) ──────────────────────────────────
// Backed by Unit.pricing.{weekly,monthly}Discount + {weekly,monthly}Enabled,
// which bookingController.calculateUnitPricing applies to stays of 7+ / 30+
// nights.

const DISCOUNT_FIELDS = {
  weekly: { percent: 'weeklyDiscount', enabled: 'weeklyEnabled', stackable: 'weeklyStackable', minNights: 7 },
  monthly: { percent: 'monthlyDiscount', enabled: 'monthlyEnabled', stackable: 'monthlyStackable', minNights: 30 },
};

function discountsPayload(unit) {
  const p = unit.pricing || {};
  const rates = DAYS.map((d) => p[d] || 0);
  const avg = rates.reduce((a, b) => a + b, 0) / DAYS.length;
  return Object.entries(DISCOUNT_FIELDS).map(([type, f]) => {
    const percentage = p[f.percent] || 0;
    return {
      type,
      percentage,
      // A 0% discount is never "on", whatever the stored flag says.
      active: p[f.enabled] !== false && percentage > 0,
      stackable: !!p[f.stackable],
      minNights: f.minNights,
      // Average nightly rate (over the 7 day-of-week rates) after this discount.
      averagePrice: Math.round(avg * (1 - percentage / 100) * 100) / 100,
    };
  });
}

// GET /host/units/:unitId/discounts
router.get('/units/:unitId/discounts', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  res.json({ success: true, data: discountsPayload(found.unit) });
}));

// POST /host/units/:unitId/discounts/:type  { percentage, active?, stackable? }
router.post('/units/:unitId/discounts/:type', wrap(async (req, res) => {
  const fields = DISCOUNT_FIELDS[req.params.type];
  if (!fields) return fail(res, 400, "Discount type must be 'weekly' or 'monthly'");
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  const rawPercent = body.percentage ?? body.percent ?? body.discountPercent;
  const active = body.active === undefined ? undefined : toBool(body.active);
  const stackable = body.stackable === undefined ? undefined : toBool(body.stackable);
  if (rawPercent === undefined && active === undefined && stackable === undefined) {
    return fail(res, 400, 'percentage is required');
  }
  let percentage;
  if (rawPercent !== undefined) {
    percentage = toNumber(rawPercent);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return fail(res, 400, 'percentage must be a number between 0 and 100');
    }
  }

  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  const { unit } = found;

  if (percentage !== undefined) unit.set(`pricing.${fields.percent}`, percentage);
  if (active !== undefined) unit.set(`pricing.${fields.enabled}`, active);
  else if (percentage !== undefined && percentage > 0) unit.set(`pricing.${fields.enabled}`, true);
  if (stackable !== undefined) unit.set(`pricing.${fields.stackable}`, stackable);
  await unit.save();

  const all = discountsPayload(unit);
  res.json({ success: true, data: all.find((d) => d.type === req.params.type), discounts: all });
}));

// PATCH /host/units/:unitId/discounts/:type/toggle
router.patch('/units/:unitId/discounts/:type/toggle', wrap(async (req, res) => {
  const fields = DISCOUNT_FIELDS[req.params.type];
  if (!fields) return fail(res, 400, "Discount type must be 'weekly' or 'monthly'");

  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  const { unit } = found;

  const p = unit.pricing || {};
  const percentage = p[fields.percent] || 0;
  const currentlyActive = p[fields.enabled] !== false && percentage > 0;
  if (!currentlyActive && percentage <= 0) {
    return fail(res, 400, 'Set a discount percentage before turning this discount on', { code: 'DISCOUNT_PERCENT_REQUIRED' });
  }
  unit.set(`pricing.${fields.enabled}`, !currentlyActive);
  await unit.save();

  const all = discountsPayload(unit);
  res.json({ success: true, data: all.find((d) => d.type === req.params.type), discounts: all });
}));

// ─── Custom offers (named date discounts) ────────────────────────────────────
// The discount is written to Unit.datePricing[n].discountPercent — the field
// booking pricing reads per night. Unit.offers only groups those dates under
// a name. A date listed in an offer counts only while its datePricing entry
// still carries the offer's percentage (the website can edit dates directly).

const MAX_OFFER_DATES = 366;

function offersPayload(unit) {
  const p = unit.pricing || {};
  const byDate = new Map((unit.datePricing || []).map((dp) => [dateKey(dp.date), dp]));
  const today = dateKey(new Date());

  return (unit.offers || []).map((offer) => {
    const live = (offer.dates || [])
      .map(dateKey)
      .filter((key) => {
        const dp = byDate.get(key);
        return dp && dp.discountPercent === offer.discountPercent;
      })
      .sort();
    return {
      id: String(offer._id),
      name: offer.name || '',
      discountPercent: offer.discountPercent,
      selectedDates: live,
      discountedPrices: live.map((key) => {
        const dp = byDate.get(key);
        const originalPrice = dp.price != null ? dp.price : (p[DAYS[new Date(`${key}T00:00:00.000Z`).getUTCDay()]] || 0);
        return {
          date: key,
          originalPrice,
          discountedPrice: Math.round(originalPrice * (1 - offer.discountPercent / 100) * 100) / 100,
        };
      }),
      active: live.some((key) => key >= today),
      createdAt: offer.createdAt,
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Remove a date's discount; drop the datePricing entry when nothing else is left on it. */
function clearDateDiscount(unit, key, onlyIfPercent) {
  const entry = (unit.datePricing || []).find((dp) => dateKey(dp.date) === key);
  if (!entry) return;
  if (onlyIfPercent !== undefined && entry.discountPercent !== onlyIfPercent) return;
  entry.discountPercent = undefined;
  entry.discountStackable = false;
  const hasPrice = typeof entry.price === 'number' && entry.price > 0;
  if (!hasPrice && !entry.isBlocked) unit.datePricing.pull(entry._id);
}

// GET /host/units/:unitId/offers
router.get('/units/:unitId/offers', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  res.json({ success: true, data: offersPayload(found.unit) });
}));

// POST /host/units/:unitId/offers  { name, discountPercent, selectedDates: ['YYYY-MM-DD', …] }
router.post('/units/:unitId/offers', wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return fail(res, 400, 'Offer name is required');
  if (name.length > 100) return fail(res, 400, 'Offer name cannot exceed 100 characters');

  const discountPercent = toNumber(body.discountPercent ?? body.percentage);
  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return fail(res, 400, 'discountPercent must be a number between 1 and 100');
  }

  const rawDates = Array.isArray(body.selectedDates) ? body.selectedDates : body.dates;
  if (!Array.isArray(rawDates) || rawDates.length === 0) return fail(res, 400, 'selectedDates is required');
  if (rawDates.length > MAX_OFFER_DATES) return fail(res, 400, `An offer can cover at most ${MAX_OFFER_DATES} dates`);
  const today = dateKey(new Date());
  const keys = new Set();
  for (const raw of rawDates) {
    const day = parseDay(raw);
    if (!day) return fail(res, 400, 'selectedDates must be valid dates (YYYY-MM-DD)');
    const key = dateKey(day);
    if (key < today) return fail(res, 400, 'Offer dates cannot be in the past');
    keys.add(key);
  }

  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  const { unit } = found;

  // A date belongs to one offer at a time: take these dates out of older offers.
  for (const other of [...unit.offers]) {
    other.dates = other.dates.filter((d) => !keys.has(dateKey(d)));
    if (other.dates.length === 0) unit.offers.pull(other._id);
  }

  for (const key of keys) {
    const entry = unit.datePricing.find((dp) => dateKey(dp.date) === key);
    if (entry) {
      entry.discountPercent = discountPercent;
      entry.discountStackable = false;
    } else {
      unit.datePricing.push({ date: new Date(`${key}T00:00:00.000Z`), discountPercent, discountStackable: false });
    }
  }

  unit.offers.push({
    name,
    discountPercent,
    dates: [...keys].sort().map((key) => new Date(`${key}T00:00:00.000Z`)),
  });
  const created = unit.offers[unit.offers.length - 1];
  await unit.save();

  res.status(201).json({
    success: true,
    data: offersPayload(unit).find((o) => o.id === String(created._id)),
  });
}));

// DELETE /host/units/:unitId/offers/:offerId
router.delete('/units/:unitId/offers/:offerId', wrap(async (req, res) => {
  if (!isId(req.params.offerId)) return fail(res, 400, 'Invalid offer ID');
  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  const { unit } = found;

  const offer = unit.offers.id(req.params.offerId);
  if (!offer) return fail(res, 404, 'Offer not found');

  // Only undo discounts that are still the ones this offer set.
  for (const d of offer.dates) clearDateDiscount(unit, dateKey(d), offer.discountPercent);
  unit.offers.pull(offer._id);
  await unit.save();

  res.json({ success: true, message: 'Offer removed' });
}));

// ─── Tourism permits ─────────────────────────────────────────────────────────
// Backed by Unit.tourismLicense (the same record the website's
// /host/tourism-license page edits).

const PERMIT_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const PERMIT_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const PERMIT_FILE_FIELDS = ['document', 'file', 'image', 'permit'];
const permitUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!PERMIT_MIME.includes(file.mimetype) || !PERMIT_EXT.includes(ext)) {
      return cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, WebP'));
    }
    cb(null, true);
  },
}).fields(PERMIT_FILE_FIELDS.map((name) => ({ name, maxCount: 1 })));

function handlePermitUpload(req, res, next) {
  permitUpload(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum 10MB.' : err.message;
      return fail(res, 400, message);
    }
    next();
  });
}

function permitStatus(license) {
  if (!license || (!license.licenseNumber && !license.documentUrl)) return 'none';
  const expired = license.status === 'expired'
    || (license.expiryDate && new Date(license.expiryDate) < new Date());
  if (expired) return 'none'; // an expired permit must be re-submitted
  if (license.status === 'active') return 'approved';
  if (license.status === 'rejected') return 'rejected';
  return 'pending';
}

function permitPayload(unit, property) {
  const license = unit.tourismLicense || {};
  const hasLicense = !!(license.licenseNumber || license.documentUrl);
  const primary = (unit.images || []).find((img) => img.isPrimary) || (unit.images || [])[0];
  const loc = (property && property.location) || {};
  return {
    unitId: String(unit._id),
    unitName: unitName(unit),
    location: [loc.district, loc.city].filter(Boolean).join('، '),
    thumbnailUrl: primary ? primary.url : undefined,
    permitStatus: permitStatus(license),
    permitNumber: license.licenseNumber || undefined,
    permitDocumentUrl: license.documentUrl || undefined,
    rejectionReason: license.status === 'rejected' ? license.rejectionReason || undefined : undefined,
    expiryDate: hasLicense ? license.expiryDate || undefined : undefined,
    expired: hasLicense && (license.status === 'expired'
      || !!(license.expiryDate && new Date(license.expiryDate) < new Date())),
  };
}

// GET /host/properties/permits
router.get('/properties/permits', wrap(async (req, res) => {
  const properties = await Property.find({ host: req.user._id, isDeleted: { $ne: true } })
    .select('_id title titleAr location')
    .sort({ createdAt: -1 })
    .lean();
  const units = await Unit.find({ property: { $in: properties.map((p) => p._id) }, isDeleted: { $ne: true } })
    .select('_id property nameEn nameAr images tourismLicense')
    .sort({ createdAt: 1 })
    .lean();

  const data = properties.map((property) => {
    const own = units.filter((u) => String(u.property) === String(property._id));
    return {
      propertyId: String(property._id),
      propertyName: property.titleAr || property.title,
      units: own.map((u) => permitPayload(u, property)),
    };
  });

  res.json({ success: true, data });
}));

// POST /host/units/:unitId/permit   (multipart)
// Text fields: permitNumber (or licenseNumber), workType, nationalId,
// commercialRegister, issueDate, expiryDate. Optional file in `document`
// (or `file` / `image` / `permit`): PDF or image, max 10MB.
router.post('/units/:unitId/permit', handlePermitUpload, wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const files = req.files || {};
  const file = PERMIT_FILE_FIELDS.map((name) => files[name] && files[name][0]).find(Boolean);

  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const licenseNumber = str(body.permitNumber, 60) || str(body.licenseNumber, 60);
  if (!licenseNumber && !file) return fail(res, 400, 'A permit number or a permit document is required');

  const workType = body.workType === undefined || body.workType === '' ? undefined : body.workType;
  if (workType !== undefined && workType !== 'individual' && workType !== 'company') {
    return fail(res, 400, "workType must be 'individual' or 'company'");
  }
  let issueDate;
  let expiryDate;
  if (body.issueDate) {
    issueDate = parseDate(body.issueDate);
    if (!issueDate) return fail(res, 400, 'issueDate must be a valid date');
  }
  if (body.expiryDate) {
    expiryDate = parseDate(body.expiryDate);
    if (!expiryDate) return fail(res, 400, 'expiryDate must be a valid date');
  }

  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  const { unit, property } = found;

  let documentUrl;
  if (file) {
    try {
      const uploadRoutes = require('../upload');
      const result = await uploadRoutes.uploadImage(file.buffer, { folder: 'documents' });
      documentUrl = result.url;
    } catch (err) {
      return fail(res, 502, 'Permit document upload failed. Please try again.');
    }
  }

  const prev = (unit.tourismLicense && unit.tourismLicense.toObject ? unit.tourismLicense.toObject() : unit.tourismLicense) || {};
  const effectiveWorkType = workType || prev.workType || 'individual';
  const number = licenseNumber || prev.licenseNumber;
  const expiry = expiryDate !== undefined ? expiryDate : prev.expiryDate;

  // Same status rule as tourismLicenseController.upsertLicense: a submitted
  // permit waits for admin review; it stays active only when the same,
  // already approved, number is saved again.
  let status = 'pending';
  if (expiry && new Date(expiry) < new Date()) status = 'expired';
  else if (number && prev.status === 'active' && prev.licenseNumber === number) status = 'active';

  unit.tourismLicense = {
    workType: effectiveWorkType,
    licenseNumber: number || undefined,
    nationalId: effectiveWorkType === 'individual' ? (str(body.nationalId, 30) || prev.nationalId) : undefined,
    commercialRegister: effectiveWorkType === 'company' ? (str(body.commercialRegister, 30) || prev.commercialRegister) : undefined,
    documentUrl: documentUrl || prev.documentUrl || undefined,
    issueDate: issueDate || prev.issueDate || new Date(),
    expiryDate: expiry || null,
    status,
  };
  await unit.save();

  res.status(201).json({ success: true, data: permitPayload(unit, property) });
}));

// DELETE /host/units/:unitId/permit
router.delete('/units/:unitId/permit', wrap(async (req, res) => {
  const found = await unitFromReq(req, res, 'unitId');
  if (!found) return;
  found.unit.tourismLicense = undefined;
  await found.unit.save();
  res.json({ success: true, message: 'Permit removed', data: permitPayload(found.unit, found.property) });
}));

// ─── Calendar: unblock ───────────────────────────────────────────────────────
// PUT /host/calendar/:propertyId/unblock  { start, end, unitId? }
// Mirror of PUT /host/calendar/:propertyId/block. Blocked ranges are
// half-open [start, end) — the same reading bookingController uses — and any
// part of a blocked range inside the window is released (a range that only
// partly overlaps is trimmed, not dropped). Without `unitId` it releases the
// property-level block and every unit of the property; with `unitId`, that
// unit only.

function subtractRange(ranges, start, end) {
  const kept = [];
  let removed = 0;
  for (const r of ranges) {
    const rs = new Date(r.start);
    const re = new Date(r.end);
    const exact = rs.getTime() === start.getTime() && re.getTime() === end.getTime();
    const overlaps = rs < end && re > start;
    if (!exact && !overlaps) {
      kept.push({ start: rs, end: re });
      continue;
    }
    removed++;
    if (exact) continue;
    if (rs < start) kept.push({ start: rs, end: start });
    if (re > end) kept.push({ start: end, end: re });
  }
  return { kept, removed };
}

router.put('/calendar/:propertyId/unblock', wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const start = parseDate(body.start ?? body.startDate);
  let end = parseDate(body.end ?? body.endDate);
  if (!start || !end) return fail(res, 400, 'start and end must be valid dates');
  if (end < start) return fail(res, 400, 'end must not be before start');
  const exactEnd = end;
  if (end.getTime() === start.getTime()) end = new Date(start.getTime() + DAY_MS); // a single day
  if (body.unitId !== undefined && !isId(body.unitId)) return fail(res, 400, 'Invalid unit ID');

  const owned = await loadOwnedProperty(req.params.propertyId, req.user);
  if (!owned.property) return fail(res, owned.status, owned.message);
  const { property } = owned;

  let units;
  if (body.unitId) {
    const unit = await Unit.findOne({ _id: body.unitId, isDeleted: { $ne: true } });
    if (!unit) return fail(res, 404, 'Unit not found');
    if (String(unit.property) !== String(property._id)) {
      return fail(res, 400, 'Unit does not belong to this property');
    }
    units = [unit];
  } else {
    units = await Unit.find({ property: property._id, isDeleted: { $ne: true } });
  }

  let released = 0;
  const release = (doc) => {
    const current = (doc.unavailableDates || []).map((r) => ({ start: r.start, end: r.end }));
    // Zero-length request: also match a stored zero-length range exactly.
    const exact = current.filter((r) => !(new Date(r.start).getTime() === start.getTime() && new Date(r.end).getTime() === exactEnd.getTime()));
    const { kept, removed } = subtractRange(exact, start, end);
    const total = removed + (current.length - exact.length);
    if (total > 0) doc.unavailableDates = kept;
    return total;
  };

  if (!body.unitId) {
    const n = release(property);
    if (n > 0) {
      released += n;
      await property.save();
    }
  }

  for (const unit of units) {
    let n = release(unit);
    // Per-date blocks set from the website's calendar live in datePricing.
    for (const entry of [...unit.datePricing]) {
      const d = new Date(entry.date);
      if (!entry.isBlocked || d < parseDay(start) || d >= end) continue;
      entry.isBlocked = false;
      const hasPrice = typeof entry.price === 'number' && entry.price > 0;
      const hasDiscount = typeof entry.discountPercent === 'number' && entry.discountPercent > 0;
      if (!hasPrice && !hasDiscount) unit.datePricing.pull(entry._id);
      n++;
    }
    if (n > 0) {
      released += n;
      await unit.save();
    }
  }

  res.json({
    success: true,
    data: {
      released,
      unavailableDates: body.unitId ? units[0].unavailableDates : property.unavailableDates,
    },
    message: released > 0 ? 'Dates unblocked successfully' : 'No blocked dates in this range',
  });
}));

// ─── Booking rules (minimum nights) ──────────────────────────────────────────
// Backed by Property.rules.minNights — the only minimum-stay value the
// booking engine enforces (bookingController.checkStayRules), and it is per
// PROPERTY. A rule for "a unit" therefore applies to the whole property that
// unit belongs to. A property at the default of 1 night has no rule.

const ALL_RULE_ID = 'all';

function bookingRulesPayload(properties) {
  const withMin = properties.map((p) => ({ p, min: (p.rules && p.rules.minNights) || 1 }));
  if (withMin.length === 0) return [];
  const first = withMin[0].min;
  if (first > 1 && withMin.every((x) => x.min === first)) {
    return [{ id: ALL_RULE_ID, applyToAll: true, minNights: first }];
  }
  return withMin.filter((x) => x.min > 1).map(({ p, min }) => ({
    id: String(p._id),
    applyToAll: false,
    unitId: String(p._id),
    propertyId: String(p._id),
    unitName: p.titleAr || p.title,
    minNights: min,
  }));
}

const hostProperties = (user) => Property.find({ host: user._id, isDeleted: { $ne: true } })
  .select('_id title titleAr rules')
  .sort({ createdAt: -1 });

/** Resolve a rule target (unit id or property id) to a property the caller owns. */
async function ruleTargetProperty(id, user) {
  if (!isId(id)) return { status: 400, message: 'Invalid unit ID' };
  const unit = await Unit.findOne({ _id: id, isDeleted: { $ne: true } }).select('property');
  return loadOwnedProperty(String(unit ? unit.property : id), user);
}

// GET /host/booking-settings
router.get('/booking-settings', wrap(async (req, res) => {
  res.json({ success: true, data: bookingRulesPayload(await hostProperties(req.user)) });
}));

// POST /host/booking-settings  { applyToAll, minNights, unitId? }
router.post('/booking-settings', wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const minNights = toNumber(body.minNights);
  if (!Number.isInteger(minNights) || minNights < 1 || minNights > 365) {
    return fail(res, 400, 'minNights must be a whole number between 1 and 365');
  }
  const applyToAll = toBool(body.applyToAll) === true;

  let targets;
  if (applyToAll) {
    targets = await hostProperties(req.user);
    if (targets.length === 0) return fail(res, 400, 'You have no properties to apply this rule to');
  } else {
    if (!body.unitId) return fail(res, 400, 'unitId is required when applyToAll is false');
    const owned = await ruleTargetProperty(body.unitId, req.user);
    if (!owned.property) return fail(res, owned.status, owned.message);
    targets = [owned.property];
  }

  // A minimum above the property's maximum stay would make it unbookable.
  const tooShort = targets.find((p) => p.rules && p.rules.maxNights && minNights > p.rules.maxNights);
  if (tooShort) {
    return fail(res, 400, `Minimum nights cannot exceed the maximum stay (${tooShort.rules.maxNights} nights) of "${tooShort.titleAr || tooShort.title}"`);
  }

  await Property.updateMany(
    { _id: { $in: targets.map((p) => p._id) } },
    { $set: { 'rules.minNights': minNights } }
  );

  const rule = applyToAll
    ? { id: ALL_RULE_ID, applyToAll: true, minNights }
    : {
      id: String(targets[0]._id),
      applyToAll: false,
      unitId: String(targets[0]._id),
      propertyId: String(targets[0]._id),
      unitName: targets[0].titleAr || targets[0].title,
      minNights,
    };
  res.status(201).json({ success: true, data: rule });
}));

// DELETE /host/booking-settings/:id   (id = 'all', or the rule's property/unit id)
router.delete('/booking-settings/:id', wrap(async (req, res) => {
  let ids;
  if (req.params.id === ALL_RULE_ID) {
    ids = (await hostProperties(req.user)).map((p) => p._id);
  } else {
    const owned = await ruleTargetProperty(req.params.id, req.user);
    if (!owned.property) return fail(res, owned.status, owned.status === 400 ? 'Invalid rule ID' : owned.message);
    if (((owned.property.rules && owned.property.rules.minNights) || 1) <= 1) {
      return fail(res, 404, 'Rule not found');
    }
    ids = [owned.property._id];
  }

  await Property.updateMany({ _id: { $in: ids } }, { $set: { 'rules.minNights': 1 } });
  res.json({ success: true, message: 'Rule removed' });
}));

// ─── Discount codes ──────────────────────────────────────────────────────────
// Not backed yet, on purpose. The Coupon model has no owner (a code created
// here would be platform-wide, valid on every host's listings) and booking
// pricing never applies a coupon, so a host-created code would do nothing
// for guests. Until coupons are host-scoped and applied at checkout, the
// list is empty and creation is refused rather than faked.

router.get('/discount-codes', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/discount-codes', (req, res) => {
  fail(res, 501, 'Discount codes are not available yet', { code: 'DISCOUNT_CODES_UNAVAILABLE' });
});

router.put('/discount-codes/:id/toggle', (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid discount code ID');
  fail(res, 404, 'Discount code not found');
});

module.exports = router;
