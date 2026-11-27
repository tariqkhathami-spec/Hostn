#!/usr/bin/env node
/**
 * AI assistant check: authorization, confirmation gate and provider plumbing.
 * Needs no database and no model key: models are stubbed and every query
 * filter is recorded, so the check asserts that each tool scopes its query
 * to the caller. Run: node qa/ai-check.cjs
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'qa';
const path = require('path');
const assert = require('assert');
const B = path.join(__dirname, '..', 'backend', 'src');
const need = (p) => require(path.join(B, p));

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, `FAIL: ${msg}`); passed++; console.log(`PASS ${msg}`); };

// ── Stub Mongoose statics: record filters, return canned rows ───────────────
const calls = [];
function query(model, op, filter, rows) {
  calls.push({ model, op, filter });
  const q = {
    populate: () => q, select: () => q, sort: () => q, limit: () => q, skip: () => q, lean: () => q,
    then: (res, rej) => Promise.resolve(typeof rows === 'function' ? rows(filter) : rows).then(res, rej),
  };
  return q;
}
function stub(Model, name, data = {}) {
  for (const op of ['find', 'findOne', 'findById', 'countDocuments', 'exists', 'aggregate', 'findOneAndUpdate']) {
    Model[op] = (filter) => query(name, op, filter, data[op] !== undefined ? data[op] : (op === 'find' || op === 'aggregate' ? [] : null));
  }
}
const lastCall = (model, op) => [...calls].reverse().find((c) => c.model === model && c.op === op);

(async () => {
  const Booking = need('models/Booking');
  const Unit = need('models/Unit');
  const Property = need('models/Property');
  const SupportTicket = need('models/SupportTicket');
  const AiAction = need('models/AiAction');
  stub(Booking, 'Booking');
  stub(Unit, 'Unit');
  stub(Property, 'Property', { find: [{ _id: 'p-own' }] });
  stub(SupportTicket, 'SupportTicket');

  const { toolsFor, findTool } = need('services/ai/tools');
  const guest = { user: { _id: 'g1', role: 'guest' }, role: 'guest' };
  const host = { user: { _id: 'h1', role: 'host' }, role: 'host' };
  const admin = (adminRole) => ({ user: { _id: 'a1', role: 'admin', adminRole }, role: 'admin' });
  const names = (ctx) => toolsFor(ctx).map((t) => t.name);

  // Which tools each account gets
  ok(!names(guest).some((n) => ['search_bookings', 'list_tickets', 'reply_to_ticket'].includes(n)), 'guests get no admin tools');
  ok(!names(host).includes('search_bookings') && names(host).includes('unit_calendar'), 'hosts get host tools only');
  ok(names(admin('super')).includes('reply_to_ticket'), 'super admin can propose ticket replies');
  ok(!names(admin('finance')).includes('list_tickets') && names(admin('finance')).includes('search_bookings'), 'finance admin: bookings yes, support no');
  ok(names(admin('account_manager')).length === 0, 'account managers get no tools');
  ok(findTool('search_bookings', guest) === null, 'a guest cannot look up an admin tool by name');

  // Every customer query is scoped to the caller
  await findTool('booking_details', guest).run({ reference: 'hb-abc' }, guest).catch(() => {});
  let c = lastCall('Booking', 'findOne');
  ok(c.filter.guest === 'g1' && c.filter.reference === 'HB-ABC', 'booking_details filters by the guest id');
  await findTool('my_bookings', guest).run({ which: 'all' }, guest);
  ok(lastCall('Booking', 'find').filter.guest === 'g1', 'my_bookings filters by the guest id');
  await findTool('my_tickets', guest).run({}, guest);
  ok(lastCall('SupportTicket', 'find').filter.user === 'g1', 'my_tickets filters by the user id');
  await findTool('host_bookings', host).run({}, host);
  ok(lastCall('Property', 'find').filter.host === 'h1' && JSON.stringify(lastCall('Booking', 'find').filter.property) === '{"$in":["p-own"]}', 'host_bookings only covers the host\'s properties');
  let err = await findTool('unit_calendar', host).run({ unitId: 'aaaaaaaaaaaaaaaaaaaaaaaa' }, host).catch((e) => e);
  ok(JSON.stringify(lastCall('Unit', 'find').filter.property) === '{"$in":["p-own"]}' && err instanceof Error, 'unit_calendar refuses a unit the host does not own');
  err = await findTool('unit_calendar', host).run({ propertyId: 'bbbbbbbbbbbbbbbbbbbbbbbb' }, host).catch((e) => e);
  ok(err instanceof Error, 'unit_calendar refuses a property the host does not own');

  await findTool('search_stays', guest).run({ city: 'الرياض', guests: 6 }, guest);
  c = lastCall('Property', 'find').filter;
  ok(c.isActive === true && c.isApproved === true && c['capacity.maxGuests'].$gte === 6, 'search_stays only returns active, approved listings');

  // Booking attached to a ticket must belong to the caller
  Booking.findOne = (f) => query('Booking', 'findOne', f, { _id: 'b2', guest: 'someone-else', property: 'p2' });
  err = await findTool('open_support_ticket', guest).describe({ subject: 's', category: 'booking', message: 'm', bookingReference: 'HB-OTHER' }, guest).catch((e) => e);
  ok(err instanceof Error, 'a guest cannot link another guest\'s booking to a ticket');
  stub(Booking, 'Booking');

  // Host booking view hides guest fees
  const { bookingView, cancellationQuote } = need('services/ai/tools/common');
  const v = bookingView({ _id: 'b', pricing: { total: 1265, hostPayout: 950 }, guest: { name: 'سارة', phone: '05' } }, 'host');
  ok(v.total === undefined && v.hostPayout === 950 && !JSON.stringify(v).includes('05'), 'hosts see their payout, not the guest total or phone');

  // Cancellation windows
  const now = new Date('2026-12-01T08:00:00Z');
  ok(cancellationQuote('free', '2026-12-01T00:00:00Z', now).refundableIfCancelledNow === true, 'free: before noon Riyadh on check-in day is refundable');
  ok(cancellationQuote('free', '2026-12-01T00:00:00Z', new Date('2026-12-01T10:00:00Z')).refundableIfCancelledNow === false, 'free: after noon Riyadh is not');
  ok(cancellationQuote('normal', '2026-12-04', now).refundableIfCancelledNow === false, 'normal: under 4 days is not refundable');
  ok(cancellationQuote('flexible', '2026-12-04', now).refundableIfCancelledNow === true, 'flexible: over 2 days is refundable');
  ok(cancellationQuote('restricted', '2027-06-01', now).refundableIfCancelledNow === false, 'restricted: never refundable');

  // ── Assistant loop with a scripted model ───────────────────────────────────
  const anthropic = need('services/ai/providers/anthropic');
  const { runTurn, decideAction } = need('services/ai/assistant');
  let script = [];
  const seen = [];
  anthropic.complete = async (args) => {
    seen.push(JSON.parse(JSON.stringify(args)));
    return { ...(script.shift() || { content: [{ type: 'text', text: 'تمام' }], stopReason: 'end_turn' }), model: 'fake', usage: { input: 1, output: 1 } };
  };
  const toolCall = (name, input) => ({ content: [{ type: 'tool_use', id: `t_${name}`, name, input }], stopReason: 'tool_use' });
  const say = (text) => ({ content: [{ type: 'text', text }], stopReason: 'end_turn' });
  const convo = () => ({ _id: 'c1', userType: 'Guest', messages: [], pendingNotes: ['note-1'], usage: { inputTokens: 0, outputTokens: 0, turns: 0 } });
  const settings = { provider: 'anthropic', model: 'claude-opus-5-5', effort: 'low', apiKey: 'k' };
  const lastResults = () => seen[seen.length - 1].messages.at(-1).content;

  let conv = convo();
  script = [toolCall('search_bookings', {}), say('لا أقدر')];
  await runTurn({ conversation: conv, ctx: guest, settings, userText: 'اعرض كل الحجوزات' });
  ok(lastResults()[0].is_error && /غير متاحة/.test(lastResults()[0].content), 'the model asking for an admin tool as a guest is refused');
  ok(seen[0].messages[0].content[0].text.includes('note-1') && conv.pendingNotes.length === 0, 'pending notes ride on the next user message');
  ok(!seen[0].tools.some((t) => t.name === 'search_bookings'), 'admin tools are not even sent to the model for guests');

  let created = null;
  let ran = false;
  AiAction.create = async (doc) => { created = { ...doc, _id: 'act1' }; return created; };
  const realRun = findTool('open_support_ticket', guest).run;
  findTool('open_support_ticket', guest).run = async () => { ran = true; return { ticketId: 't' }; };
  conv = convo();
  script = [toolCall('open_support_ticket', { subject: 'س', category: 'other', message: 'ر' }), say('جاهزة بانتظار تأكيدك')];
  const turn = await runTurn({ conversation: conv, ctx: guest, settings, userText: 'افتح تذكرة' });
  ok(turn.actions.length === 1 && created && created.user === 'g1' && !ran, 'a write tool becomes a pending action and does not run');
  ok(/بانتظار تأكيد/.test(lastResults()[0].content), 'the model is told the action awaits confirmation');

  // Confirmation: re-checks permission, runs once
  const pending = (tool, user) => ({ _id: 'act1', tool, input: {}, status: 'pending', expiresAt: new Date(Date.now() + 1e6), user, save: async () => {} });
  let claims = 0;
  AiAction.findOneAndUpdate = async () => (++claims === 1 ? { ...pending('open_support_ticket', 'g1'), status: 'executed', save: async () => {} } : null);
  AiAction.findById = async () => ({ status: 'executed' });
  let done = await decideAction({ action: pending('open_support_ticket', 'g1'), ctx: guest, approve: true });
  ok(done.status === 'executed' && ran, 'confirmed action runs');
  ran = false;
  done = await decideAction({ action: pending('open_support_ticket', 'g1'), ctx: guest, approve: true });
  ok(!ran, 'a second confirm (double click) does not run it again');
  done = await decideAction({ action: pending('reply_to_ticket', 'a1'), ctx: admin('finance'), approve: true });
  ok(done.status === 'failed', 'confirmation re-checks the current admin permissions');
  done = await decideAction({ action: { ...pending('open_support_ticket', 'g1'), expiresAt: new Date(0) }, ctx: guest, approve: true });
  ok(done.status === 'expired', 'expired proposals cannot be confirmed');
  findTool('open_support_ticket', guest).run = realRun;

  // ── Settings and providers ─────────────────────────────────────────────────
  const { getAiSettings, publicSettings } = need('services/ai/settings');
  const env = { ...process.env };
  delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_API_KEY; delete process.env.AI_PROVIDER;
  let s = await getAiSettings();
  ok(!s.enabled && s.missing.includes('apiKey') && s.model === 'claude-opus-5-5', 'no key: assistant off, default model Claude');
  process.env.AI_PROVIDER = 'openai_compatible'; process.env.AI_API_KEY = 'secret-xyz'; process.env.AI_MODEL = 'gpt-x';
  s = await getAiSettings();
  ok(!s.enabled && s.missing.includes('baseUrl'), 'openai_compatible needs a base URL');
  process.env.AI_BASE_URL = 'https://example.test/v1';
  s = await getAiSettings();
  ok(s.enabled && !JSON.stringify(publicSettings(s)).includes('secret-xyz'), 'public settings never include the key');
  const { enabledFor } = need('services/ai/settings');
  ok(enabledFor(s, 'admin') && !enabledFor(s, 'guest') && !enabledFor(s, 'host'), 'by default only admins get the assistant');
  process.env.AI_GUEST_ENABLED = 'true'; process.env.AI_ADMIN_ENABLED = 'false';
  s = await getAiSettings();
  ok(enabledFor(s, 'guest') && !enabledFor(s, 'admin'), 'per-audience switches from the keys page apply');
  process.env = env;

  const { toOpenAiMessages } = need('services/ai/providers/openaiCompatible');
  const om = toOpenAiMessages('sys', [
    { role: 'user', content: [{ type: 'text', text: 'hi' }] },
    { role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: 'checking' }, { type: 'tool_use', id: 't1', name: 'my_bookings', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '[]' }] },
  ]);
  ok(om.length === 4 && om[2].tool_calls[0].function.name === 'my_bookings' && om[3].role === 'tool' && om[3].tool_call_id === 't1', 'transcript translates to the OpenAI format');

  const { _displayMessages } = need('controllers/aiController');
  const shown = _displayMessages({ messages: [
    { role: 'user', content: [{ type: 'text', text: '[ملاحظات النظام]\nx' }, { type: 'text', text: '[تاريخ اليوم: 2026-11-27]\nمرحبا' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'أشيك' }, { type: 'tool_use', id: 't', name: 'my_bookings', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: '[]' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'ما عندك حجوزات' }] },
  ] });
  ok(shown.length === 2 && shown[0].text === 'مرحبا' && shown[1].text === 'ما عندك حجوزات', 'chat window shows one bubble per turn, without system notes');

  console.log(`\n${passed} checks passed`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
