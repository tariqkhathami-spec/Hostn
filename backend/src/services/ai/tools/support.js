/**
 * Support tools for guests and hosts: they only ever touch the caller's own
 * tickets (every query is filtered by user id).
 */
const SupportTicket = require('../../../models/SupportTicket');
const Booking = require('../../../models/Booking');
const Property = require('../../../models/Property');
const { sanitizeHtml } = require('../../../utils/sanitize');
const { isId, day, cut, normalizeReference, ToolError } = require('./common');

const CATEGORY_AR = { payment: 'دفع', booking: 'حجز', complaint: 'شكوى', technical: 'مشكلة تقنية', account: 'الحساب', other: 'أخرى' };
const clean = (s) => sanitizeHtml(String(s || '')).replace(/<[^>]*>/g, '').trim();
const accountType = (ctx) => ({ guest: 'Guest', host: 'Host' })[ctx.role];

/** A booking the caller may attach to a ticket: their own (guest) or on their property (host). */
async function ownBooking(reference, ctx) {
  if (!reference) return null;
  const booking = await Booking.findOne({ reference: normalizeReference(reference) }).select('_id guest property').lean();
  if (!booking) throw new ToolError('لم أجد حجزاً بهذا الرقم');
  if (ctx.role === 'guest' && String(booking.guest) === String(ctx.user._id)) return booking;
  if (ctx.role === 'host') {
    const owns = await Property.exists({ _id: booking.property, host: ctx.user._id });
    if (owns) return booking;
  }
  throw new ToolError('لم أجد حجزاً بهذا الرقم');
}

async function ownTicket(ticketId, ctx) {
  if (!isId(ticketId)) throw new ToolError('رقم التذكرة غير صالح');
  const ticket = await SupportTicket.findOne({ _id: ticketId, user: ctx.user._id });
  if (!ticket) throw new ToolError('التذكرة غير موجودة');
  return ticket;
}

module.exports = [
  {
    name: 'my_tickets',
    description: 'The user\'s own support tickets and complaints with their latest reply.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    async run(input, ctx) {
      const rows = await SupportTicket.find({ user: ctx.user._id }).sort({ updatedAt: -1 }).limit(15).lean();
      return rows.map((t) => {
        const last = t.messages && t.messages[t.messages.length - 1];
        return {
          id: String(t._id),
          subject: t.subject,
          category: t.category,
          status: t.status,
          updatedAt: day(t.updatedAt),
          lastReply: last ? { from: last.senderRole === 'admin' ? 'support' : 'you', text: cut(last.content, 600) } : null,
        };
      });
    },
  },

  {
    name: 'open_support_ticket',
    description: 'Open a support ticket or complaint for the user, optionally linked to one of their bookings by reference. Only PROPOSES it; the user must confirm before it is sent to the support team. Write subject and message in the user\'s own words and language.',
    write: true,
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', maxLength: 200 },
        category: { type: 'string', enum: ['payment', 'booking', 'complaint', 'technical', 'account', 'other'] },
        message: { type: 'string', maxLength: 4000 },
        bookingReference: { type: 'string' },
      },
      required: ['subject', 'category', 'message'],
      additionalProperties: false,
    },
    async describe(input, ctx) {
      await ownBooking(input.bookingReference, ctx);
      const ref = input.bookingReference ? ` (حجز ${normalizeReference(input.bookingReference)})` : '';
      return `فتح تذكرة "${CATEGORY_AR[input.category] || input.category}"${ref}\nالموضوع: ${input.subject}\n\n${input.message}`;
    },
    async run(input, ctx) {
      const subject = clean(input.subject).slice(0, 200);
      const message = clean(input.message);
      if (!subject || !message) throw new ToolError('الموضوع والرسالة مطلوبة');
      if (!CATEGORY_AR[input.category]) throw new ToolError('تصنيف غير صالح');
      const booking = await ownBooking(input.bookingReference, ctx);
      const type = accountType(ctx);
      let assignedTo;
      if (type === 'Host') {
        const host = await require('../../../models/Host').findById(ctx.user._id).select('accountManager').lean();
        assignedTo = (host && host.accountManager) || undefined;
      }
      const ticket = await SupportTicket.create({
        user: ctx.user._id,
        userType: type,
        assignedTo,
        subject,
        category: input.category,
        priority: input.category === 'complaint' ? 'high' : 'medium',
        relatedBooking: booking ? booking._id : null,
        relatedProperty: booking ? booking.property : null,
        messages: [{ sender: ctx.user._id, senderType: type, senderRole: 'user', content: message }],
      });
      return { ticketId: String(ticket._id), status: ticket.status };
    },
  },

  {
    name: 'reply_on_my_ticket',
    description: 'Add a message from the user to one of their own open tickets. Only PROPOSES it; the user must confirm.',
    write: true,
    input_schema: {
      type: 'object',
      properties: { ticketId: { type: 'string' }, message: { type: 'string', maxLength: 4000 } },
      required: ['ticketId', 'message'],
      additionalProperties: false,
    },
    async describe(input, ctx) {
      const t = await ownTicket(input.ticketId, ctx);
      return `إضافة رسالة على تذكرتك "${t.subject}":\n\n${input.message}`;
    },
    async run(input, ctx) {
      const ticket = await ownTicket(input.ticketId, ctx);
      if (ticket.status === 'closed') throw new ToolError('التذكرة مغلقة');
      const message = clean(input.message);
      if (!message) throw new ToolError('الرسالة فارغة');
      ticket.messages.push({ sender: ctx.user._id, senderType: accountType(ctx), senderRole: 'user', content: message });
      if (ticket.status === 'resolved') ticket.status = 'open';
      await ticket.save();
      return { ticketId: String(ticket._id), status: ticket.status };
    },
  },
];
