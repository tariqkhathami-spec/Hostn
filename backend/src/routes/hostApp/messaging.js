// Host mobile app compatibility routes (messaging). Mounted under /api/v1/host
// after protect + authorize('host', 'admin') — see routes/host.js.
//
// Covers: conversations, support chat, notifications, reviews, complaints and
// profile. Wherever a website controller already implements the business
// rules (sending a message, replying to a review, filing a report, marking a
// notification read) the request is handed to that controller and only the
// response is reshaped into what the app screens read.
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const SupportTicket = require('../../models/SupportTicket');
const Notification = require('../../models/Notification');
const Review = require('../../models/Review');
const Report = require('../../models/Report');
const Property = require('../../models/Property');
const Booking = require('../../models/Booking');
const Host = require('../../models/Host');
require('../../models/Unit');

const messageController = require('../../controllers/messageController');
const notificationController = require('../../controllers/notificationController');
const reviewController = require('../../controllers/reviewController');
const reportController = require('../../controllers/reportController');
const { sanitizeHtml } = require('../../utils/sanitize');

const TYPE_CAPITALIZED = { guest: 'Guest', host: 'Host', admin: 'Admin' };

// ── Helpers ──────────────────────────────────────────────────────────────

const isId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

/** 404 for a malformed id, the same answer as for an id that does not exist. */
const idParam = (name, label) => (req, res, next) => {
  if (!isId(req.params[name])) {
    return res.status(404).json({ success: false, message: `${label} not found` });
  }
  next();
};

const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);
const iso = (d) => (d ? new Date(d).toISOString() : null);
const str = (v) => (v === undefined || v === null ? '' : String(v));

/**
 * Reshape the JSON body of a successful response produced by an existing
 * controller. Error responses pass through untouched.
 */
function reshape(res, transform) {
  const original = res.json.bind(res);
  res.json = (body) => {
    if (body && body.success === true && res.statusCode < 400) {
      body = transform(body);
    }
    return original(body);
  };
}

/** Same request, different query/body/params (works on Express 4 and 5). */
function derive(req, overrides) {
  const props = {};
  Object.keys(overrides).forEach((k) => {
    props[k] = { value: overrides[k], writable: true, enumerable: true, configurable: true };
  });
  return Object.create(req, props);
}

const positiveInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Same budget as the website's /api/v1/messages limiter (server.js).
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many messages sent, please slow down',
});

/** YYYY-MM-DD of "today" in Saudi time (UTC+3, no DST). */
const todayKsa = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dayOf = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// ── Conversations ────────────────────────────────────────────────────────

function mapMessage(message, userId, otherId) {
  const m = plain(message);
  const senderId = str(m.sender && m.sender._id ? m.sender._id : m.sender);
  const mine = senderId === userId;
  let sender;
  if (m.messageType === 'system') sender = 'system';
  else if (mine) sender = 'host';
  else if (m.senderType === 'Admin') sender = 'support';
  else sender = 'guest';

  const out = {
    id: str(m._id),
    conversationId: str(m.conversation),
    text: m.content,
    sender,
    timestamp: iso(m.createdAt),
    messageType: m.messageType,
  };
  if (mine) {
    const readByOther = (m.readBy || []).some((r) => str(r.user) === otherId);
    out.status = readByOther ? 'read' : 'sent';
  }
  return out;
}

