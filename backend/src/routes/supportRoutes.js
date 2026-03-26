const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
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
router.get('/admin/all', authorize('admin'), getAllTickets);
router.put('/admin/:id/status', authorize('admin'), updateTicketStatus);
router.put('/admin/:id/assign', authorize('admin'), assignTicket);

module.exports = router;
