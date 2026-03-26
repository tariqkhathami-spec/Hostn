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
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');
const {
  createPropertyRules,
  propertySearchRules,
  mongoIdParam,
} = require('../middleware/validate');

router.get('/', propertySearchRules, getProperties);
router.get('/home-feed', getHomeFeed);
router.get('/cities', getCities);
router.get('/my-properties', protect, getMyProperties);
router.get('/:id', mongoIdParam(), getProperty);
router.get('/:id/availability', mongoIdParam(), checkAvailability);
router.post('/', protect, authorize('host', 'admin'), createPropertyRules, createProperty);
router.put('/:id', protect, mongoIdParam(), updateProperty);
router.delete('/:id', protect, mongoIdParam(), deleteProperty);

module.exports = router;