function mapConversation(conv, userId) {
  const other = (conv.participants || []).find((p) => str(p.user && p.user._id ? p.user._id : p.user) !== userId);
  const otherUser = other && other.user && other.user._id ? other.user : null;
  const booking = conv.booking && conv.booking._id ? conv.booking : null;
  const property = conv.property && conv.property._id ? conv.property : null;
  const unit = booking && booking.unit && booking.unit._id ? booking.unit : null;
  const propertyName = property ? property.titleAr || property.title || '' : '';
  const unitName = unit ? unit.nameAr || unit.nameEn || '' : '';
  const image =
    (unit && unit.images && (unit.images.find((i) => i.isPrimary) || unit.images[0])) ||
    (property && property.images && (property.images.find((i) => i.isPrimary) || property.images[0])) ||
    null;
  const unread = (conv.unreadCount && conv.unreadCount.get(userId)) || 0;

  return {
    id: str(conv._id),
    guestId: other ? str(otherUser ? otherUser._id : other.user) : '',
    guestName: otherUser ? otherUser.name || '' : '',
    guestAvatar: otherUser ? otherUser.avatar || null : null,
    participantType: other ? other.userType : null,
    unitId: unit ? str(unit._id) : '',
    propertyId: property ? str(property._id) : '',
    unitName: unitName || propertyName,
    propertyName,
    unitThumbnail: image ? image.url : undefined,
    lastMessage: (conv.lastMessage && conv.lastMessage.content) || '',
    lastMessageDate: iso((conv.lastMessage && conv.lastMessage.content && conv.lastMessage.timestamp) || conv.updatedAt),
    isUnread: unread > 0,
    unreadCount: unread,
    isBlocked: Boolean(conv.isBlocked),
    bookingStatus: booking ? booking.status : undefined,
    reservationId: booking ? str(booking._id) : undefined,
    checkIn: booking ? iso(booking.checkIn) : undefined,
    checkOut: booking ? iso(booking.checkOut) : undefined,
  };
}

const CONVERSATION_FILTERS = {
  confirmed: (c) => c.bookingStatus === 'confirmed',
  check_in_today: (c, today) => c.bookingStatus === 'confirmed' && dayOf(c.checkIn) === today,
  check_out_today: (c, today) =>
    ['confirmed', 'completed'].includes(c.bookingStatus) && dayOf(c.checkOut) === today,
  in_hosting: (c, today) =>
    c.bookingStatus === 'confirmed' && dayOf(c.checkIn) <= today && today < dayOf(c.checkOut),
  inquiries: (c) => !c.reservationId,
};

// GET /host/conversations?status=&search=
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase().slice(0, 100) : '';

    if (status && status !== 'all' && !CONVERSATION_FILTERS[status]) {
      return res.status(400).json({ success: false, message: 'Invalid status filter' });
    }

    const conversations = await Conversation.find({ 'participants.user': req.user._id })
      .populate('participants.user', 'name avatar')
      .populate({
        path: 'booking',
        select: 'checkIn checkOut status unit reference',
        populate: { path: 'unit', select: 'nameAr nameEn images' },
      })
      .populate('property', 'title titleAr images')
      .sort({ updatedAt: -1 })
      .limit(200);

    const today = todayKsa();
    let data = conversations.map((c) => mapConversation(c, userId));
    if (status && status !== 'all') data = data.filter((c) => CONVERSATION_FILTERS[status](c, today));
    if (search) {
      data = data.filter((c) =>
        [c.guestName, c.unitName, c.propertyName, c.lastMessage].some((v) => str(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/** Loads the conversation and proves the caller is one of its participants. */
async function loadOwnConversation(req, res) {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return null;
  }
  const userId = req.user._id.toString();
  if (!conversation.participants.some((p) => p.user.toString() === userId)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return null;
  }
  return conversation;
}

const otherParticipantId = (conversation, userId) => {
  const other = conversation.participants.find((p) => p.user.toString() !== userId);
  return other ? other.user.toString() : '';
};

// GET /host/conversations/:id/messages?page=
// Newest first (the chat screen renders an inverted list). Reading a page
// marks the conversation read, exactly like the website endpoint.
router.get('/conversations/:conversationId/messages', idParam('conversationId', 'Conversation'), async (req, res, next) => {
  try {
    const conversation = await loadOwnConversation(req, res);
    if (!conversation) return;
    const userId = req.user._id.toString();
    const otherId = otherParticipantId(conversation, userId);

    reshape(res, (body) => ({
      ...body,
      data: (body.data || []).map((m) => mapMessage(m, userId, otherId)).reverse(),
    }));
    const query = { page: positiveInt(req.query.page, 1), limit: 50 };
    return messageController.getMessages(derive(req, { query }), res, next);
  } catch (error) {
    next(error);
  }
});

// POST /host/conversations/:conversationId/messages  { text }
// Delegates to the website's sendMessage: blocked-conversation check,
// sanitising, contact-info filter and the recipient's notification all apply.
router.post(
  '/conversations/:conversationId/messages',
  sendLimiter,
  idParam('conversationId', 'Conversation'),
  async (req, res, next) => {
    try {
      const text = req.body ? req.body.text : undefined;
      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
      }
      const conversation = await loadOwnConversation(req, res);
      if (!conversation) return;
      const userId = req.user._id.toString();
      const otherId = otherParticipantId(conversation, userId);

      reshape(res, (body) => ({ ...body, data: mapMessage(body.data, userId, otherId) }));
      return messageController.sendMessage(derive(req, { body: { content: text } }), res, next);
    } catch (error) {
      next(error);
    }
  }
);

// POST /host/conversations/:id/read
router.post('/conversations/:conversationId/read', idParam('conversationId', 'Conversation'), async (req, res, next) => {
  try {
    const conversation = await loadOwnConversation(req, res);
    if (!conversation) return;
    const userId = req.user._id.toString();

    conversation.unreadCount.set(userId, 0);
    await conversation.save();
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, 'readBy.user': { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, userType: TYPE_CAPITALIZED[req.user.userType], readAt: new Date() } } }
    );

    res.json({ success: true, data: { id: conversation._id.toString(), isUnread: false, unreadCount: 0 } });
  } catch (error) {
    next(error);
  }
});

