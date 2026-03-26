const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createReport,
  getMyReports,
  getAllReports,
  getReport,
  takeAction,
} = require('../controllers/reportController');

router.use(protect);

// User routes
router.post('/', createReport);
router.get('/my', getMyReports);

// Admin routes
router.get('/admin/all', authorize('admin'), getAllReports);
router.get('/admin/:id', authorize('admin'), getReport);
router.put('/admin/:id/action', authorize('admin'), takeAction);

module.exports = router;
