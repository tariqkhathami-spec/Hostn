// Account manager API. An account manager is an admin with
// adminRole 'account_manager' who looks after a set of hosts
// (Host.accountManager). Every query here is limited to those hosts:
// nothing in this file may read or write by an id taken from the request
// without first proving it belongs to one of the caller's hosts.
const mongoose = require('mongoose');
const Host = require('../models/Host');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Booking = require('../models/Booking');
const Payout = require('../models/Payout');
const SupportTicket = require('../models/SupportTicket');
const ActivityLog = require('../models/ActivityLog');
const { sanitizeHtml } = require('../utils/sanitize');
const { moderateProperty } = require('./adminController');
const { reviewLicense } = require('./adminLicenseController');

const isId = (v) => mongoose.isValidObjectId(v);
const notFound = (res, what) => res.status(404).json({ success: false, message: `${what} not found` });

/** Ids of the hosts this manager looks after, and of their properties. */
async function scope(req) {
  if (req._managerScope) return req._managerScope;
  const hosts = await Host.find({ accountManager: req.user._id, deletedAt: null }).select('_id').lean();
  const hostIds = hosts.map((h) => h._id);
  const properties = hostIds.length
    ? await Property.find({ host: { $in: hostIds }, isDeleted: { $ne: true } }).select('_id').lean()
    : [];
  req._managerScope = { hostIds, propertyIds: properties.map((p) => p._id) };
  return req._managerScope;
}
const owns = (ids, id) => ids.some((x) => String(x) === String(id));

const LICENSE_SUBMITTED = [
  { 'tourismLicense.licenseNumber': { $exists: true, $nin: [null, ''] } },
  { 'tourismLicense.documentUrl': { $exists: true, $nin: [null, ''] } },
];

