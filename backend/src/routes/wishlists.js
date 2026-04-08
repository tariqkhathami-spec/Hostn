const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getLists,
  getList,
  createList,
  updateList,
  deleteList,
  toggleProperty,
  moveProperty,
} = require('../controllers/wishlistController');

router.use(protect);

router.get('/', getLists);
router.post('/', createList);
router.put('/move', moveProperty);
router.get('/:listId', getList);
router.put('/:listId', updateList);
router.delete('/:listId', deleteList);
router.post('/:listId/properties/:propertyId', toggleProperty);

module.exports = router;
