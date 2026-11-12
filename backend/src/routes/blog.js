const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPost,
  getCategories,
  createPost,
  updatePost,
  deletePost,
  createCategory,
  deleteCategory,
} = require('../controllers/blogController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes
// optionalAuth: an admin also sees drafts in this list.
router.get('/posts', optionalAuth, getPosts);
router.get('/posts/:slug', optionalAuth, getPost);
router.get('/categories', getCategories);

// Admin routes
router.post('/posts', protect, authorize('admin'), createPost);
router.put('/posts/:id', protect, authorize('admin'), updatePost);
router.delete('/posts/:id', protect, authorize('admin'), deletePost);
router.post('/categories', protect, authorize('admin'), createCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
