const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  checkAvailability,
  getCities,
  getHomeFeed,
  getSuggestions,
  getPublicStats,
  getNearby,
  reverseGeocode,
} = require('../controllers/propertyController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  createPropertyRules,
  propertySearchRules,
  mongoIdParam,
} = require('../middleware/validate');

router.get('/', propertySearchRules, getProperties);
router.get('/home-feed', getHomeFeed);
router.get('/cities', getCities);
router.get('/suggestions', getSuggestions);
router.get('/stats/public', getPublicStats);
router.get('/nearby', getNearby);
router.get('/geocode/reverse', reverseGeocode);
router.get('/my-properties', protect, getMyProperties);
router.get('/:id', mongoIdParam(), optionalAuth, getProperty);
router.get('/:id/availability', mongoIdParam(), checkAvailability);
router.post('/', protect, authorize('host', 'admin'), createPropertyRules, createProperty);
router.put('/:id', protect, mongoIdParam(), updateProperty);
router.delete('/:id', protect, mongoIdParam(), deleteProperty);

module.exports = router;
