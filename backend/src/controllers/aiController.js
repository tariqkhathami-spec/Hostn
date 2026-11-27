const AiConversation = require('../models/AiConversation');
const AiAction = require('../models/AiAction');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../config/logger');
const { hasPermission, PERMISSIONS } = require('../config/permissions');
const { getAiSettings, publicSettings, enabledFor } = require('../services/ai/settings');
const { getProvider } = require('../services/ai/providers');
const { runTurn, decideAction, textOf } = require('../services/ai/assistant');
const { isId } = require('../services/ai/tools/common');

const TYPE = { guest: 'Guest', host: 'Host', admin: 'Admin' };
const MAX_MESSAGE_CHARS = 2000;
const MAX_TRANSCRIPT_ENTRIES = 400; // start a new conversation past this

function ctxOf(req) {
  const role = req.user.userType || req.user.role;
  return { user: req.user, role };
}

// ── Per-user limits (in memory, per instance) ────────────────────────────────
const minuteHits = new Map();
const dayHits = new Map();
function overLimit(userId, role, settings) {
  const now = Date.now();
  const key = String(userId);
  const m = minuteHits.get(key);
  if (!m || now - m.start > 60 * 1000) minuteHits.set(key, { start: now, count: 1 });
  else if (++m.count > settings.ratePerMinute) return 'minute';

  const today = new Date().toISOString().slice(0, 10);
  const d = dayHits.get(key);
  const cap = role === 'admin' ? settings.dailyLimit * 3 : settings.dailyLimit;
  if (!d || d.day !== today) dayHits.set(key, { day: today, count: 1 });
  else if (++d.count > cap) return 'day';

  if (minuteHits.size > 20000) minuteHits.clear();
  if (dayHits.size > 20000) dayHits.clear();
  return null;
}

/** Turn the raw transcript into what the chat window shows. */
function displayMessages(conversation) {
  const out = [];
  for (const m of conversation.messages || []) {
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : (m.content || []);
    if (m.role === 'user') {
      const texts = blocks.filter((b) => b.type === 'text');
      if (!texts.length) continue; // tool results
      const last = texts[texts.length - 1].text.replace(/^\[تاريخ اليوم: [^\]]*\]\n/, '');
      out.push({ role: 'user', text: last });
    } else {
      const text = textOf(blocks);
      if (!text) continue;
      // One bubble per turn: later assistant text in the same turn replaces earlier.
      if (out.length && out[out.length - 1].role === 'assistant') out[out.length - 1].text = text;
      else out.push({ role: 'assistant', text });
    }
  }
  return out;
}

const actionView = (a) => ({
  id: String(a._id), tool: a.tool, summary: a.summary, status: a.status, error: a.error || null, createdAt: a.createdAt,
});