// GET /manager/overview
exports.getOverview = async (req, res, next) => {
  try {
    const { hostIds, propertyIds } = await scope(req);
    const now = new Date();
    const [pendingProperties, pendingLicenses, openTickets, upcomingBookings, pendingBookings] = await Promise.all([
      Property.countDocuments({ _id: { $in: propertyIds }, isApproved: false }),
      Unit.countDocuments({ property: { $in: propertyIds }, isDeleted: { $ne: true }, 'tourismLicense.status': 'pending', $or: LICENSE_SUBMITTED }),
      SupportTicket.countDocuments({ user: { $in: hostIds }, userType: 'Host', status: { $in: ['open', 'in_progress'] } }),
      Booking.countDocuments({ property: { $in: propertyIds }, status: 'confirmed', checkIn: { $gte: now } }),
      Booking.countDocuments({ property: { $in: propertyIds }, status: 'pending', checkOut: { $gte: now } }),
    ]);
    res.json({
      success: true,
      data: {
        hosts: hostIds.length,
        properties: propertyIds.length,
        pendingProperties,
        pendingLicenses,
        openTickets,
        upcomingBookings,
        pendingBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /manager/hosts
exports.getHosts = async (req, res, next) => {
  try {
    const { hostIds } = await scope(req);
    const hosts = await Host.find({ _id: { $in: hostIds } }).select('name phone email createdAt isSuspended').sort('name').lean();
    const properties = await Property.find({ host: { $in: hostIds }, isDeleted: { $ne: true } }).select('host isApproved isActive').lean();
    const byHost = {};
    properties.forEach((p) => {
      const k = String(p.host);
      byHost[k] = byHost[k] || { ids: [], pending: 0, active: 0 };
      byHost[k].ids.push(p._id);
      if (p.isApproved === false) byHost[k].pending += 1;
      if (p.isActive) byHost[k].active += 1;
    });
    const openTickets = await SupportTicket.aggregate([
      { $match: { user: { $in: hostIds }, userType: 'Host', status: { $in: ['open', 'in_progress'] } } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]);
    const ticketsByHost = Object.fromEntries(openTickets.map((t) => [String(t._id), t.n]));
    res.json({
      success: true,
      data: hosts.map((h) => {
        const p = byHost[String(h._id)] || { ids: [], pending: 0, active: 0 };
        return {
          id: h._id,
          name: h.name || '',
          phone: h.phone || '',
          email: h.email || '',
          joinedAt: h.createdAt,
          isSuspended: !!h.isSuspended,
          properties: p.ids.length,
          activeProperties: p.active,
          pendingProperties: p.pending,
          openTickets: ticketsByHost[String(h._id)] || 0,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

// GET /manager/hosts/:id  — everything about one of my hosts, on one page
exports.getHost = async (req, res, next) => {
  try {
    const { hostIds } = await scope(req);
    if (!isId(req.params.id) || !owns(hostIds, req.params.id)) return notFound(res, 'Host');
    const host = await Host.findById(req.params.id).select('name phone email createdAt isSuspended').lean();
    if (!host) return notFound(res, 'Host');

    const properties = await Property.find({ host: host._id, isDeleted: { $ne: true } })
      .select('title titleAr type location.city isApproved isActive moderationNote createdAt')
      .sort('-createdAt')
      .lean();
    const propertyIds = properties.map((p) => p._id);
    const titleById = Object.fromEntries(properties.map((p) => [String(p._id), p.titleAr || p.title]));

    const [units, bookings, tickets, payouts, earned] = await Promise.all([
      Unit.find({ property: { $in: propertyIds }, isDeleted: { $ne: true }, $or: LICENSE_SUBMITTED })
        .select('nameAr nameEn property tourismLicense.licenseNumber tourismLicense.status tourismLicense.expiryDate tourismLicense.documentUrl tourismLicense.rejectionReason')
        .lean(),
      Booking.find({ property: { $in: propertyIds }, status: { $ne: 'held' } })
        .select('reference property checkIn checkOut status paymentStatus pricing.total guest createdAt')
        .populate('guest', 'name')
        .sort('-createdAt')
        .limit(30)
        .lean(),
      SupportTicket.find({ user: host._id, userType: 'Host' })
        .select('subject category status priority updatedAt createdAt')
        .sort('-updatedAt')
        .limit(30)
        .lean(),
      // Read-only view of what the host is owed and has been paid.
      Payout.find({ host: host._id }).select('payoutNumber amount status createdAt').sort('-createdAt').limit(20).lean(),
      Booking.aggregate([
        { $match: { property: { $in: propertyIds }, status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        host: {
          id: host._id,
          name: host.name || '',
          phone: host.phone || '',
          email: host.email || '',
          joinedAt: host.createdAt,
          isSuspended: !!host.isSuspended,
        },
        properties: properties.map((p) => ({
          id: p._id,
          title: p.titleAr || p.title,
          type: p.type,
          city: p.location?.city || '',
          isApproved: p.isApproved !== false,
          isActive: !!p.isActive,
          moderationNote: p.moderationNote || '',
          createdAt: p.createdAt,
        })),
        licenses: units.map((u) => ({
          unitId: u._id,
          unitName: u.nameAr || u.nameEn || '',
          propertyName: titleById[String(u.property)] || '',
          licenseNumber: u.tourismLicense?.licenseNumber || '',
          status: u.tourismLicense?.status || 'pending',
          expiryDate: u.tourismLicense?.expiryDate || null,
          documentUrl: u.tourismLicense?.documentUrl || '',
          rejectionReason: u.tourismLicense?.rejectionReason || '',
        })),
        bookings: bookings.map((b) => ({
          id: b._id,
          reference: b.reference || String(b._id).slice(-7).toUpperCase(),
          propertyName: titleById[String(b.property)] || '',
          guestName: b.guest?.name || '',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          paymentStatus: b.paymentStatus,
          total: b.pricing?.total || 0,
        })),
        tickets: tickets.map((t) => ({
          id: t._id,
          subject: t.subject,
          category: t.category,
          status: t.status,
          priority: t.priority,
          updatedAt: t.updatedAt,
        })),
        finance: {
          bookingsValue: Math.round((earned[0]?.total || 0) * 100) / 100,
          bookingsCount: earned[0]?.count || 0,
          paidOut: payouts.filter((p) => p.status === 'executed').reduce((s, p) => s + (p.amount || 0), 0),
          payouts: payouts.map((p) => ({ id: p._id, number: p.payoutNumber, amount: p.amount, status: p.status, date: p.createdAt })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /manager/properties/:id/moderate  { action: 'approve' | 'reject', reason? }
exports.moderateMyProperty = async (req, res, next) => {
  try {
    const { propertyIds } = await scope(req);
    if (!isId(req.params.id) || !owns(propertyIds, req.params.id)) return notFound(res, 'Property');
    if (!['approve', 'reject'].includes(req.body?.action)) {
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });
    }
    // Same rules, notification and log entry as the admin endpoint.
    req.body = { action: req.body.action, reason: typeof req.body.reason === 'string' ? req.body.reason : undefined };
    return moderateProperty(req, res, next);
  } catch (error) {
    next(error);
  }
};

// PUT /manager/licenses/:unitId  { action, reason? }
exports.reviewMyLicense = async (req, res, next) => {
  try {
    const { propertyIds } = await scope(req);
    if (!isId(req.params.unitId)) return notFound(res, 'Unit');
    const unit = await Unit.findById(req.params.unitId).select('property').lean();
    if (!unit || !owns(propertyIds, unit.property)) return notFound(res, 'Unit');
    return reviewLicense(req, res, next);
  } catch (error) {
    next(error);
  }
};

async function myTicket(req, res) {
  const { hostIds } = await scope(req);
  if (!isId(req.params.id)) {
    notFound(res, 'Ticket');
    return null;
  }
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket || ticket.userType !== 'Host' || !owns(hostIds, ticket.user)) {
    notFound(res, 'Ticket');
    return null;
  }
  return ticket;
}

const ticketPayload = (t) => ({
  id: t._id,
  subject: t.subject,
  category: t.category,
  status: t.status,
  priority: t.priority,
  hostId: t.user,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  messages: (t.messages || []).map((m) => ({
    id: m._id,
    fromHost: m.senderRole !== 'admin',
    content: m.content,
    createdAt: m.createdAt,
  })),
});

// GET /manager/tickets/:id
exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await myTicket(req, res);
    if (!ticket) return;
    res.json({ success: true, data: ticketPayload(ticket) });
  } catch (error) {
    next(error);
  }
};

// POST /manager/tickets/:id/reply  { message }
exports.replyToTicket = async (req, res, next) => {
  try {
    const ticket = await myTicket(req, res);
    if (!ticket) return;
    const message = typeof req.body?.message === 'string' ? sanitizeHtml(req.body.message).trim().slice(0, 5000) : '';
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot reply to a closed ticket' });
    }
    ticket.messages.push({ sender: req.user._id, senderType: 'Admin', senderRole: 'admin', content: message });
    if (ticket.status === 'open') ticket.status = 'in_progress';
    if (!ticket.assignedTo) ticket.assignedTo = req.user._id;
    await ticket.save();

    const Notification = require('../models/Notification');
    Notification.createNotification({
      user: ticket.user,
      userType: 'Host',
      type: 'support_reply',
      title: 'رد من مدير حسابك',
      message: message.slice(0, 120),
      data: {},
    }).catch(() => {});

    res.json({ success: true, data: ticketPayload(ticket) });
  } catch (error) {
    next(error);
  }
};

// PUT /manager/tickets/:id/status  { status }
exports.setTicketStatus = async (req, res, next) => {
  try {
    const ticket = await myTicket(req, res);
    if (!ticket) return;
    const status = req.body?.status;
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    await ticket.save();
    ActivityLog.create({
      actor: req.user._id,
      actorType: 'Admin',
      actorRole: 'admin',
      actorAdminRole: 'account_manager',
      action: 'admin_action',
      details: `Support ticket ${ticket._id} set to ${status} by account manager`,
      ip: req.ip,
    }).catch(() => {});
    res.json({ success: true, data: ticketPayload(ticket) });
  } catch (error) {
    next(error);
  }
};
