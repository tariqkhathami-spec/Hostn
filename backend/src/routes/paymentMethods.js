const express = require('express');
const router = express.Router();
const {
  getSavedMethods,
  addMethod,
  deleteMethod,
  setDefault,
} = require('../controllers/paymentMethodController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getSavedMethods);
router.post('/', protect, addMethod);
router.delete('/:id', protect, deleteMethod);
router.put('/:id/default', protect, setDefault);

module.exports = router;