// @route GET /api/v1/ai/status
exports.getStatus = async (req, res, next) => {
  try {
    const settings = await getAiSettings();
    const { role } = ctxOf(req);
    const data = { enabled: enabledFor(settings, role), role };
    if (role === 'admin' && hasPermission(req.user, PERMISSIONS.VIEW_DASHBOARD)) {
      data.settings = publicSettings(settings);
    }
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// @route GET /api/v1/ai/admin/overview  (usage numbers for the admin page)
exports.getAdminOverview = async (req, res, next) => {
  try {
    const settings = await getAiSettings();
    const since = (days) => new Date(Date.now() - days * 24 * 3600 * 1000);
    const usageSince = async (days) => {
      const [agg] = await AiConversation.aggregate([
        { $match: { updatedAt: { $gte: since(days) } } },
        { $group: { _id: null, conversations: { $sum: 1 }, turns: { $sum: '$usage.turns' }, inputTokens: { $sum: '$usage.inputTokens' }, outputTokens: { $sum: '$usage.outputTokens' } } },
      ]);
      return agg ? { conversations: agg.conversations, turns: agg.turns, inputTokens: agg.inputTokens, outputTokens: agg.outputTokens } : { conversations: 0, turns: 0, inputTokens: 0, outputTokens: 0 };
    };
    const [day, week, byRole, actions] = await Promise.all([
      usageSince(1),
      usageSince(7),
      AiConversation.aggregate([{ $match: { updatedAt: { $gte: since(7) } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
      AiAction.aggregate([{ $match: { createdAt: { $gte: since(7) } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const toMap = (arr) => arr.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
    res.json({
      success: true,
      data: { settings: publicSettings(settings), last24h: day, last7d: week, conversationsByRole7d: toMap(byRole), actionsByStatus7d: toMap(actions) },
    });
  } catch (e) { next(e); }
};

// @route POST /api/v1/ai/admin/test  (check the model connection with a tiny call)
exports.testConnection = async (req, res, next) => {
  try {
    const settings = await getAiSettings();
    if (!settings.enabled) {
      return res.status(400).json({ success: false, message: 'المساعد غير مفعّل', data: publicSettings(settings) });
    }
    const provider = getProvider(settings.provider);
    const started = Date.now();
    try {
      const r = await provider.complete({
        settings,
        system: 'Reply with the single word: OK',
        tools: [],
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 512,
      });
      return res.json({ success: true, data: { ok: true, model: r.model, ms: Date.now() - started } });
    } catch (err) {
      const reason = provider.classifyError(err);
      logger.warn('AI connection test failed', { provider: settings.provider, model: settings.model, reason });
      return res.status(502).json({ success: false, message: `فشل الاتصال بالمودل (${reason})`, data: { ok: false, reason } });
    }
  } catch (e) { next(e); }
};

// @route POST /api/v1/ai/chat  { message, conversationId? }
exports.chat = async (req, res, next) => {
  try {
    const ctx = ctxOf(req);
    if (!TYPE[ctx.role]) return res.status(403).json({ success: false, message: 'غير متاح' });

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ success: false, message: 'اكتب رسالتك' });
    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ success: false, message: `الرسالة أطول من ${MAX_MESSAGE_CHARS} حرف` });
    }

    const settings = await getAiSettings();
    if (!enabledFor(settings, ctx.role)) {
      return res.status(503).json({ success: false, message: 'المساعد غير مفعّل حالياً', code: 'AI_DISABLED' });
    }
    const limited = overLimit(req.user._id, ctx.role, settings);
    if (limited) {
      return res.status(429).json({
        success: false,
        code: 'AI_RATE_LIMIT',
        message: limited === 'minute' ? 'رسائل كثيرة بسرعة، انتظر دقيقة وجرّب' : 'وصلت الحد اليومي للمساعد، جرّب بكرة',
      });
    }

    let conversation = null;
    if (req.body.conversationId) {
      if (!isId(req.body.conversationId)) return res.status(400).json({ success: false, message: 'محادثة غير صالحة' });
      conversation = await AiConversation.findOne({ _id: req.body.conversationId, user: req.user._id });
      if (!conversation) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
      if (conversation.messages.length > MAX_TRANSCRIPT_ENTRIES) {
        return res.status(409).json({ success: false, code: 'AI_CONVERSATION_FULL', message: 'المحادثة طويلة، ابدأ محادثة جديدة' });
      }
    } else {
      conversation = new AiConversation({
        user: req.user._id,
        userType: TYPE[ctx.role],
        role: ctx.role,
        title: message.slice(0, 80),
      });
    }

    const started = Date.now();
    let result;
    try {
      result = await runTurn({ conversation, ctx, settings, userText: message });
    } catch (err) {
      const reason = getProvider(settings.provider).classifyError(err);
      logger.error('AI turn failed', { userId: String(req.user._id), role: ctx.role, provider: settings.provider, model: settings.model, reason, error: err.message });
      const msg = reason === 'rate_limited' ? 'المساعد مشغول الحين، جرّب بعد شوي' : 'صار خطأ في الاتصال بالمساعد، جرّب بعد شوي';
      return res.status(502).json({ success: false, code: 'AI_PROVIDER_ERROR', message: msg });
    }
    conversation.markModified('messages');
    await conversation.save();

    logger.info('AI turn', {
      userId: String(req.user._id),
      role: ctx.role,
      conversationId: String(conversation._id),
      model: conversation.lastModel,
      tools: result.toolsUsed,
      actions: result.actions.length,
      stopReason: result.stopReason,
      ms: Date.now() - started,
    });

    res.json({
      success: true,
      data: { conversationId: String(conversation._id), reply: result.reply, actions: result.actions },
    });
  } catch (e) { next(e); }
};

// @route GET /api/v1/ai/conversations
exports.listConversations = async (req, res, next) => {
  try {
    const rows = await AiConversation.find({ user: req.user._id })
      .select('title updatedAt createdAt')
      .sort('-updatedAt')
      .limit(30)
      .lean();
    res.json({ success: true, data: rows.map((c) => ({ id: String(c._id), title: c.title, updatedAt: c.updatedAt })) });
  } catch (e) { next(e); }
};

// @route GET /api/v1/ai/conversations/:id
exports.getConversation = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'محادثة غير صالحة' });
    const c = await AiConversation.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!c) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    const actions = await AiAction.find({ conversation: c._id, user: req.user._id }).sort('createdAt').lean();
    res.json({
      success: true,
      data: { id: String(c._id), title: c.title, messages: displayMessages(c), actions: actions.map(actionView) },
    });
  } catch (e) { next(e); }
};

// @route DELETE /api/v1/ai/conversations/:id
exports.deleteConversation = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'محادثة غير صالحة' });
    const c = await AiConversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!c) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    await AiAction.updateMany({ conversation: c._id, status: 'pending' }, { $set: { status: 'expired', decidedAt: new Date() } });
    res.json({ success: true });
  } catch (e) { next(e); }
};

