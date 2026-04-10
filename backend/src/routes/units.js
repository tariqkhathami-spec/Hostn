const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams → access :propertyId from parent mount
const {
  createUnit,
  getUnits,
  getMyPropertyUnits,
  getUnit,
  updateUnit,
  deleteUnit,
  duplicateUnit,
  toggleUnitStatus,
} = require('../controllers/unitController');
const { protect, authorize } = require('../middleware/auth');
const { mongoIdParam } = require('../middleware/validate');

// ── Nested routes: /api/v1/properties/:propertyId/units ─────────────────────
router.get('/', getUnits);
router.get('/manage', protect, authorize('host', 'admin'), getMyPropertyUnits);
router.post('/', protect, authorize('host', 'admin'), createUnit);

// ── Direct routes: /api/v1/units/:id ────────────────────────────────────────
router.get('/:id', mongoIdParam(), getUnit);
router.put('/:id', protect, mongoIdParam(), updateUnit);
router.delete('/:id', protect, mongoIdParam(), deleteUnit);
router.post('/:id/duplicate', protect, mongoIdParam(), duplicateUnit);
router.patch('/:id/toggle', protect, mongoIdParam(), toggleUnitStatus);

module.exports = router;
