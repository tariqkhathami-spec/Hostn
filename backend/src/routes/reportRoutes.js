const express = require('express');
const router = express.Router();
const { protect, authorize, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
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
router.get('/admin/all', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_REPORTS), getAllReports);
router.get('/admin/:id', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_REPORTS), getReport);
router.put('/admin/:id/action', authorize('admin'), authorizePermission(PERMISSIONS.MANAGE_REPORTS), takeAction);

module.exports = router;
