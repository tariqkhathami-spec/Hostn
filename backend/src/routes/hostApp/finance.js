// Host mobile app compatibility routes (finance). Mounted under /api/v1/host
// after protect + authorize('host', 'admin') — see routes/host.js.
//
// Thin adapters over the same data the website's /host/finance/* endpoints
// use (Payout, HostInvoice, HostStatement, HostBankAccount, Booking), reshaped
// to what the host app screens read. Everything is scoped to req.user._id.
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Host = require('../../models/Host');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Booking = require('../../models/Booking');
const Review = require('../../models/Review');
const Report = require('../../models/Report');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const Payout = require('../../models/Payout');
const HostInvoice = require('../../models/HostInvoice');
const { hostBreakdownOf, hostPayoutOf, HOST_COMMISSION_RATE } = require('../../config/fees');
const HostStatement = require('../../models/HostStatement');
const HostBankAccount = require('../../models/HostBankAccount');

// ── Helpers ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const EARNING_STATUSES = ['confirmed', 'completed'];
const VAT_RATE = 15;

const isId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pad2 = (n) => String(n).padStart(2, '0');
const pageOf = (q) => {
  const n = parseInt(q, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
};
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// "SA0380000000608010167519" -> "SA•••• 7519" (lists/details only display it)
const maskIban = (iban) => {
  const s = String(iban || '');
  return s.length > 6 ? `${s.slice(0, 2)}•••• ${s.slice(-4)}` : s;
};

const nightsOf = (b) => {
  if (b?.pricing?.nights) return b.pricing.nights;
  if (!b?.checkIn || !b?.checkOut) return 0;
  return Math.max(0, Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / DAY_MS));
};

const hostProperties = (hostId, select = '_id') =>
  Property.find({ host: hostId, isDeleted: { $ne: true } }).select(select).lean();

// ═══════════════════════════════════════════════════════════════════════════════
// Transfers (= payouts)
// ═══════════════════════════════════════════════════════════════════════════════
const TRANSFER_STATUS = { executed: 'completed', failed: 'failed', upcoming: 'pending', processing: 'pending' };

const toTransfer = (p) => ({
  id: String(p._id),
  transactionId: p.payoutNumber,
  amount: p.amount,
  currency: p.currency || 'SAR',
  status: TRANSFER_STATUS[p.status] || 'pending',
  method: 'bank',
  accountNumber: maskIban(p.iban),
  bankName: p.bankName || null,
  requestDate: p.createdAt,
  completionDate: p.executedAt || undefined,
  failureReason: p.status === 'failed' ? p.failureReason || null : undefined,
  bookings: (p.bookings || []).map((b) => String(b?._id || b)),
});

router.get('/transfers', wrap(async (req, res) => {
  const page = pageOf(req.query.page);
  const filter = { host: req.user._id };
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 50) : '';
  if (search) filter.payoutNumber = { $regex: escapeRegex(search), $options: 'i' };

  const [payouts, total] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Payout.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: payouts.map(toTransfer),
    pagination: { total, page, pages: Math.ceil(total / PAGE_SIZE), limit: PAGE_SIZE },
  });
}));

