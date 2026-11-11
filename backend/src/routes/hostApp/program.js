// Host mobile app compatibility routes (program). Mounted under /api/v1/host
// after protect + authorize('host', 'admin') — see routes/host.js.
//
// Ambassador programme, protection claims, suggestions, host terms, NPS and
// the "not available yet" endpoints (managers, referral links, change requests).
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Host = require('../../models/Host');
const Booking = require('../../models/Booking');
const Property = require('../../models/Property');
const HostSuggestion = require('../../models/HostSuggestion');
const HostSuggestionVote = require('../../models/HostSuggestionVote');
const HostNpsResponse = require('../../models/HostNpsResponse');
const HostClaim = require('../../models/HostClaim');
const { getLoyaltyStatus } = require('../../controllers/hostLoyaltyController');
const { sanitizeHtml, sanitizeText } = require('../../utils/sanitize');

const isId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/i.test(v);
const cleanText = (v, max) => {
  if (typeof v !== 'string') return '';
  return sanitizeText(sanitizeHtml(v)).slice(0, max);
};

// ═════════════════════════════════════════════════════════════════════
// Ambassador programme — the mobile view of the website's host loyalty
// page. All numbers come from hostLoyaltyController (single source of truth).
// ═════════════════════════════════════════════════════════════════════

// The app calls the top tier "peak"; the server calls it "summit".
const appLevel = (tier) => (tier === 'summit' ? 'peak' : tier);

// App indicator key → loyalty metric key.
const INDICATOR_KEYS = {
  confirmedNights: 'confirmedNights',
  averageRating: 'averageReviews',
  unitAvailability: 'unitAvailability',
  guestReviewPercent: 'bookingsRatedByGuests',
  hostReviewPercent: 'bookingsYouRated',
  cancelledBookings: 'cancelledBookings',
};
const PERCENT_METRICS = ['unitAvailability', 'bookingsRatedByGuests', 'bookingsYouRated'];

// Benefit labels, same wording as the website loyalty page.
const BENEFIT_LABELS = {
  hasCertificate: { en: 'Certificate', ar: 'شهادة' },
  hasBadge: { en: 'Badge', ar: 'شارة' },
  hasMonthlyReport: { en: 'Monthly Report', ar: 'تقرير شهري' },
};

// FAQ — the exact text of the website's host loyalty page
// (frontend/src/app/host/loyalty/page.tsx, FAQ_ITEMS).
const FAQ_ITEMS = [
  {
    q: { en: 'What is the Host Loyalty Program?', ar: 'ما هو برنامج ولاء المضيف؟' },
    a: {
      en: 'It is a quarterly program that evaluates your performance across all your units and assigns you a tier (Basic, Silver, Gold, Summit) with increasing benefits.',
      ar: 'هو برنامج ربع سنوي يقيّم أداءك عبر جميع وحداتك ويمنحك فئة (اساسي، فضي، ذهبي، القمة) مع مزايا متزايدة.',
    },
  },
  {
    q: { en: 'How is my tier determined?', ar: 'كيف يتم تحديد فئتي؟' },
    a: {
      en: 'Your tier equals your weakest metric. You must meet all 6 metric thresholds for a tier to achieve it.',
      ar: 'فئتك تساوي أضعف مؤشر لديك. يجب أن تحقق جميع المؤشرات الستة لفئة معينة للوصول إليها.',
    },
  },
  {
    q: { en: 'When are the metrics updated?', ar: 'متى يتم تحديث المؤشرات؟' },
    a: {
      en: 'Metrics are recalculated once daily and evaluated quarterly (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec).',
      ar: 'يتم إعادة حساب المؤشرات مرة واحدة يومياً وتقييمها ربع سنوي (يناير-مارس، أبريل-يونيو، يوليو-سبتمبر، أكتوبر-ديسمبر).',
    },
  },
  {
    q: { en: 'What benefits do I get?', ar: 'ما المزايا التي أحصل عليها؟' },
    a: {
      en: 'Benefits include cashback on earnings, bonus points, achievement certificates, profile badges, and monthly performance reports depending on your tier.',
      ar: 'تشمل المزايا كاش باك على الأرباح، نقاط إضافية، شهادات إنجاز، شارات الملف الشخصي، وتقارير أداء شهرية حسب فئتك.',
    },
  },
  {
    q: { en: 'Can my tier go down?', ar: 'هل يمكن أن تنخفض فئتي؟' },
    a: {
      en: 'Yes, tiers are re-evaluated each quarter based on your latest performance. If your metrics drop, your tier may decrease.',
      ar: 'نعم، يتم إعادة تقييم الفئات كل ربع سنة بناءً على أدائك الأخير. إذا انخفضت مؤشراتك، قد تنخفض فئتك.',
    },
  },
  {
    q: { en: 'What does "cancelled bookings" metric mean?', ar: 'ماذا يعني مؤشر "الحجوزات الملغاة"؟' },
    a: {
      en: 'This counts the number of bookings cancelled during the quarter. Unlike other metrics, lower is better here — fewer cancellations earn a higher tier.',
      ar: 'يحسب عدد الحجوزات الملغاة خلال الربع. بخلاف المؤشرات الأخرى، الأقل هنا أفضل — إلغاءات أقل تعني فئة أعلى.',
    },
  },
];

