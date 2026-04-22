const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Guest = require('../models/Guest');
const Host = require('../models/Host');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const { sanitizeHtml } = require('../utils/sanitize');
const Notification = require('../models/Notification');

const TYPE_CAPITALIZED = { guest: 'Guest', host: 'Host', admin: 'Admin' };

/**
 * Look up a user across Guest/Host/Admin collections.
 * Returns { user, userType } or null.
 */
async function findUserAcrossCollections(id) {
  const [g, h, a] = await Promise.all([
    Guest.findById(id),
    Host.findById(id),
    Admin.findById(id),
  ]);
  if (g) return { user: g, userType: 'Guest' };
  if (h) return { user: h, userType: 'Host' };
  if (a) return { user: a, userType: 'Admin' };
  return null;
}

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({
      'participants.user': userId,
    })
      .populate('participants.user', 'name avatar')
      .populate('booking', 'checkIn checkOut status')
      .populate('property', 'title titleAr images location.city')
      .sort({ updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Conversation.countDocuments({
      'participants.user': userId,
    });

    const conversationsWithMeta = conversations.map((conv) => {
      const obj = conv.toObject();
      obj.unreadCount = conv.unreadCount.get(userId) || 0;
      obj.isArchived = conv.isArchived.get(userId) || false;
      obj.otherParticipant = (obj.participants || []).find(
        (p) => p.user?._id?.toString() !== userId && p.user?.toString() !== userId
      );
      return obj;
    });

    res.json({
      success: true,
      data: conversationsWithMeta,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

// @desc    Get or create conversation
// @route   POST /api/messages/conversations
// @access  Private
exports.createConversation = async (req, res) => {
  try {
    const { recipientId, bookingId, propertyId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient is required' });
    }

    if (recipientId === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    const recipientResult = await findUserAcrossCollections(recipientId);
    if (!recipientResult) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }
    const { user: recipient, userType: recipientType } = recipientResult;

    if (recipient.isSuspended) {
      return res.status(403).json({ success: false, message: 'This user is unavailable' });
    }

    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
    }

    const senderType = TYPE_CAPITALIZED[req.user.userType];
    const conversation = await Conversation.findOrCreate({
      participants: [
        { user: userId, userType: senderType },
        { user: recipientId, userType: recipientType },
      ],
      booking: bookingId || null,
      property: propertyId || null,
    });

    await conversation.populate('participants.user', 'name avatar');
    await conversation.populate('property', 'title titleAr images location.city');

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to create conversation' });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/messages/conversations/:conversationId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const participantIds = conversation.participants.map((p) => p.user.toString());
    if (!participantIds.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false,
    })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      conversation: conversationId,
      isDeleted: false,
    });

    // Mark messages as read
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    const senderType = TYPE_CAPITALIZED[req.user.userType];
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
      },
      {
        $push: { readBy: { user: userId, userType: senderType, readAt: new Date() } },
      }
    );

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// @desc    Send a message
// @route   POST /api/messages/conversations/:conversationId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const rawContent = req.body.content;
    const content = sanitizeHtml(rawContent);
    const userId = req.user._id.toString();

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 2000 chars)' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const participantIds = conversation.participants.map((p) => p.user.toString());
    if (!participantIds.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (conversation.isBlocked) {
      return res.status(403).json({ success: false, message: 'This conversation is blocked' });
    }

    // Sanitize content - strip HTML tags
    const sanitizedContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Filter restricted contact information
    const { filterContent, getViolationMessage } = require('../utils/contentFilter');
    const filterResult = filterContent(sanitizedContent);

    if (filterResult.hasViolation) {
      // Log the violation but still send the filtered version
      console.log(`[CHAT FILTER] User ${userId} attempted to share: ${filterResult.violations.join(', ')}`);
    }

    const senderType = TYPE_CAPITALIZED[req.user.userType];
    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      senderType,
      content: filterResult.hasViolation ? filterResult.filtered : sanitizedContent,
      messageType: 'text',
      ...(filterResult.hasViolation && {
        metadata: {
          filtered: true,
          filterReason: filterResult.violations.join(', '),
        },
      }),
    });

    await message.populate('sender', 'name avatar');

    // Send notification to other participant
    const otherParticipant = conversation.participants.find(
      (p) => p.user.toString() !== userId
    );

    if (otherParticipant) {
      await Notification.createNotification({
        user: otherParticipant.user,
        userType: otherParticipant.userType,
        type: 'new_message',
        title: 'New Message',
        message: `${req.user.name}: ${sanitizedContent.substring(0, 100)}`,
        data: { conversationId: conversation._id },
      });
    }

    res.status(201).json({
      success: true,
      data: message,
      ...(filterResult.hasViolation && {
        warning: getViolationMessage(filterResult.violations),
      }),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// @desc    Block/unblock a conversation
// @route   PUT /api/messages/conversations/:conversationId/block
// @access  Private
exports.toggleBlock = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const participantIds = conversation.participants.map((p) => p.user.toString());
    if (!participantIds.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (conversation.isBlocked && conversation.blockedBy?.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the blocker can unblock' });
    }

    const senderType = TYPE_CAPITALIZED[req.user.userType];
    conversation.isBlocked = !conversation.isBlocked;
    conversation.blockedBy = conversation.isBlocked ? userId : null;
    conversation.blockedByType = conversation.isBlocked ? senderType : null;
    await conversation.save();

    res.json({
      success: true,
      data: { isBlocked: conversation.isBlocked },
      message: conversation.isBlocked ? 'Conversation blocked' : 'Conversation unblocked',
    });
  } catch (error) {
    console.error('Error toggling block:', error);
    res.status(500).json({ success: false, message: 'Failed to update conversation' });
  }
};

// @desc    Get total unread message count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const conversations = await Conversation.find({
      'participants.user': userId,
    });

    let totalUnread = 0;
    conversations.forEach((conv) => {
      totalUnread += conv.unreadCount.get(userId) || 0;
    });

    res.json({ success: true, data: { unreadCount: totalUnread } });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};
