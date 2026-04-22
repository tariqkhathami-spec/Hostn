const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { sanitizeHtml } = require('../utils/sanitize');

// @desc    Create a support ticket
// @route   POST /api/support
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { subject, category, message, priority, relatedBooking, relatedProperty } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject, category, and message are required',
      });
    }

    const sanitizedMessage = sanitizeHtml(message);
    const sanitizedSubject = sanitizeHtml(subject);

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject: sanitizedSubject,
      category,
      priority: priority || 'medium',
      relatedBooking: relatedBooking || null,
      relatedProperty: relatedProperty || null,
      messages: [
        {
          sender: req.user._id,
          senderRole: 'user',
          content: sanitizedMessage,
        },
      ],
    });

    await ticket.populate('user', 'name email avatar role');

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to create support ticket' });
  }
};

// @desc    Get user's support tickets
// @route   GET /api/support
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };

    if (status) query.status = status;

    const tickets = await SupportTicket.find(query)
      .populate('assignedTo', 'name avatar')
      .sort({ updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(query);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

// @desc    Get single ticket
// @route   GET /api/support/:id
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email avatar role')
      .populate('assignedTo', 'name avatar')
      .populate('relatedBooking', 'checkIn checkOut status pricing.total')
      .populate('relatedProperty', 'title location.city')
      .populate('messages.sender', 'name avatar role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Only ticket owner or admin can view
    if (
      ticket.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

// @desc    Reply to a ticket
// @route   POST /api/support/:id/reply
// @access  Private
exports.replyToTicket = async (req, res) => {
  try {
    const message = sanitizeHtml(req.body.message);

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = ticket.user.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot reply to closed ticket' });
    }

    const sanitizedMessage = message.replace(/<[^>]*>/g, '').trim();

    ticket.messages.push({
      sender: req.user._id,
      senderRole: isAdmin ? 'admin' : 'user',
      content: sanitizedMessage,
    });

    if (isAdmin && ticket.status === 'open') {
      ticket.status = 'in_progress';
      if (!ticket.assignedTo) {
        ticket.assignedTo = req.user._id;
      }
    }

    await ticket.save();

    // Notify the other party
    const notifyUser = isAdmin ? ticket.user : null;
    if (notifyUser) {
      await Notification.createNotification({
        user: notifyUser,
        userType: ticket.userType,
        type: 'support_reply',
        title: 'Support Reply',
        message: `Your support ticket "${ticket.subject}" has a new reply`,
        data: { ticketId: ticket._id },
      });
    }

    await ticket.populate('messages.sender', 'name avatar role');

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to reply to ticket' });
  }
};

// ======= ADMIN ENDPOINTS =======

// @desc    Get all support tickets (admin)
// @route   GET /api/support/admin/all
// @access  Private/Admin
exports.getAllTickets = async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const tickets = await SupportTicket.find(query)
      .populate('user', 'name email avatar role')
      .populate('assignedTo', 'name avatar')
      .sort({ priority: -1, updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(query);

    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: tickets,
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

// @desc    Update ticket status (admin)
// @route   PUT /api/support/admin/:id/status
// @access  Private/Admin
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    if (status === 'closed') ticket.closedAt = new Date();
    if (status === 'in_progress' && !ticket.assignedTo) {
      ticket.assignedTo = req.user._id;
    }

    await ticket.save();

    await Notification.createNotification({
      user: ticket.user,
      userType: ticket.userType,
      type: 'support_reply',
      title: 'Ticket Updated',
      message: `Your ticket "${ticket.subject}" status changed to ${status.replace('_', ' ')}`,
      data: { ticketId: ticket._id },
    });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
};

// @desc    Assign ticket to admin
// @route   PUT /api/support/admin/:id/assign
// @access  Private/Admin
exports.assignTicket = async (req, res) => {
  try {
    const { adminId } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.assignedTo = adminId || req.user._id;
    if (ticket.status === 'open') ticket.status = 'in_progress';
    await ticket.save();

    await ticket.populate('assignedTo', 'name avatar');

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to assign ticket' });
  }
};
