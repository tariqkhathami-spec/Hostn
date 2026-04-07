const { body, query, param, validationResult } = require('express-validator');

// ── Shared middleware: run after validators, return first error ────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return res.status(400).json({ success: false, message: messages[0], errors: messages });
  }
  next();
};

// ── Sanitize regex-unsafe characters for search queries ───────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone too long'),
  body('role').optional().isIn(['guest', 'host']).withMessage('Role must be guest or host'),
  handleValidation,
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const updateProfileRules = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone too long'),
  body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
  handleValidation,
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  handleValidation,
];

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const createPropertyRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title too long'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 5000 }),
  body('type').isIn(['chalet', 'apartment', 'villa', 'studio', 'farm', 'camp', 'hotel']).withMessage('Invalid property type'),
  body('location.city').trim().notEmpty().withMessage('City is required'),
  body('pricing.perNight').isFloat({ min: 1 }).withMessage('Price per night must be positive'),
  body('capacity.maxGuests').isInt({ min: 1 }).withMessage('Max guests must be at least 1'),
  handleValidation,
];

const propertySearchRules = [
  query('city').optional().trim().customSanitizer(escapeRegex),
  query('search').optional().trim().isLength({ max: 200 }).withMessage('Search too long'),
  query('type').optional().isIn(['chalet', 'apartment', 'villa', 'studio', 'farm', 'camp', 'hotel', '']),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),
  query('guests').optional().isInt({ min: 1 }).withMessage('Guests must be at least 1'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  handleValidation,
];

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const createBookingRules = [
  body('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('checkIn').isISO8601().withMessage('Check-in must be a valid date'),
  body('checkOut').isISO8601().withMessage('Check-out must be a valid date'),
  body('guests.adults').isInt({ min: 1 }).withMessage('At least one adult required'),
  body('guests.children').optional().isInt({ min: 0 }),
  body('guests.infants').optional().isInt({ min: 0 }),
  body('specialRequests').optional().trim().isLength({ max: 500 }),
  handleValidation,
];

const holdBookingRules = [
  body('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('checkIn').isISO8601().withMessage('Check-in must be a valid date'),
  body('checkOut').isISO8601().withMessage('Check-out must be a valid date'),
  body('guests.adults').optional().isInt({ min: 1 }).withMessage('At least one adult required'),
  body('guests.children').optional().isInt({ min: 0 }),
  handleValidation,
];

const updateBookingStatusRules = [
  body('status').isIn(['confirmed', 'rejected', 'cancelled', 'completed']).withMessage('Invalid status'),
  handleValidation,
];

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const createReviewRules = [
  body('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('ratings.overall').isFloat({ min: 1, max: 10 }).withMessage('Overall rating must be 1-10'),
  body('ratings.cleanliness').optional().isFloat({ min: 1, max: 10 }),
  body('ratings.accuracy').optional().isFloat({ min: 1, max: 10 }),
  body('ratings.communication').optional().isFloat({ min: 1, max: 10 }),
  body('ratings.location').optional().isFloat({ min: 1, max: 10 }),
  body('ratings.value').optional().isFloat({ min: 1, max: 10 }),
  body('comment').trim().isLength({ min: 10, max: 2000 }).withMessage('Comment must be 10-2000 characters'),
  handleValidation,
];

const respondToReviewRules = [
  body('comment').trim().isLength({ min: 1, max: 500 }).withMessage('Response must be 1-500 characters'),
  handleValidation,
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOST VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const blockDatesRules = [
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('action').isIn(['block', 'unblock']).withMessage('Action must be block or unblock'),
  handleValidation,
];

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════════════════════

const mongoIdParam = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),
  handleValidation,
];

module.exports = {
  handleValidation,
  escapeRegex,
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  createPropertyRules,
  propertySearchRules,
  createBookingRules,
  holdBookingRules,
  updateBookingStatusRules,
  createReviewRules,
  respondToReviewRules,
  blockDatesRules,
  mongoIdParam,
};