const langOf = (req) => (req.query.lang === 'en' ? 'en' : 'ar');

// Runs the real loyalty controller for this host and returns what it would
// have sent ({ statusCode, body }) so the routes below can reshape it.
function loadLoyalty(req, quarter) {
  return new Promise((resolve, reject) => {
    const fakeReq = { user: req.user, query: quarter ? { quarter } : {} };
    const fakeRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ statusCode: this.statusCode, body }); return this; },
    };
    Promise.resolve(getLoyaltyStatus(fakeReq, fakeRes, reject)).catch(reject);
  });
}

function tierView(loyalty, tier, lang) {
  const b = loyalty.tierBenefits[tier] || {};
  const label = loyalty.tierLabels[tier] || {};
  return {
    level: appLevel(tier),
    nameAr: label.ar,
    nameEn: label.en,
    cashbackPercent: b.cashbackPercent || 0,
    bonusPoints: b.bonusPoints || 0,
    benefits: Object.keys(BENEFIT_LABELS)
      .filter((k) => b[k])
      .map((k) => BENEFIT_LABELS[k][lang]),
  };
}

// GET /host/program/status — the host's current tier this quarter
router.get('/program/status', async (req, res, next) => {
  try {
    const { statusCode, body } = await loadLoyalty(req);
    if (!body.success) return res.status(statusCode).json(body);
    const l = body.data;
    const tier = tierView(l, l.tier, langOf(req));
    res.json({
      success: true,
      data: { ...tier, tier, quarter: l.quarter, quarterLabel: l.displayLabel },
    });
  } catch (error) {
    next(error);
  }
});

// GET /host/program/tiers — all tiers and their rewards
router.get('/program/tiers', async (req, res, next) => {
  try {
    const { statusCode, body } = await loadLoyalty(req);
    if (!body.success) return res.status(statusCode).json(body);
    const l = body.data;
    res.json({ success: true, data: l.tiers.map((t) => tierView(l, t, langOf(req))) });
  } catch (error) {
    next(error);
  }
});