async function decide(req, res, next, approve) {
  try {
    const ctx = ctxOf(req);
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'إجراء غير صالح' });
    const action = await AiAction.findOne({ _id: req.params.id, user: req.user._id });
    if (!action) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    if (action.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'تم التعامل مع هذا الإجراء مسبقاً', data: actionView(action) });
    }

    const done = await decideAction({ action, ctx, approve });

    // Tell the model on the next turn, without rewriting history.
    const note = done.status === 'executed'
      ? `نفّذ المستخدم الإجراء ${done._id} (${done.tool}) بنجاح.`
      : done.status === 'rejected'
        ? `رفض المستخدم الإجراء ${done._id} (${done.tool})، لم يُنفّذ.`
        : `الإجراء ${done._id} (${done.tool}) لم يُنفّذ: ${done.error || done.status}.`;
    await AiConversation.updateOne({ _id: done.conversation, user: req.user._id }, { $push: { pendingNotes: note } });

    if (done.status === 'executed') {
      ActivityLog.create({
        actor: req.user._id,
        actorType: TYPE[ctx.role],
        actorRole: ctx.role,
        actorAdminRole: req.user.adminRole || null,
        action: 'ai_action_executed',
        details: `${done.tool}: ${String(done.summary || '').slice(0, 400)}`,
        ip: req.ip,
      }).catch((err) => logger.warn('AI activity log failed', { error: err.message }));
    }
    logger.info('AI action decided', { userId: String(req.user._id), action: String(done._id), tool: done.tool, status: done.status });

    const ok = done.status === 'executed' || done.status === 'rejected';
    res.status(ok ? 200 : 400).json({ success: ok, data: actionView(done), message: ok ? undefined : (done.error || 'انتهت صلاحية الإجراء') });
  } catch (e) { next(e); }
}

// @route POST /api/v1/ai/actions/:id/confirm
exports.confirmAction = (req, res, next) => decide(req, res, next, true);
// @route POST /api/v1/ai/actions/:id/reject
exports.rejectAction = (req, res, next) => decide(req, res, next, false);

exports._displayMessages = displayMessages;
