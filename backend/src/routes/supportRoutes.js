const express = require('express');
const router = express.Router();
const { protect, authorize, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const {
  createTicket,
  getMyTickets,
  getTicket,
  replyToTicket,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
} = require('../controllers/supportController');

router.use(protect);

// User routes
router.route('/').get(getMyTickets).post(createTicket);
router.get('/:id', getTicket);
router.post('/:id/reply', replyToTicket);

// Admin routes
router.get('/admin/all', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_SUPPORT), getAllTickets);
router.put('/admin/:id/status', authorize('admin'), authorizePermission(PERMISSIONS.MANAGE_SUPPORT), updateTicketStatus);
router.put('/admin/:id/assign', authorize('admin'), authorizePermission(PERMISSIONS.MANAGE_SUPPORT), assignTicket);

module.exports = router;
