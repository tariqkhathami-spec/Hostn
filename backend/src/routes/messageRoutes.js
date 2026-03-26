const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  toggleBlock,
  getUnreadCount,
} = require('../controllers/messageController');

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.route('/conversations').get(getConversations).post(createConversation);
router.get('/conversations/:conversationId', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.put('/conversations/:conversationId/block', toggleBlock);

module.exports = router;