// GET /host/ambassador/indicators?quarter=2026-Q4 — the six performance metrics
router.get('/ambassador/indicators', async (req, res, next) => {
  try {
    const quarter = typeof req.query.quarter === 'string' && req.query.quarter ? req.query.quarter : undefined;
    const { statusCode, body } = await loadLoyalty(req, quarter);
    if (!body.success) return res.status(statusCode).json(body);
    const l = body.data;
    const data = {};
    for (const [appKey, key] of Object.entries(INDICATOR_KEYS)) {
      const metric = l.metrics[key] || { value: 0, tier: 'basic' };
      data[appKey] = {
        value: metric.value,
        // [basic, silver, gold, peak]
        thresholds: l.tiers.map((t) => l.thresholds[key][t]),
        tier: appLevel(metric.tier),
        // true = lower is better (cancelled bookings)
        reverse: key === 'cancelledBookings',
      };
    }
    data.quarter = l.quarter;
    data.quarterLabel = l.displayLabel;
    data.availableQuarters = l.availableQuarters;
    data.level = appLevel(l.tier);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /host/ambassador/comparison — requirements and rewards per tier
router.get('/ambassador/comparison', async (req, res, next) => {
  try {
    const { statusCode, body } = await loadLoyalty(req);
    if (!body.success) return res.status(statusCode).json(body);
    const l = body.data;
    const lang = langOf(req);
    const tiers = l.tiers.map((t) => {
      const view = tierView(l, t, lang);
      const requirements = {};
      for (const key of Object.keys(l.thresholds)) {
        const val = l.thresholds[key][t];
        requirements[l.metricLabels[key][lang]] = PERCENT_METRICS.includes(key) ? `${val}%` : String(val);
      }
      return {
        level: view.level,
        name: view.nameEn,
        nameAr: view.nameAr,
        requirements,
        cashbackPercent: view.cashbackPercent,
        bonusPoints: view.bonusPoints,
        benefits: view.benefits,
      };
    });
    res.json({ success: true, data: { tiers } });
  } catch (error) {
    next(error);
  }
});

// GET /host/ambassador/faq
router.get('/ambassador/faq', (req, res) => {
  const lang = langOf(req);
  res.json({
    success: true,
    data: { items: FAQ_ITEMS.map((f) => ({ question: f.q[lang], answer: f.a[lang] })) },
  });
});

// GET /host/ambassador/terms — no programme terms have been published yet
// (the website has none either), so this is empty rather than invented.
router.get('/ambassador/terms', (req, res) => {
  res.json({ success: true, data: { sections: [] } });
});

// ═════════════════════════════════════════════════════════════════════
// Host protection programme — claims
// ═════════════════════════════════════════════════════════════════════

const claimView = (c) => ({
  id: String(c._id),
  reservationId: c.booking && c.booking._id ? String(c.booking._id) : String(c.booking),
  reservationReference: c.booking && c.booking.reference ? c.booking.reference : undefined,
  status: c.status,
  amountRequested: c.amountRequested,
  approvedAmount: c.approvedAmount,
  description: c.description || '',
  evidenceUrls: c.evidenceUrls || [],
  adminNote: c.adminNote || undefined,
  submittedAt: c.createdAt,
});

// GET /host/protection-program — this host's real claim totals for the year.
// Programme limits are not defined anywhere on the server, so they are null.
router.get('/protection-program', async (req, res, next) => {
  try {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const claims = await HostClaim.find({ host: req.user._id, createdAt: { $gte: yearStart } })
      .select('status approvedAmount')
      .lean();
    res.json({
      success: true,
      data: {
        claimsThisYear: claims.length,
        openClaims: claims.filter((c) => c.status === 'pending' || c.status === 'under_review').length,
        totalCompensated: claims
          .filter((c) => c.status === 'approved')
          .reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
        maxClaimsPerYear: null,
        maxCompensationPerYear: null,
        maxPerClaim: null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /host/claims — this host's claims
router.get('/claims', async (req, res, next) => {
  try {
    const claims = await HostClaim.find({ host: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('booking', 'reference')
      .lean();
    res.json({ success: true, data: claims.map(claimView) });
  } catch (error) {
    next(error);
  }
});

// POST /host/claims { reservationId, amountRequested, description?, evidenceUrls? }
router.post('/claims', async (req, res, next) => {
  try {
    const body = req.body || {};
    const rawRef = typeof body.reservationId === 'string' ? body.reservationId.trim()
      : typeof body.bookingId === 'string' ? body.bookingId.trim() : '';
    if (!rawRef || rawRef.length > 40) {
      return res.status(400).json({ success: false, message: 'رقم الحجز مطلوب' });
    }

    const amount = Number(body.amountRequested);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return res.status(400).json({ success: false, message: 'مبلغ المطالبة غير صحيح' });
    }

    let evidenceUrls = [];
    if (body.evidenceUrls !== undefined) {
      if (!Array.isArray(body.evidenceUrls) || body.evidenceUrls.length > 10) {
        return res.status(400).json({ success: false, message: 'مرفقات المطالبة غير صحيحة' });
      }
      for (const u of body.evidenceUrls) {
        if (typeof u !== 'string' || u.length > 500 || !/^https:\/\/[^\s<>"']+$/i.test(u)) {
          return res.status(400).json({ success: false, message: 'مرفقات المطالبة غير صحيحة' });
        }
      }
      evidenceUrls = body.evidenceUrls;
    }

    // The booking must be on one of this host's properties.
    const booking = await Booking.findOne(isId(rawRef) ? { _id: rawRef } : { reference: rawRef.toUpperCase() })
      .select('_id property reference status checkIn checkOut pricing.total')
      .lean();
    const owned = booking && (await Property.exists({ _id: booking.property, host: req.user._id }));
    if (!owned) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    // A claim is for a stay that actually took place, filed within 14 days of
    // check-out, and for no more than a sane multiple of what the stay cost.
    const now = new Date();
    const stayed = ['confirmed', 'completed'].includes(booking.status) && new Date(booking.checkIn) <= now;
    if (!stayed) {
      return res.status(400).json({ success: false, message: 'يمكن تقديم المطالبة بعد بدء إقامة الضيف فقط' });
    }
    if (now.getTime() - new Date(booking.checkOut).getTime() > 14 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'انتهت مهلة تقديم المطالبة (14 يوماً بعد المغادرة)' });
    }
    if (amount > Math.max(5000, (booking.pricing?.total || 0) * 3)) {
      return res.status(400).json({ success: false, message: 'مبلغ المطالبة أكبر من الحد المسموح' });
    }

    const open = await HostClaim.exists({
      host: req.user._id,
      booking: booking._id,
      status: { $in: ['pending', 'under_review'] },
    });
    if (open) {
      return res.status(409).json({ success: false, message: 'توجد مطالبة قيد المراجعة لهذا الحجز' });
    }

    const claim = await HostClaim.create({
      host: req.user._id,
      booking: booking._id,
      property: booking.property,
      amountRequested: Math.round(amount * 100) / 100,
      description: cleanText(body.description, 2000),
      evidenceUrls,
    });
    const view = claimView(claim.toObject());
    view.reservationReference = booking.reference;
    res.status(201).json({ success: true, data: view });
  } catch (error) {
    next(error);
  }
});

// ═════════════════════════════════════════════════════════════════════
// Host suggestions + votes
// ═════════════════════════════════════════════════════════════════════

const VOTES = ['important', 'moderate', 'not_important'];
const SUGGESTIONS_PER_DAY = 5;

async function suggestionViews(suggestions, userId) {
  const ids = suggestions.map((s) => s._id);
  const [counts, mine] = await Promise.all([
    HostSuggestionVote.aggregate([
      { $match: { suggestion: { $in: ids } } },
      { $group: { _id: { s: '$suggestion', v: '$vote' }, n: { $sum: 1 } } },
    ]),
    HostSuggestionVote.find({ suggestion: { $in: ids }, host: userId }).select('suggestion vote').lean(),
  ]);
  const tally = {};
  for (const c of counts) {
    const key = String(c._id.s);
    tally[key] = tally[key] || { important: 0, moderate: 0, not_important: 0 };
    tally[key][c._id.v] = c.n;
  }
  const myVote = {};
  for (const m of mine) myVote[String(m.suggestion)] = m.vote;

  return suggestions.map((s) => {
    const t = tally[String(s._id)] || { important: 0, moderate: 0, not_important: 0 };
    const total = t.important + t.moderate + t.not_important;
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
    // Other hosts only see the author's first name.
    const fullName = s.host && typeof s.host.name === 'string' ? s.host.name.trim() : '';
    return {
      id: String(s._id),
      hostName: fullName ? fullName.split(/\s+/)[0] : 'مضيف',
      isMine: String(s.host && s.host._id ? s.host._id : s.host) === String(userId),
      text: s.text,
      createdAt: s.createdAt,
      votes: { important: t.important, moderate: t.moderate, notImportant: t.not_important },
      percentages: { important: pct(t.important), moderate: pct(t.moderate), notImportant: pct(t.not_important) },
      currentUserVote: myVote[String(s._id)],
      platformResponse: s.platformResponse || undefined,
      status: s.status,
    };
  });
}

// GET /host/suggestions — latest suggestions from all hosts
router.get('/suggestions', async (req, res, next) => {
  try {
    const suggestions = await HostSuggestion.find({ isHidden: false })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('host', 'name')
      .lean();
    res.json({ success: true, data: await suggestionViews(suggestions, req.user._id) });
  } catch (error) {
    next(error);
  }
});

// POST /host/suggestions { text }
router.post('/suggestions', async (req, res, next) => {
  try {
    const text = cleanText(req.body && req.body.text, 1000);
    if (text.length < 3) {
      return res.status(400).json({ success: false, message: 'نص المقترح مطلوب' });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await HostSuggestion.countDocuments({ host: req.user._id, createdAt: { $gte: since } });
    if (recent >= SUGGESTIONS_PER_DAY) {
      return res.status(429).json({ success: false, message: 'وصلت للحد الأقصى من المقترحات اليوم، حاول غداً' });
    }
    const created = await HostSuggestion.create({ host: req.user._id, text });
    const doc = created.toObject();
    doc.host = { _id: req.user._id, name: req.user.name };
    const [view] = await suggestionViews([doc], req.user._id);
    res.status(201).json({ success: true, data: view });
  } catch (error) {
    next(error);
  }
});

// POST /host/suggestions/:id/vote { vote } — one vote per host; voting again
// changes the earlier vote.
router.post('/suggestions/:id/vote', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'المقترح غير موجود' });
    }
    const vote = req.body && req.body.vote;
    if (typeof vote !== 'string' || !VOTES.includes(vote)) {
      return res.status(400).json({ success: false, message: 'قيمة التصويت غير صحيحة' });
    }
    const suggestion = await HostSuggestion.findOne({ _id: req.params.id, isHidden: false })
      .populate('host', 'name')
      .lean();
    if (!suggestion) {
      return res.status(404).json({ success: false, message: 'المقترح غير موجود' });
    }
    try {
      await HostSuggestionVote.updateOne(
        { suggestion: suggestion._id, host: req.user._id },
        { $set: { vote } },
        { upsert: true, runValidators: true }
      );
    } catch (err) {
      // Two simultaneous first votes: the unique index kept one; apply this one to it.
      if (err && err.code === 11000) {
        await HostSuggestionVote.updateOne({ suggestion: suggestion._id, host: req.user._id }, { $set: { vote } });
      } else {
        throw err;
      }
    }
    const [view] = await suggestionViews([suggestion], req.user._id);
    res.json({ success: true, data: view });
  } catch (error) {
    next(error);
  }
});

// ═════════════════════════════════════════════════════════════════════
// Host usage agreement — acceptance record
// ═════════════════════════════════════════════════════════════════════

// The agreement text is not stored on the server (the app shows its own
// copy), so `articles` is empty and `version` blank; only the host's real
// acceptance is tracked here.
const termsView = (acceptedAt) => ({
  signed: Boolean(acceptedAt),
  signedDate: acceptedAt ? new Date(acceptedAt).toISOString().slice(0, 10) : undefined,
  signedAt: acceptedAt || undefined,
  version: '',
  articles: [],
});

// GET /host/terms
router.get('/terms', async (req, res, next) => {
  try {
    const host = req.user.userType === 'host'
      ? await Host.findById(req.user._id).select('hostTermsAcceptedAt').lean()
      : null;
    res.json({ success: true, data: termsView(host && host.hostTermsAcceptedAt) });
  } catch (error) {
    next(error);
  }
});

// POST /host/terms/sign — records the first acceptance; later calls keep it
router.post('/terms/sign', async (req, res, next) => {
  try {
    if (req.user.userType !== 'host') {
      return res.status(403).json({ success: false, message: 'هذا الإجراء متاح للمضيفين فقط' });
    }
    await Host.updateOne(
      { _id: req.user._id, hostTermsAcceptedAt: null },
      { $set: { hostTermsAcceptedAt: new Date() } }
    );
    const host = await Host.findById(req.user._id).select('hostTermsAcceptedAt').lean();
    res.json({ success: true, data: termsView(host && host.hostTermsAcceptedAt) });
  } catch (error) {
    next(error);
  }
});

// ═════════════════════════════════════════════════════════════════════
// NPS survey
// ═════════════════════════════════════════════════════════════════════

const NPS_ANSWER_INTERVAL_DAYS = 90; // ask again 90 days after an answer
const NPS_PROMPT_INTERVAL_DAYS = 14; // after a dismissed prompt, wait 14 days
const DAY_MS = 24 * 60 * 60 * 1000;

// GET /host/nps/should-show — the app opens the survey when this is true.
// Saying "true" is recorded so a dismissed survey does not reappear on
// every launch.
router.get('/nps/should-show', async (req, res, next) => {
  try {
    if (req.user.userType !== 'host') {
      return res.json({ success: true, data: { shouldShow: false } });
    }
    const now = Date.now();
    const [host, lastAnswer] = await Promise.all([
      Host.findById(req.user._id).select('npsLastPromptedAt createdAt').lean(),
      HostNpsResponse.findOne({ host: req.user._id }).sort({ createdAt: -1 }).select('createdAt').lean(),
    ]);
    const answeredRecently = lastAnswer && now - new Date(lastAnswer.createdAt).getTime() < NPS_ANSWER_INTERVAL_DAYS * DAY_MS;
    const promptedRecently = host && host.npsLastPromptedAt
      && now - new Date(host.npsLastPromptedAt).getTime() < NPS_PROMPT_INTERVAL_DAYS * DAY_MS;
    // A brand-new host has nothing to rate yet.
    const tooNew = !host || !host.createdAt || now - new Date(host.createdAt).getTime() < NPS_PROMPT_INTERVAL_DAYS * DAY_MS;

    const shouldShow = !answeredRecently && !promptedRecently && !tooNew;
    if (shouldShow) {
      await Host.updateOne({ _id: req.user._id }, { $set: { npsLastPromptedAt: new Date() } });
    }
    res.json({ success: true, data: { shouldShow } });
  } catch (error) {
    next(error);
  }
});

// POST /host/nps { rating, comment? }
router.post('/nps', async (req, res, next) => {
  try {
    if (req.user.userType !== 'host') {
      return res.status(403).json({ success: false, message: 'هذا الإجراء متاح للمضيفين فقط' });
    }
    const body = req.body || {};
    const rating = typeof body.rating === 'number' ? body.rating : Number.NaN;
    if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
      return res.status(400).json({ success: false, message: 'التقييم يجب أن يكون رقماً من 0 إلى 10' });
    }
    // One answer a day at most (double taps, retries).
    const recent = await HostNpsResponse.exists({ host: req.user._id, createdAt: { $gte: new Date(Date.now() - DAY_MS) } });
    if (recent) {
      return res.status(409).json({ success: false, message: 'تم استلام تقييمك مسبقاً، شكراً لك' });
    }
    const comment = cleanText(body.comment, 1000);
    const created = await HostNpsResponse.create({ host: req.user._id, rating, comment: comment || null });
    res.status(201).json({
      success: true,
      data: { id: String(created._id), rating: created.rating, comment: created.comment, createdAt: created.createdAt },
    });
  } catch (error) {
    next(error);
  }
});

// ═════════════════════════════════════════════════════════════════════
// Not available yet — these need real machinery (access rights for
// managers, reward tracking for referrals, a review flow for change
// requests). Lists are empty and writes are refused rather than faked.
// ═════════════════════════════════════════════════════════════════════

const NOT_AVAILABLE = 'هذه الخدمة غير متاحة حالياً';
const emptyList = (req, res) => res.json({ success: true, data: [] });
const notAvailable = (req, res) => res.status(501).json({ success: false, message: NOT_AVAILABLE });

router.get('/managers', emptyList);
router.post('/managers', notAvailable);
router.put('/managers/:id', notAvailable);
router.delete('/managers/:id', notAvailable);

router.get('/referral-links', emptyList);
router.post('/referral-links', notAvailable);

router.get('/change-requests', emptyList);

module.exports = router;
