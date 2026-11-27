/**
 * Admin tools. Every tool names the admin permission it needs; the registry
 * hides tools the admin's sub-role lacks and re-checks on every call.
 */
const Booking = require('../../../models/Booking');
const SupportTicket = require('../../../models/SupportTicket');
const Property = require('../../../models/Property');
const Guest = require('../../../models/Guest');
const Notification = require('../../../models/Notification');
const { PERMISSIONS } = require('../../../config/permissions');
const { sanitizeHtml } = require('../../../utils/sanitize');
const {
  isId, clampLimit, parseDate, day, cut, escapeRegex, normalizeReference, bookingView, ToolError,
} = require('./common');

const BOOKING_POPULATE = [
  { path: 'property', select: 'title titleAr' },
  { path: 'unit', select: 'nameAr nameEn cancellationPolicy' },
  { path: 'guest', select: 'name phone' },
];

const STATUS_AR = { open: 'مفتوح', in_progress: 'قيد المعالجة', resolved: 'تم الحل', closed: 'مغلق' };

function ticketSummary(t) {
  const first = t.messages && t.messages[0];
  const last = t.messages && t.messages[t.messages.length - 1];
  return {
    id: String(t._id),
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    from: t.userType,
    userName: t.user && t.user.name,
    createdAt: day(t.createdAt),
    updatedAt: day(t.updatedAt),
    messages: (t.messages || []).length,
    lastFrom: last ? last.senderRole : null,
    firstMessage: first ? cut(first.content, 400) : '',
    relatedBooking: t.relatedBooking ? String(t.relatedBooking) : null,
  };
}

async function findTicket(ticketId) {
  if (!isId(ticketId)) throw new ToolError('رقم التذكرة غير صالح');
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) throw new ToolError('التذكرة غير موجودة');
  return ticket;
}