// ── Support chat (backed by the host's support ticket thread) ─────────────
// The thread is the host's most recent ticket that is not closed, so the
// messages show up on the admin support page and admin replies come back.

const SUPPORT_CHAT_SUBJECT = 'Host app support chat';

const findSupportThread = (userId) =>
  SupportTicket.findOne({ user: userId, status: { $ne: 'closed' } }).sort({ updatedAt: -1 });

function mapTicketMessage(ticket, message) {
  const fromSupport = message.senderRole === 'admin';
  const out = {
    id: str(message._id),
    conversationId: 'support',
    ticketId: str(ticket._id),
    text: message.content,
    sender: fromSupport ? 'support' : 'host',
    timestamp: iso(message.createdAt),
  };
  if (!fromSupport) out.status = 'sent';
  return out;
}

// GET /host/support/chat — newest first (inverted list)
router.get('/support/chat', async (req, res, next) => {
  try {
    const ticket = await findSupportThread(req.user._id);
    const data = ticket ? ticket.messages.map((m) => mapTicketMessage(ticket, m)).reverse() : [];
    res.json({
      success: true,
      data,
      ticket: ticket ? { id: ticket._id.toString(), status: ticket.status, subject: ticket.subject } : null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /host/support/chat/messages  { text }
router.post('/support/chat/messages', sendLimiter, async (req, res, next) => {
  try {
    const raw = req.body ? req.body.text : undefined;
    if (typeof raw !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const content = str(sanitizeHtml(raw)).replace(/<[^>]*>/g, '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    if (content.length > 5000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 5000 chars)' });
    }

    const userType = TYPE_CAPITALIZED[req.user.userType];
    const entry = { sender: req.user._id, senderType: userType, senderRole: 'user', content };

    let ticket = await findSupportThread(req.user._id);
    if (ticket) {
      ticket.messages.push(entry);
      // A new message on a resolved thread needs an agent again.
      if (ticket.status === 'resolved') {
        ticket.status = 'open';
        ticket.resolvedAt = null;
      }
      await ticket.save();
    } else {
      ticket = await SupportTicket.create({
        user: req.user._id,
        userType,
        subject: SUPPORT_CHAT_SUBJECT,
        category: 'other',
        messages: [entry],
      });
    }

    const saved = ticket.messages[ticket.messages.length - 1];
    res.status(201).json({ success: true, data: mapTicketMessage(ticket, saved) });
  } catch (error) {
    next(error);
  }
});

// GET /host/support/info
// Only contact details that are already published on the website's contact
// page (frontend/src/app/contact/page.tsx). Working hours are not defined
// anywhere in the codebase, so they are returned only if configured.
router.get('/support/info', (req, res) => {
  const data = {
    phone: process.env.SUPPORT_PHONE || '0500407888',
    email: process.env.SUPPORT_EMAIL || 'hello@hostn.co',
  };
  if (process.env.SUPPORT_HOURS_START) data.hoursStart = process.env.SUPPORT_HOURS_START;
  if (process.env.SUPPORT_HOURS_END) data.hoursEnd = process.env.SUPPORT_HOURS_END;
  if (process.env.SUPPORT_DAYS) data.days = process.env.SUPPORT_DAYS;
  res.json({ success: true, data });
});

// ── Notifications ────────────────────────────────────────────────────────

function mapNotification(notification) {
  const n = plain(notification);
  const data = n.data || {};
  return {
    id: str(n._id),
    type: n.type,
    title: n.title,
    body: n.message,
    bookingId: data.bookingId ? str(data.bookingId) : undefined,
    conversationId: data.conversationId ? str(data.conversationId) : undefined,
    reviewId: data.reviewId ? str(data.reviewId) : undefined,
    read: Boolean(n.isRead),
    createdAt: iso(n.createdAt),
  };
}

// GET /host/notifications/unread-count → { data: { count } }
router.get('/notifications/unread-count', notificationController.getUnreadCount);

// PATCH /host/notifications/:id/read
router.patch('/notifications/:id/read', idParam('id', 'Notification'), (req, res, next) => {
  reshape(res, (body) => ({ ...body, data: mapNotification(body.data) }));
  return notificationController.markAsRead(req, res, next);
});

// GET /host/notifications?page=&filter=   (host app)
// The app pages through the host's stored notifications — the same records
// unread-count and mark-read work on. The website dashboard calls this path
// with no parameters and keeps its existing "needs attention" summary.
const NOTIFICATION_FILTERS = ['check_in', 'check_out', 'booking_confirmed'];
router.get('/notifications', async (req, res, next) => {
  if (req.query.page === undefined && req.query.filter === undefined) return next();
  try {
    const page = positiveInt(req.query.page, 1);
    const limit = 20;
    const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
    if (filter && filter !== 'all' && !NOTIFICATION_FILTERS.includes(filter)) {
      return res.status(400).json({ success: false, message: 'Invalid notification filter' });
    }

    const query = { user: req.user._id };
    if (filter === 'booking_confirmed') {
      query.type = 'booking_confirmed';
    } else if (filter === 'check_in' || filter === 'check_out') {
      // Notifications about a booking of this host that starts / ends today.
      const start = new Date(`${todayKsa()}T00:00:00.000Z`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const propertyIds = await Property.find({ host: req.user._id }).distinct('_id');
      const field = filter === 'check_in' ? 'checkIn' : 'checkOut';
      const bookingIds = await Booking.find({
        property: { $in: propertyIds },
        status: { $in: ['confirmed', 'completed'] },
        [field]: { $gte: start, $lt: end },
      }).distinct('_id');
      query['data.bookingId'] = { $in: bookingIds };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications.map(mapNotification),
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ── Reviews ──────────────────────────────────────────────────────────────
// The Review model scores cleanliness / accuracy / communication / location /
// value. The app shows cleanliness / condition / information / service:
//   information ← accuracy, service ← communication, condition ← value.
// The original five scores are returned as well.

const round1 = (n) => Math.round(n * 10) / 10;

function appReviewFields(review) {
  const r = plain(review);
  const ratings = r.ratings || {};
  const guest = r.guest && r.guest._id ? r.guest : null;
  const property = r.property && r.property._id ? r.property : null;
  const num = (v) => (typeof v === 'number' ? v : null);
  return {
    id: str(r._id),
    guestName: guest ? guest.name || '' : '',
    guestAvatar: guest ? guest.avatar || undefined : undefined,
    bookingId: r.booking ? str(r.booking) : '',
    unitName: property ? property.titleAr || property.title || '' : '',
    overallRating: num(ratings.overall) ?? 0,
    cleanliness: num(ratings.cleanliness),
    condition: num(ratings.value),
    information: num(ratings.accuracy),
    service: num(ratings.communication),
    hostReply: (r.hostResponse && r.hostResponse.comment) || undefined,
    hostReplyDate: r.hostResponse && r.hostResponse.respondedAt ? iso(r.hostResponse.respondedAt) : undefined,
  };
}

// GET /host/reviews/summary
router.get('/reviews/summary', async (req, res, next) => {
  try {
    const propertyIds = await Property.find({ host: req.user._id, isDeleted: { $ne: true } }).distinct('_id');
    const reviews = await Review.find({ property: { $in: propertyIds } }).select('ratings').lean();

    const average = (key) => {
      const values = reviews.map((r) => r.ratings && r.ratings[key]).filter((v) => typeof v === 'number');
      return values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    };
    const accuracy = average('accuracy');
    const communication = average('communication');
    const value = average('value');

    res.json({
      success: true,
      data: {
        overall: average('overall'),
        totalCount: reviews.length,
        cleanliness: average('cleanliness'),
        condition: value,
        information: accuracy,
        service: communication,
        accuracy,
        communication,
        location: average('location'),
        value,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /host/reviews — handled by hostController.getHostReviews (routes/host.js).
// The fields the app's review screens read are added to each review; nothing
// the website reads is removed or changed.
router.get('/reviews', (req, res, next) => {
  reshape(res, (body) => ({
    ...body,
    data: (body.data || []).map((review) => ({ ...plain(review), ...appReviewFields(review) })),
    meta: body.pagination
      ? { currentPage: body.pagination.page, totalPages: body.pagination.pages }
      : undefined,
  }));
  next();
});

// POST /host/reviews/:reviewId/reply  { reply }
// Delegates to reviewController.respondToReview, which only lets the host
// who owns the reviewed property answer.
router.post('/reviews/:reviewId/reply', idParam('reviewId', 'Review'), async (req, res, next) => {
  try {
    const raw = req.body ? req.body.reply : undefined;
    if (typeof raw !== 'string') {
      return res.status(400).json({ success: false, message: 'Reply is required' });
    }
    const reply = str(sanitizeHtml(raw)).trim();
    if (!reply) {
      return res.status(400).json({ success: false, message: 'Reply is required' });
    }
    if (reply.length > 1000) {
      return res.status(400).json({ success: false, message: 'Reply too long (max 1000 chars)' });
    }

    // respondToReview assumes both exist; answer 404 instead of crashing.
    const review = await Review.findById(req.params.reviewId).select('property');
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    const property = await Property.findById(review.property).select('host');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    reshape(res, (body) => {
      const saved = plain(body.data);
      return {
        ...body,
        data: { ...appReviewFields(saved), comment: saved.comment, createdAt: iso(saved.createdAt) },
      };
    });
    return reviewController.respondToReview(
      derive(req, { params: { ...req.params, id: req.params.reviewId }, body: { comment: reply } }),
      res,
      next
    );
  } catch (error) {
    next(error);
  }
});

// ── Complaints (backed by the Report model: reports this host filed) ──────

const REPORT_REASON_AR = {
  inappropriate_content: 'محتوى غير لائق',
  spam: 'رسائل مزعجة',
  harassment: 'مضايقة',
  fraud: 'احتيال',
  safety_concern: 'مخاوف تتعلق بالسلامة',
  misleading_listing: 'إعلان مضلل',
  discrimination: 'تمييز',
  property_damage: 'أضرار في العقار',
  policy_violation: 'مخالفة السياسات',
  other: 'أخرى',
};
const REPORT_TARGET_TYPES = ['property', 'user', 'review'];

function mapComplaint(report) {
  const r = plain(report);
  return {
    id: str(r._id),
    title: REPORT_REASON_AR[r.reason] || r.reason,
    reason: r.reason,
    targetType: r.targetType,
    targetId: str(r.targetId),
    description: r.description,
    status: r.status,
    actionTaken: r.actionTaken,
    relatedBooking: r.relatedBooking ? str(r.relatedBooking) : null,
    createdAt: iso(r.createdAt),
  };
}

// GET /host/complaints
router.get('/complaints', async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: reports.map(mapComplaint) });
  } catch (error) {
    next(error);
  }
});

// POST /host/complaints  { targetType, targetId, reason, description, relatedBooking? }
// Delegates to reportController.createReport (target must exist, no
// self-report, no duplicate active report).
router.post('/complaints', sendLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { targetType, targetId, reason, relatedBooking } = body;
    const description = typeof body.description === 'string' ? str(sanitizeHtml(body.description)).trim() : '';

    if (!REPORT_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ success: false, message: 'targetType must be property, user or review' });
    }
    if (!isId(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid targetId' });
    }
    if (!Object.prototype.hasOwnProperty.call(REPORT_REASON_AR, reason)) {
      return res.status(400).json({ success: false, message: 'Invalid reason' });
    }
    if (!description) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }
    if (description.length > 2000) {
      return res.status(400).json({ success: false, message: 'Description cannot exceed 2000 characters' });
    }

    const clean = { targetType, targetId, reason, description };
    if (relatedBooking !== undefined && relatedBooking !== null && relatedBooking !== '') {
      if (!isId(relatedBooking)) {
        return res.status(400).json({ success: false, message: 'Invalid relatedBooking' });
      }
      // A host may only attach a booking made on one of their own properties.
      const booking = await Booking.findById(relatedBooking).select('property');
      const owned = booking && (await Property.exists({ _id: booking.property, host: req.user._id }));
      if (!owned) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      clean.relatedBooking = relatedBooking;
    }

    reshape(res, (resBody) => ({ ...resBody, data: mapComplaint(resBody.data) }));
    return reportController.createReport(derive(req, { body: clean }), res, next);
  } catch (error) {
    next(error);
  }
});

// ── Profile ──────────────────────────────────────────────────────────────
// GET /host/profile already exists (hostController.getHostProfile).
// DELETE /host/account is intentionally not implemented here: the only
// account-deletion code on the server hard-deletes the user document and
// leaves the host's properties, bookings and payouts orphaned.

const profilePayload = (user) => ({
  name: user.name,
  email: user.email || '',
  phone: user.phone,
  avatar: user.avatar,
  nationalId: '',
});

const hostOnly = (req, res, next) => {
  if (req.user.userType !== 'host') {
    return res.status(403).json({ success: false, message: 'Only host accounts can edit the host profile' });
  }
  next();
};

// PATCH /host/profile  { name?, avatar? }
// Phone and email are sign-in identities and have their own verified flows.
router.patch('/profile', hostOnly, async (req, res, next) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? str(sanitizeHtml(body.name)).trim() : '';
      if (!name || name.length > 100) {
        return res.status(400).json({ success: false, message: 'Name must be 1-100 characters' });
      }
      updates.name = name;
    }
    if (body.avatar !== undefined) {
      const avatar = body.avatar;
      if (avatar !== null && avatar !== '' && !(typeof avatar === 'string' && avatar.length <= 2000 && /^https:\/\/\S+$/.test(avatar))) {
        return res.status(400).json({ success: false, message: 'Avatar must be an https URL' });
      }
      updates.avatar = avatar || null;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update (editable fields: name, avatar)' });
    }

    const user = await Host.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ success: true, data: profilePayload(user) });
  } catch (error) {
    next(error);
  }
});

// PUT /host/profile/email  { email, currentPassword? }
// Same rule as authController.linkEmail: a phone-only account may add an
// email freely, but replacing the email of an account that signs in with
// email + password requires the current password.
router.put('/profile/email', hostOnly, async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email' });
    }

    const current = await Host.findById(req.user._id).select('+password');
    if (!current) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (current.email === email) {
      return res.json({ success: true, data: profilePayload(current) });
    }

    if (current.email && current.password) {
      const { currentPassword } = body;
      if (typeof currentPassword !== 'string' || !currentPassword || !(await current.comparePassword(currentPassword))) {
        return res.status(403).json({
          success: false,
          code: 'CURRENT_PASSWORD_REQUIRED',
          message: 'Current password is required to change your email',
        });
      }
    }

    const taken = await Host.exists({ email, _id: { $ne: req.user._id } });
    if (taken) {
      return res.status(400).json({ success: false, message: 'Email already registered to another account' });
    }

    const user = await Host.findByIdAndUpdate(req.user._id, { $set: { email } }, { new: true, runValidators: true });
    res.json({ success: true, data: profilePayload(user) });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    next(error);
  }
});

// DELETE /host/account — same safe flow as DELETE /auth/account (refuses while
// bookings are open, unlists the host's properties, erases personal data).
router.delete('/account', require('../../controllers/authController').deleteAccount);

module.exports = router;
