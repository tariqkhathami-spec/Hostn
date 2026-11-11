// Account manager API — /api/v1/manager. See controllers/managerController.js.
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/managerController');

router.use(protect);
router.use(authorize('admin'));
// Only account managers: their data scope is "my hosts". Other admin roles
// use /admin/*, which has its own permission checks.
router.use((req, res, next) => {
  if (req.user.adminRole !== 'account_manager') {
    return res.status(403).json({ success: false, message: 'Account manager access only' });
  }
  next();
});

router.get('/overview', c.getOverview);
router.get('/hosts', c.getHosts);
router.get('/hosts/:id', c.getHost);
router.post('/properties/:id/moderate', c.moderateMyProperty);
router.put('/licenses/:unitId', c.reviewMyLicense);
router.get('/tickets/:id', c.getTicket);
router.post('/tickets/:id/reply', c.replyToTicket);
router.put('/tickets/:id/status', c.setTicketStatus);

module.exports = router;
