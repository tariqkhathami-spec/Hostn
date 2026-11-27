const express = require('express');
const { protect, authorize, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const c = require('../controllers/aiController');

const router = express.Router();

router.use(protect);

router.get('/status', c.getStatus);
router.post('/chat', c.chat);
router.get('/conversations', c.listConversations);
router.get('/conversations/:id', c.getConversation);
router.delete('/conversations/:id', c.deleteConversation);
router.post('/actions/:id/confirm', c.confirmAction);
router.post('/actions/:id/reject', c.rejectAction);

router.get('/admin/overview', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_DASHBOARD), c.getAdminOverview);
router.post('/admin/test', authorize('admin'), authorizePermission(PERMISSIONS.VIEW_DASHBOARD), c.testConnection);

module.exports = router;