router.get('/transfers/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 404, 'Transfer not found');
  const payout = await Payout.findOne({ _id: req.params.id, host: req.user._id })
    .populate({
      path: 'bookings',
      select: 'reference checkIn checkOut pricing guest property unit',
      populate: [
        { path: 'guest', select: 'name' },
        { path: 'property', select: 'title titleAr' },
        { path: 'unit', select: 'nameEn nameAr' },
      ],
    })
    .lean();
  if (!payout) return fail(res, 404, 'Transfer not found');

  const reservations = (payout.bookings || []).filter(Boolean).map((b) => ({
    reservationId: b.reference || String(b._id),
    bookingId: String(b._id),
    guestName: b.guest?.name || '',
    amount: hostPayoutOf(b.pricing),
    unitName: b.unit?.nameAr || b.unit?.nameEn || b.property?.titleAr || b.property?.title || '',
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    nights: nightsOf(b),
  }));

  res.json({
    success: true,
    data: { ...toTransfer(payout), breakdown: payout.breakdown || null, reservations },
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Payment method (= active HostBankAccount). STC Pay payouts are not supported
// by the platform, so stcPayNumber is always null.
// ═══════════════════════════════════════════════════════════════════════════════
const toPaymentMethod = (account) => ({
  type: 'bank_transfer',
  hasBankAccount: Boolean(account),
  // Full IBAN on purpose: same as the website's GET /host/finance/bank-account,
  // and the app's edit form pre-fills and re-submits this value.
  iban: account?.iban ?? null,
  bankName: account?.bankName ?? null,
  bankNameAr: account?.bankNameAr || null,
  accountHolder: account?.accountHolder ?? null,
  isVerified: account ? Boolean(account.isVerified) : false,
  stcPayNumber: null,
  stcPayFee: null,
});

const activeAccount = (hostId) => HostBankAccount.findOne({ host: hostId, isActive: true }).lean();

router.get('/payment-method', wrap(async (req, res) => {
  res.json({ success: true, data: toPaymentMethod(await activeAccount(req.user._id)) });
}));

const saveBankDetails = wrap(async (req, res) => {
  if (req.user.userType !== 'host') return fail(res, 403, 'Only hosts can set payout bank details');
  const body = req.body || {};
  if (body.type && body.type !== 'bank_transfer' && body.type !== 'bank') {
    return fail(res, 400, 'Only bank transfer payouts are supported');
  }
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const iban = str(body.iban, 40).replace(/[\s-]/g, '').toUpperCase();
  const bankName = str(body.bankName, 100);
  const bankNameAr = str(body.bankNameAr, 100);
  const accountHolder = str(body.accountHolder, 100);

  if (!bankName || !iban || !accountHolder) {
    return fail(res, 400, 'bankName, iban, and accountHolder are required');
  }
  if (!/^SA\d{22}$/.test(iban)) {
    return fail(res, 400, 'Invalid IBAN format. Must be SA followed by 22 digits.');
  }

  const current = await activeAccount(req.user._id);
  let account;
  if (current && current.iban === iban) {
    // Same account: just correct the labels, keep verification + settings.
    account = await HostBankAccount.findOneAndUpdate(
      { _id: current._id, host: req.user._id },
      { $set: { bankName, accountHolder, ...(bankNameAr ? { bankNameAr } : {}) } },
      { new: true, runValidators: true }
    ).lean();
  } else {
    // New IBAN: same as the website (deactivate old, create a fresh unverified
    // record) but carry the host's transfer-duration preference over.
    await HostBankAccount.updateMany({ host: req.user._id, isActive: true }, { isActive: false });
    const created = await HostBankAccount.create({
      host: req.user._id,
      bankName,
      bankNameAr,
      iban,
      accountHolder,
      isActive: true,
      ...(current?.transferDuration ? { transferDuration: current.transferDuration } : {}),
    });
    account = created.toObject();
  }
  res.json({ success: true, data: toPaymentMethod(account) });
});

router.put('/payment-method', saveBankDetails);
router.put('/payment-method/bank', saveBankDetails);

// ═══════════════════════════════════════════════════════════════════════════════
// Transfer duration (stored on the active HostBankAccount, like the website)
// ═══════════════════════════════════════════════════════════════════════════════
const DURATION_TO_APP = { after_departure: 'direct_48h', amount_threshold: 'threshold', weekly: 'weekly' };
const DURATION_FROM_APP = {
  direct_48h: 'after_departure',
  after_departure: 'after_departure',
  threshold: 'amount_threshold',
  amount_threshold: 'amount_threshold',
  weekly: 'weekly',
};

const toTransferDuration = (account) => {
  const td = account?.transferDuration || {};
  const type = DURATION_TO_APP[td.type] || 'direct_48h'; // model default
  return {
    type,
    thresholdAmount: type === 'threshold' ? td.thresholdAmount || 0 : undefined,
    hours: td.hours ?? 48,
    weeklyDay: td.weeklyDay ?? 0,
    hasBankAccount: Boolean(account),
  };
};

router.get('/transfer-duration', wrap(async (req, res) => {
  res.json({ success: true, data: toTransferDuration(await activeAccount(req.user._id)) });
}));

router.put('/transfer-duration', wrap(async (req, res) => {
  const body = req.body || {};
  const type = typeof body.type === 'string' && Object.hasOwn(DURATION_FROM_APP, body.type) ? DURATION_FROM_APP[body.type] : null;
  if (!type) return fail(res, 400, 'type must be one of: direct_48h, threshold, weekly');

  const set = { 'transferDuration.type': type };
  if (type === 'after_departure') {
    const hours = body.hours === undefined ? 48 : Number(body.hours);
    if (!Number.isFinite(hours) || hours < 24 || hours > 336) return fail(res, 400, 'hours must be between 24 and 336');
    set['transferDuration.hours'] = Math.round(hours);
  }
  if (type === 'amount_threshold') {
    const amount = Number(body.thresholdAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return fail(res, 400, 'thresholdAmount must be a positive number');
    }
    set['transferDuration.thresholdAmount'] = round2(amount);
  } else {
    set['transferDuration.thresholdAmount'] = 0;
  }
  if (type === 'weekly') {
    const day = body.weeklyDay === undefined ? 0 : Number(body.weeklyDay);
    if (!Number.isInteger(day) || day < 0 || day > 6) return fail(res, 400, 'weeklyDay must be between 0 and 6');
    set['transferDuration.weeklyDay'] = day;
  }

  const account = await HostBankAccount.findOneAndUpdate(
    { host: req.user._id, isActive: true },
    { $set: set },
    { new: true, runValidators: true }
  ).lean();
  if (!account) {
    return fail(res, 404, 'No active bank account found. Please add a bank account first.');
  }
  res.json({ success: true, data: toTransferDuration(account) });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Invoices (= HostInvoice: the platform's commission invoice to the host)
// ═══════════════════════════════════════════════════════════════════════════════
const PLATFORM_NAME = 'Hostn';

const toInvoice = (inv, hostName) => {
  const bookings = (inv.bookings || []).filter((b) => b && b._id && b.checkIn);
  const single = bookings.length === 1 ? bookings[0] : null;
  const date = inv.issuedAt || inv.createdAt;
  const br = inv.breakdown || {};
  const vatAmount = round2(br.vat);
  const totalWithTax = round2(br.total || inv.amount);
  const taxableAmount = round2(br.commission || totalWithTax - vatAmount);
  const names = [...new Set(bookings.map((b) => b.unit?.nameAr || b.unit?.nameEn || b.property?.titleAr || b.property?.title).filter(Boolean))];
  const cities = [...new Set(bookings.map((b) => b.property?.location?.city).filter(Boolean))];

  return {
    id: String(inv._id),
    invoiceNumber: inv.invoiceNumber,
    date,
    amount: inv.amount,
    currency: inv.currency || 'SAR',
    status: inv.status,
    vendorName: PLATFORM_NAME,
    vendorTaxNumber: undefined,
    buyerName: hostName || '',
    unitName: names.join('، '),
    unitCode: single ? single.reference || '' : '',
    city: cities.join('، '),
    // The app formats these as dates, so they must always be valid.
    checkIn: single?.checkIn || inv.periodStart || date,
    checkOut: single?.checkOut || inv.periodEnd || date,
    totalAmount: inv.amount,
    paidAmount: inv.status === 'paid' ? inv.amount : 0,
    paymentStatus: inv.status,
    lineItems: [
      {
        description: br.commissionRate ? `عمولة المنصة (${br.commissionRate}%)` : 'عمولة المنصة',
        quantity: 1,
        unitPrice: taxableAmount,
        taxRate: taxableAmount > 0 ? round2((vatAmount / taxableAmount) * 100) : VAT_RATE,
        taxAmount: vatAmount,
        total: totalWithTax,
      },
    ],
    taxableAmount,
    vatAmount,
    totalWithTax,
    grossBookings: round2(br.grossBookings),
    bookingCount: (inv.bookings || []).length,
    payoutId: inv.payout ? String(inv.payout) : null,
  };
};

const INVOICE_BOOKINGS = {
  path: 'bookings',
  select: 'reference checkIn checkOut property unit',
  populate: [
    { path: 'property', select: 'title titleAr location.city' },
    { path: 'unit', select: 'nameEn nameAr' },
  ],
};

router.get('/invoices', wrap(async (req, res) => {
  const page = pageOf(req.query.page);
  const filter = { host: req.user._id, status: { $ne: 'draft' } };
  const [invoices, total] = await Promise.all([
    HostInvoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
      .populate(INVOICE_BOOKINGS).lean(),
    HostInvoice.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: invoices.map((i) => toInvoice(i, req.user.name)),
    pagination: { total, page, pages: Math.ceil(total / PAGE_SIZE), limit: PAGE_SIZE },
  });
}));

router.get('/invoices/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
  const invoice = await HostInvoice.findOne({ _id: req.params.id, host: req.user._id, status: { $ne: 'draft' } })
    .populate(INVOICE_BOOKINGS).lean();
  if (!invoice) return fail(res, 404, 'Invoice not found');
  res.json({ success: true, data: toInvoice(invoice, req.user.name) });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Statements. The app addresses a statement by month only ("04"), so the list
// is the trailing 12 months: every month number appears at most once.
// Same sources as the website: HostStatement documents, and — exactly like
// GET /host/finance/statements — a statement derived from the month's
// confirmed/completed bookings when no document has been generated yet.
// ═══════════════════════════════════════════════════════════════════════════════
const trailingMonths = (now = new Date()) => {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out; // newest first
};

const monthRange = (year, month) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 1), // exclusive
});

const toStatement = (s, withTransactions) => ({
  id: String(s._id),
  month: pad2(s.period.month),
  year: s.period.year,
  openingBalance: s.openingBalance || 0,
  closingBalance: s.closingBalance || 0,
  totalCredits: s.totalCredits || 0,
  totalDebits: s.totalDebits || 0,
  currency: s.currency || 'SAR',
  status: s.status,
  isFallback: Boolean(s.isFallback),
  ...(withTransactions
    ? {
        transactions: (s.entries || []).map((e) => ({
          date: e.date,
          description: e.descriptionAr || e.description || '',
          type: e.type,
          reference: e.reference || null,
          credit: e.credit || 0,
          debit: e.debit || 0,
          balance: e.balance || 0,
        })),
      }
    : {}),
});

router.get('/statements', wrap(async (req, res) => {
  const hostId = req.user._id;
  const months = trailingMonths();
  const oldest = months[months.length - 1];
  const newest = months[0];
  const from = monthRange(oldest.year, oldest.month).start;
  const to = monthRange(newest.year, newest.month).end;

  const [docs, props] = await Promise.all([
    HostStatement.find({
      host: hostId,
      $or: months.map((m) => ({ 'period.year': m.year, 'period.month': m.month })),
    }).select('period openingBalance closingBalance totalCredits totalDebits status currency').lean(),
    hostProperties(hostId),
  ]);
  const byKey = new Map(docs.map((d) => [`${d.period.year}-${d.period.month}`, d]));

  const derived = new Map();
  if (props.length > 0) {
    const bookings = await Booking.find({
      property: { $in: props.map((p) => p._id) },
      status: { $in: EARNING_STATUSES },
      checkIn: { $gte: from, $lt: to },
    }).select('checkIn pricing').lean();
    // Host money only: stay + cleaning fee as credit, platform commission as
    // debit. The guest's service fee and the VAT are never the host's.
    bookings.forEach((b) => {
      const d = new Date(b.checkIn);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const row = derived.get(key) || { credits: 0, debits: 0 };
      const { gross, commission } = hostBreakdownOf(b.pricing);
      row.credits += gross;
      row.debits += commission;
      derived.set(key, row);
    });
  }

  const data = [];
  months.forEach((m) => {
    const key = `${m.year}-${m.month}`;
    if (byKey.has(key)) return data.push(toStatement(byKey.get(key), false));
    if (derived.has(key)) {
      const row = derived.get(key);
      data.push(toStatement({
        _id: `fallback-${m.year}-${m.month}`,
        period: m,
        openingBalance: 0,
        closingBalance: round2(row.credits - row.debits),
        totalCredits: round2(row.credits),
        totalDebits: round2(row.debits),
        status: 'closed',
        isFallback: true,
      }, false));
    }
  });

  res.json({ success: true, data });
}));

// :month is "MM" (resolved inside the trailing 12 months) or "YYYY-MM".
router.get('/statements/:month', wrap(async (req, res) => {
  const hostId = req.user._id;
  const m = /^(?:(\d{4})-)?(\d{1,2})$/.exec(req.params.month);
  const month = m ? parseInt(m[2], 10) : 0;
  if (!m || month < 1 || month > 12) return fail(res, 400, 'Invalid month');
  let year = m[1] ? parseInt(m[1], 10) : null;
  if (!year) {
    const now = new Date();
    year = month <= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() - 1;
  }
  if (year < 2000 || year > 2100) return fail(res, 400, 'Invalid year');

  const doc = await HostStatement.findOne({ host: hostId, 'period.year': year, 'period.month': month }).lean();
  if (doc) return res.json({ success: true, data: toStatement(doc, true) });

  // Derived from bookings (same rule as the website's fallback statement).
  const props = await hostProperties(hostId, '_id title titleAr');
  const titles = new Map(props.map((p) => [String(p._id), p.titleAr || p.title || '']));
  const { start, end } = monthRange(year, month);
  const bookings = props.length
    ? await Booking.find({
        property: { $in: props.map((p) => p._id) },
        status: { $in: EARNING_STATUSES },
        checkIn: { $gte: start, $lt: end },
      }).sort({ checkIn: 1 }).select('reference checkIn pricing property').lean()
    : [];
  if (bookings.length === 0) return fail(res, 404, 'Statement not found');

  const ratePct = Math.round(HOST_COMMISSION_RATE * 100);
  let balance = 0;
  let totalCredits = 0;
  let totalDebits = 0;
  const entries = [];
  bookings.forEach((b) => {
    const { gross, commission } = hostBreakdownOf(b.pricing);
    const title = titles.get(String(b.property)) || '';
    const reference = b.reference || String(b._id);
    balance = round2(balance + gross);
    totalCredits = round2(totalCredits + gross);
    entries.push({
      date: b.checkIn,
      type: 'booking_earning',
      descriptionAr: `حجز ${b.reference || ''}${title ? ` - ${title}` : ''}`.trim(),
      reference,
      credit: gross,
      debit: 0,
      balance,
    });
    if (commission > 0) {
      balance = round2(balance - commission);
      totalDebits = round2(totalDebits + commission);
      entries.push({
        date: b.checkIn,
        type: 'commission',
        descriptionAr: `عمولة المنصة (${ratePct}%) - حجز ${reference}`,
        reference,
        credit: 0,
        debit: commission,
        balance,
      });
    }
  });

  res.json({
    success: true,
    data: toStatement({
      _id: `fallback-${year}-${month}`,
      period: { month, year },
      openingBalance: 0,
      closingBalance: balance,
      totalCredits,
      totalDebits,
      status: 'closed',
      isFallback: true,
      entries,
    }, true),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Account summary — computed on demand from the host's bookings.
// Revenue/bookings: confirmed + completed bookings whose check-in falls in the
// month (same attribution as statements). Occupancy: booked nights that fall
// inside the month / (days in month x units in scope).
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/account-summary', wrap(async (req, res) => {
  const hostId = req.user._id;
  const now = new Date();
  const { propertyId, unitId } = req.query;

  const month = req.query.month === undefined || req.query.month === '' ? now.getMonth() + 1 : Number(req.query.month);
  const year = req.query.year === undefined || req.query.year === '' ? now.getFullYear() : Number(req.query.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) return fail(res, 400, 'Invalid month');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(res, 400, 'Invalid year');
  if (propertyId !== undefined && !isId(propertyId)) return fail(res, 400, 'Invalid propertyId');
  if (unitId !== undefined && !isId(unitId)) return fail(res, 400, 'Invalid unitId');

  let props = await hostProperties(hostId);
  if (propertyId) {
    props = props.filter((p) => String(p._id) === propertyId);
    if (props.length === 0) return fail(res, 404, 'Property not found');
  }
  const propertyIds = props.map((p) => p._id);

  let units = propertyIds.length
    ? await Unit.find({ property: { $in: propertyIds }, isDeleted: { $ne: true } }).select('_id property isActive').lean()
    : [];
  if (unitId) {
    units = units.filter((u) => String(u._id) === unitId);
    if (units.length === 0) return fail(res, 404, 'Unit not found');
  }

  const { start, end } = monthRange(year, month);
  const scope = { property: { $in: propertyIds }, status: { $in: EARNING_STATUSES } };
  if (unitId) scope.unit = new mongoose.Types.ObjectId(unitId);

  const [inMonth, overlapping] = propertyIds.length
    ? await Promise.all([
        Booking.find({ ...scope, checkIn: { $gte: start, $lt: end } }).select('pricing').lean(),
        Booking.find({ ...scope, checkIn: { $lt: end }, checkOut: { $gt: start } }).select('checkIn checkOut').lean(),
      ])
    : [[], []];

  // Revenue = what the host receives (after the platform commission).
  const totalRevenue = round2(inMonth.reduce((s, b) => s + hostPayoutOf(b.pricing), 0));
  const nights = inMonth.reduce((s, b) => s + (b.pricing?.nights || 0), 0);
  const nightsValue = inMonth.reduce((s, b) => s + (b.pricing?.perNight || 0) * (b.pricing?.nights || 0), 0);

  const bookedNights = overlapping.reduce((s, b) => {
    const from = Math.max(new Date(b.checkIn).getTime(), start.getTime());
    const to = Math.min(new Date(b.checkOut).getTime(), end.getTime());
    return s + Math.max(0, Math.round((to - from) / DAY_MS));
  }, 0);
  const daysInMonth = Math.round((end - start) / DAY_MS);
  // A property without units is rented as a whole: counts as one rentable unit.
  let rentable;
  if (unitId) rentable = 1;
  else {
    const withUnits = new Set(units.map((u) => String(u.property)));
    rentable = units.filter((u) => u.isActive !== false).length + props.filter((p) => !withUnits.has(String(p._id))).length;
  }
  const availableNights = rentable * daysInMonth;
  const occupancyRate = availableNights > 0 ? Math.min(100, round2((bookedNights / availableNights) * 100)) : 0;

  res.json({
    success: true,
    data: {
      period: `${year}-${pad2(month)}`,
      propertyId: propertyId || undefined,
      unitId: unitId || undefined,
      totalRevenue,
      totalBookings: inMonth.length,
      averageNightRate: nights > 0 ? round2(nightsValue / nights) : 0,
      occupancyRate,
      data: { currency: 'SAR', nights, bookedNights, availableNights, rentableUnits: rentable, daysInMonth },
    },
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// VAT registration numbers (Host.vatEntries, one per property)
// ═══════════════════════════════════════════════════════════════════════════════
const vatEntriesFor = async (hostId) => {
  const host = await Host.findById(hostId).select('vatEntries').lean();
  const entries = host?.vatEntries || [];
  if (entries.length === 0) return [];
  const props = await hostProperties(hostId, '_id title titleAr');
  const titles = new Map(props.map((p) => [String(p._id), p.titleAr || p.title || '']));
  return entries
    .filter((e) => titles.has(String(e.property)))
    .map((e) => ({
      id: String(e._id),
      propertyId: String(e.property),
      propertyName: titles.get(String(e.property)),
      taxNumber: e.taxNumber,
      verified: Boolean(e.verified),
    }));
};

router.get('/vat', wrap(async (req, res) => {
  res.json({ success: true, data: await vatEntriesFor(req.user._id) });
}));

router.post('/vat', wrap(async (req, res) => {
  if (req.user.userType !== 'host') return fail(res, 403, 'Only hosts can register a VAT number');
  const body = req.body || {};
  const propertyId = body.propertyId;
  // Accept Arabic-Indic digits typed on an Arabic keyboard.
  const taxNumber = (typeof body.taxNumber === 'string' || typeof body.taxNumber === 'number' ? String(body.taxNumber) : '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\s-]/g, '');

  if (!isId(propertyId)) return fail(res, 400, 'Invalid propertyId');
  // ZATCA VAT registration number: 15 digits, starts and ends with 3.
  if (!/^3\d{13}3$/.test(taxNumber)) {
    return fail(res, 400, 'الرقم الضريبي يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3');
  }
  const property = await Property.findOne({ _id: propertyId, host: req.user._id, isDeleted: { $ne: true } }).select('_id').lean();
  if (!property) return fail(res, 404, 'Property not found');

  // One entry per property: replace the number (and drop verification) if one
  // exists, otherwise add. `verified` is never taken from the request.
  const updated = await Host.updateOne(
    { _id: req.user._id, 'vatEntries.property': property._id },
    { $set: { 'vatEntries.$.taxNumber': taxNumber, 'vatEntries.$.verified': false } }
  );
  if (!updated.matchedCount) {
    await Host.updateOne(
      { _id: req.user._id, 'vatEntries.property': { $ne: property._id } },
      { $push: { vatEntries: { property: property._id, taxNumber, verified: false } } }
    );
  }

  const entries = await vatEntriesFor(req.user._id);
  res.status(201).json({ success: true, data: entries.find((e) => e.propertyId === String(property._id)) || null });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Weekly performance reports — aggregated on demand, nothing is stored.
// Weeks run Sunday..Saturday in Saudi time (UTC+3); id = week start YYYY-MM-DD.
// Listing views/clicks and weekly points are not tracked anywhere on the
// platform, so those are null rather than made-up numbers.
// ═══════════════════════════════════════════════════════════════════════════════
const KSA_OFFSET_MS = 3 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const REPORT_WEEKS = 8;
const MAX_REPORT_AGE_WEEKS = 104;

// UTC instant of the Sunday 00:00 (KSA) that starts the week containing `date`.
const weekStartOf = (date) => {
  const local = new Date(date.getTime() + KSA_OFFSET_MS);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnight - local.getUTCDay() * DAY_MS - KSA_OFFSET_MS);
};
const ksaDay = (instant) => new Date(instant.getTime() + KSA_OFFSET_MS).toISOString().slice(0, 10);
const avg = (list) => (list.length ? Math.round((list.reduce((s, n) => s + n, 0) / list.length) * 10) / 10 : 0);
const formatMinutes = (min) => {
  if (min === null) return null;
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 48 * 60) return `${Math.round((min / 60) * 10) / 10}h`;
  return `${Math.round((min / 1440) * 10) / 10}d`;
};

// Builds one report per week start (array of Date, UTC instants).
const buildWeeklyReports = async (hostId, weekStarts) => {
  const from = new Date(Math.min(...weekStarts.map((d) => d.getTime())));
  const to = new Date(Math.max(...weekStarts.map((d) => d.getTime())) + WEEK_MS);
  const props = await hostProperties(hostId);
  const propertyIds = props.map((p) => p._id);
  const created = { createdAt: { $gte: from, $lt: to } };

  const [bookings, reviews, complaints, conversations] = await Promise.all([
    propertyIds.length
      ? Booking.find({ property: { $in: propertyIds }, status: { $ne: 'held' }, ...created })
          .select('status pricing createdAt').lean()
      : [],
    propertyIds.length
      ? Review.find({ property: { $in: propertyIds }, ...created }).select('ratings createdAt').lean()
      : [],
    Report.find({
      $or: [
        ...(propertyIds.length ? [{ targetType: 'property', targetId: { $in: propertyIds } }] : []),
        { targetType: 'user', targetId: hostId },
      ],
      ...created,
    }).select('createdAt').lean(),
    Conversation.find({ 'participants.user': hostId }).select('_id').lean(),
  ]);

  // Guest messages in range, plus any host message from the range start on
  // (a reply may land after the week ends).
  const conversationIds = conversations.map((c) => c._id);
  const messages = conversationIds.length
    ? await Message.find({
        conversation: { $in: conversationIds },
        messageType: 'text',
        isDeleted: { $ne: true },
        createdAt: { $gte: from },
      }).select('conversation sender senderType createdAt').sort({ createdAt: 1 }).lean()
    : [];
  const byConversation = new Map();
  messages.forEach((m) => {
    const key = String(m.conversation);
    if (!byConversation.has(key)) byConversation.set(key, []);
    byConversation.get(key).push(m);
  });
  const isHostMsg = (m) => String(m.sender) === String(hostId);

  return weekStarts.map((start) => {
    const end = new Date(start.getTime() + WEEK_MS);
    const inWeek = (d) => d >= start && d < end;

    const wb = bookings.filter((b) => inWeek(b.createdAt));
    const confirmed = wb.filter((b) => EARNING_STATUSES.includes(b.status));
    const wr = reviews.filter((r) => inWeek(r.createdAt));
    const rating = (field) => avg(wr.map((r) => r.ratings?.[field]).filter((n) => typeof n === 'number'));

    let total = 0;
    let replied = 0;
    const responseMinutes = [];
    byConversation.forEach((list) => {
      const firstGuest = list.find((m) => !isHostMsg(m) && m.senderType === 'Guest' && inWeek(m.createdAt));
      if (!firstGuest) return;
      total += 1;
      const reply = list.find((m) => isHostMsg(m) && m.createdAt > firstGuest.createdAt);
      if (reply) {
        replied += 1;
        responseMinutes.push((reply.createdAt - firstGuest.createdAt) / 60000);
      }
    });
    const avgMinutes = responseMinutes.length
      ? Math.round(responseMinutes.reduce((s, n) => s + n, 0) / responseMinutes.length)
      : null;

    return {
      id: ksaDay(start),
      weekStart: start.toISOString(),
      weekEnd: new Date(end.getTime() - 1).toISOString(),
      views: null, // not tracked
      clicks: null, // not tracked
      conversionRate: null, // needs views
      sales: round2(confirmed.reduce((s, b) => s + hostPayoutOf(b.pricing), 0)),
      totalBookings: wb.length,
      confirmedBookings: confirmed.length,
      ratings: {
        count: wr.length,
        overall: rating('overall'),
        cleanliness: rating('cleanliness'),
        condition: null, // reviews have no such criterion
        information: rating('accuracy'),
        service: rating('communication'),
        location: rating('location'),
        value: rating('value'),
      },
      points: null, // no weekly points are computed for hosts
      conversations: {
        total,
        replied,
        responseRate: total > 0 ? Math.round((replied / total) * 100) : 0,
        avgResponseTime: formatMinutes(avgMinutes),
        avgResponseMinutes: avgMinutes,
      },
      complaints: complaints.filter((c) => inWeek(c.createdAt)).length,
    };
  });
};

router.get('/reports/weekly', wrap(async (req, res) => {
  const current = weekStartOf(new Date());
  const weekStarts = Array.from({ length: REPORT_WEEKS }, (_, i) => new Date(current.getTime() - i * WEEK_MS));
  res.json({ success: true, data: await buildWeeklyReports(req.user._id, weekStarts) });
}));

router.get('/reports/weekly/:id', wrap(async (req, res) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(req.params.id);
  const day = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!day || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== req.params.id) {
    return fail(res, 400, 'Invalid report id');
  }
  // Midday KSA of that day -> the week that contains it.
  const start = weekStartOf(new Date(day.getTime() + 12 * 60 * 60 * 1000 - KSA_OFFSET_MS));
  const current = weekStartOf(new Date());
  if (start > current || start < new Date(current.getTime() - MAX_REPORT_AGE_WEEKS * WEEK_MS)) {
    return fail(res, 404, 'Report not found');
  }
  const [report] = await buildWeeklyReports(req.user._id, [start]);
  res.json({ success: true, data: report });
}));

module.exports = router;