module.exports = [
  {
    name: 'search_bookings',
    description: 'Search all bookings on the platform. Filter by booking reference (HB-XXXXXXXX), status, payment status, check-in date range, guest phone or name, or property name. Returns up to 25 compact rows, newest first.',
    permission: PERMISSIONS.VIEW_BOOKINGS,
    input_schema: {
      type: 'object',
      properties: {
        reference: { type: 'string', description: 'Booking reference, e.g. HB-7K2M9QXA' },
        status: { type: 'string', enum: ['held', 'pending', 'confirmed', 'cancelled', 'completed', 'rejected'] },
        paymentStatus: { type: 'string', enum: ['unpaid', 'paid', 'refunded'] },
        checkInFrom: { type: 'string', description: 'ISO date, inclusive' },
        checkInTo: { type: 'string', description: 'ISO date, inclusive' },
        guest: { type: 'string', description: 'Guest phone number or part of the name' },
        property: { type: 'string', description: 'Part of the property title (Arabic or English)' },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
    async run(input) {
      const q = {};
      if (input.reference) q.reference = normalizeReference(input.reference);
      if (input.status) q.status = input.status;
      if (input.paymentStatus) q.paymentStatus = input.paymentStatus;
      const from = parseDate(input.checkInFrom);
      const to = parseDate(input.checkInTo);
      if (from || to) {
        q.checkIn = {};
        if (from) q.checkIn.$gte = from;
        if (to) q.checkIn.$lte = new Date(to.getTime() + 24 * 3600 * 1000 - 1);
      }
      if (input.guest) {
        const term = String(input.guest).trim();
        const rx = new RegExp(escapeRegex(term), 'i');
        const guests = await Guest.find({ $or: [{ phone: rx }, { name: rx }] }).select('_id').limit(50).lean();
        q.guest = { $in: guests.map((g) => g._id) };
      }
      if (input.property) {
        const rx = new RegExp(escapeRegex(String(input.property).trim()), 'i');
        const props = await Property.find({ $or: [{ title: rx }, { titleAr: rx }] }).select('_id').limit(50).lean();
        q.property = { $in: props.map((p) => p._id) };
      }
      const limit = clampLimit(input.limit, 10, 25);
      const [rows, total] = await Promise.all([
        Booking.find(q).populate(BOOKING_POPULATE).sort('-createdAt').limit(limit).lean(),
        Booking.countDocuments(q),
      ]);
      return { total, shown: rows.length, bookings: rows.map((b) => bookingView(b, 'admin')) };
    },
  },

  {
    name: 'get_booking',
    description: 'Full details of one booking by id or reference, including pricing, the unit cancellation policy and any support tickets linked to it.',
    permission: PERMISSIONS.VIEW_BOOKINGS,
    input_schema: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        reference: { type: 'string' },
      },
      additionalProperties: false,
    },
    async run(input) {
      let booking = null;
      if (input.bookingId && isId(input.bookingId)) {
        booking = await Booking.findById(input.bookingId).populate(BOOKING_POPULATE).lean();
      } else if (input.reference) {
        booking = await Booking.findOne({ reference: normalizeReference(input.reference) }).populate(BOOKING_POPULATE).lean();
      }
      if (!booking) throw new ToolError('الحجز غير موجود');
      const tickets = await SupportTicket.find({ relatedBooking: booking._id })
        .select('subject status category priority createdAt').lean();
      return {
        ...bookingView(booking, 'admin'),
        pricing: booking.pricing,
        cancellationPolicy: booking.unit && booking.unit.cancellationPolicy,
        specialRequests: booking.specialRequests,
        confirmedAt: day(booking.confirmedAt),
        cancelledAt: day(booking.cancelledAt),
        tickets: tickets.map((t) => ({ id: String(t._id), subject: t.subject, status: t.status, category: t.category, priority: t.priority })),
      };
    },
  },

  {
    name: 'platform_overview',
    description: 'Numbers for the last N days: bookings by status, paid revenue, support tickets by status/category/priority, and listings waiting for approval. Use for "how are we doing" or daily summaries.',
    permission: PERMISSIONS.VIEW_DASHBOARD,
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 1, maximum: 365 } },
      additionalProperties: false,
    },
    async run(input) {
      const days = clampLimit(input.days, 7, 365);
      const since = new Date(Date.now() - days * 24 * 3600 * 1000);
      const [byStatus, revenue, ticketsByStatus, openByCategory, openHigh, pendingListings] = await Promise.all([
        Booking.aggregate([{ $match: { createdAt: { $gte: since }, status: { $ne: 'held' } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Booking.aggregate([
          { $match: { createdAt: { $gte: since }, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' }, serviceFees: { $sum: '$pricing.serviceFee' }, hostCommission: { $sum: '$pricing.hostCommission' }, count: { $sum: 1 } } },
        ]),
        SupportTicket.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        SupportTicket.aggregate([{ $match: { status: { $in: ['open', 'in_progress'] } } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
        SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] }, priority: 'high' }),
        Property.countDocuments({ isApproved: false, isDeleted: { $ne: true } }),
      ]);
      const toMap = (arr) => arr.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
      const rev = revenue[0] || { total: 0, serviceFees: 0, hostCommission: 0, count: 0 };
      return {
        periodDays: days,
        bookingsByStatus: toMap(byStatus),
        paid: { bookings: rev.count, totalSar: rev.total, platformIncomeSar: (rev.serviceFees || 0) + (rev.hostCommission || 0) },
        newTicketsByStatus: toMap(ticketsByStatus),
        openTicketsByCategory: toMap(openByCategory),
        openHighPriorityTickets: openHigh,
        listingsAwaitingApproval: pendingListings,
      };
    },
  },

  {
    name: 'list_tickets',
    description: 'List support tickets and complaints (category "complaint"), highest priority and most recently updated first. Each row has the first message excerpt so you can triage and summarize.',
    permission: PERMISSIONS.VIEW_SUPPORT,
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed', 'active'], description: '"active" means open or in_progress' },
        category: { type: 'string', enum: ['payment', 'booking', 'complaint', 'technical', 'account', 'other'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
    async run(input) {
      const q = {};
      if (input.status === 'active') q.status = { $in: ['open', 'in_progress'] };
      else if (input.status) q.status = input.status;
      if (input.category) q.category = input.category;
      if (input.priority) q.priority = input.priority;
      const limit = clampLimit(input.limit, 15, 25);
      const [rows, total] = await Promise.all([
        SupportTicket.find(q).populate('user', 'name').sort({ priority: -1, updatedAt: -1 }).limit(limit).lean(),
        SupportTicket.countDocuments(q),
      ]);
      return { total, shown: rows.length, tickets: rows.map(ticketSummary) };
    },
  },

  {
    name: 'get_ticket',
    description: 'Read one support ticket or complaint with its full message history and the linked booking, if any.',
    permission: PERMISSIONS.VIEW_SUPPORT,
    input_schema: {
      type: 'object',
      properties: { ticketId: { type: 'string' } },
      required: ['ticketId'],
      additionalProperties: false,
    },
    async run(input) {
      if (!isId(input.ticketId)) throw new ToolError('رقم التذكرة غير صالح');
      const t = await SupportTicket.findById(input.ticketId).populate('user', 'name phone').lean();
      if (!t) throw new ToolError('التذكرة غير موجودة');
      let booking = null;
      if (t.relatedBooking) {
        const b = await Booking.findById(t.relatedBooking).populate(BOOKING_POPULATE).lean();
        if (b) booking = bookingView(b, 'admin');
      }
      return {
        ...ticketSummary(t),
        user: t.user ? { name: t.user.name, phone: t.user.phone } : null,
        history: (t.messages || []).map((m) => ({ from: m.senderRole === 'admin' ? 'support' : 'customer', at: day(m.createdAt), text: cut(m.content, 1500) })),
        booking,
      };
    },
  },

  {
    name: 'list_pending_listings',
    description: 'Listings waiting for admin approval, oldest first.',
    permission: PERMISSIONS.VIEW_PROPERTIES,
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 25 } },
      additionalProperties: false,
    },
    async run(input) {
      const rows = await Property.find({ isApproved: false, isDeleted: { $ne: true } })
        .populate('host', 'name')
        .select('title titleAr type location.city createdAt moderationNote host')
        .sort('createdAt')
        .limit(clampLimit(input.limit, 10, 25))
        .lean();
      return rows.map((p) => ({ id: String(p._id), title: p.titleAr || p.title, type: p.type, city: p.location && p.location.city, host: p.host && p.host.name, createdAt: day(p.createdAt), note: p.moderationNote }));
    },
  },

  // ── Write tools: proposed by the model, executed only after the admin confirms ──

  {
    name: 'reply_to_ticket',
    description: 'Send a reply from the support team to a ticket or complaint. Write the reply in the customer\'s language (Arabic by default), polite and specific. This only PROPOSES the reply; the admin must confirm before it is sent.',
    permission: PERMISSIONS.MANAGE_SUPPORT,
    write: true,
    input_schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string' },
        message: { type: 'string', maxLength: 4000 },
      },
      required: ['ticketId', 'message'],
      additionalProperties: false,
    },
    async describe(input) {
      const t = await findTicket(input.ticketId);
      return `إرسال رد على التذكرة "${t.subject}":\n\n${input.message}`;
    },
    async run(input, ctx) {
      const ticket = await findTicket(input.ticketId);
      if (ticket.status === 'closed') throw new ToolError('التذكرة مغلقة');
      const text = sanitizeHtml(String(input.message || '')).replace(/<[^>]*>/g, '').trim();
      if (!text) throw new ToolError('الرد فارغ');
      ticket.messages.push({ sender: ctx.user._id, senderType: 'Admin', senderRole: 'admin', content: text });
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
        if (!ticket.assignedTo) ticket.assignedTo = ctx.user._id;
      }
      await ticket.save();
      await Notification.createNotification({
        user: ticket.user,
        userType: ticket.userType,
        type: 'support_reply',
        title: 'رد من الدعم',
        message: `يوجد رد جديد على طلبك "${ticket.subject}"`,
        data: { ticketId: ticket._id },
      }).catch(() => {});
      return { ticketId: String(ticket._id), status: ticket.status, sent: true };
    },
  },

  {
    name: 'update_ticket',
    description: 'Change a ticket\'s status and/or priority. Only PROPOSES the change; the admin must confirm.',
    permission: PERMISSIONS.MANAGE_SUPPORT,
    write: true,
    input_schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string' },
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['ticketId'],
      additionalProperties: false,
    },
    async describe(input) {
      const t = await findTicket(input.ticketId);
      const parts = [];
      if (input.status) parts.push(`الحالة إلى "${STATUS_AR[input.status]}"`);
      if (input.priority) parts.push(`الأولوية إلى "${({ low: 'منخفضة', medium: 'متوسطة', high: 'عالية' })[input.priority]}"`);
      if (!parts.length) throw new ToolError('لا يوجد تغيير');
      return `تغيير ${parts.join(' و')} للتذكرة "${t.subject}"`;
    },
    async run(input, ctx) {
      const ticket = await findTicket(input.ticketId);
      if (input.priority) ticket.priority = input.priority;
      if (input.status) {
        ticket.status = input.status;
        if (input.status === 'resolved') ticket.resolvedAt = new Date();
        if (input.status === 'closed') ticket.closedAt = new Date();
        if (input.status === 'in_progress' && !ticket.assignedTo) ticket.assignedTo = ctx.user._id;
      }
      await ticket.save();
      if (input.status) {
        await Notification.createNotification({
          user: ticket.user,
          userType: ticket.userType,
          type: 'support_reply',
          title: 'تحديث على طلب الدعم',
          message: `تغيّرت حالة طلبك "${ticket.subject}" إلى: ${STATUS_AR[input.status]}`,
          data: { ticketId: ticket._id },
        }).catch(() => {});
      }
      return { ticketId: String(ticket._id), status: ticket.status, priority: ticket.priority };
    },
  },
];
