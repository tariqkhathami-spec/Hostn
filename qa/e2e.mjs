#!/usr/bin/env node
/**
 * Hostn end-to-end check.
 *
 * Walks the real flows of the three roles (guest, host, admin) against a
 * running API and asserts on the CONTENT that comes back, not only on status
 * codes — the bugs this project keeps hitting are "the request succeeded but
 * the other side could not read it".
 *
 * Usage (local API with DEV_OTP_BYPASS and the seed accounts):
 *   node qa/e2e.mjs                       # http://localhost:5050
 *   API=http://localhost:5050 node qa/e2e.mjs
 *
 * It writes qa/.hits.json (every METHOD + route it exercised) so that
 * qa/coverage.py can report which client calls no test has touched.
 * Never point this at production: it creates bookings, tickets and listings.
 *
 * Output lines:
 *   PASS / FAIL  an ordinary check (any FAIL makes the run exit 1)
 *   KNOWN        a real defect that is already reported: see knownIssue().
 *                It is listed again at the end of every run until it is fixed.
 *   SKIP         something this run could not exercise, with the reason.
 *
 * The run is repeatable: account-level and destructive calls use throwaway
 * accounts created in the run and deleted at its end. What it cannot remove
 * (no API for it) stays in the development database: the fixed "QA Account
 * Manager" staff account, one host suggestion, contact-form messages,
 * support tickets, reports and activity-log rows per run.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = (process.env.API || 'http://localhost:5050').replace(/\/$/, '') + '/api/v1';
if (/hostn\.co|railway\.app/.test(API)) {
  console.error('Refusing to run against production.');
  process.exit(2);
}

const PHONES = { guest: '503456789', host: '509876543', admin: '501234567' };
const hits = new Set();
const results = [];
const tokens = {};
const users = {};

// Several routes are capped per IP address: send-otp 5 and verify-otp 10 per
// 15 minutes, register 5 an hour, password login 10 per 15 minutes, chat 30
// calls a minute. In real use every account is on its own phone or browser,
// so here every account calls "from its own device": the local server trusts
// X-Forwarded-For (one proxy), and each account gets one address, new on
// every run. Without it the suite could run once per 15 minutes, and two
// runs in the same minute would trip the chat limit.
const deviceIps = new Map();
function deviceIp(identity) {
  if (!deviceIps.has(identity)) {
    const n = () => Math.floor(Math.random() * 250) + 1;
    deviceIps.set(identity, `10.${n()}.${n()}.${n()}`);
  }
  return deviceIps.get(identity);
}

/**
 * opts.headers  extra request headers
 * opts.form     a FormData body (multipart) instead of JSON
 * opts.noHit    do not count this call as coverage (used for calls that only
 *               reach a refusal because the real path needs something the
 *               local server does not have)
 */
async function call(role, method, path, body, opts = {}) {
  const headers = { ...(opts.form ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) };
  if (role && tokens[role]) headers.Authorization = `Bearer ${tokens[role]}`;
  headers['X-Forwarded-For'] = deviceIp(role || String(body?.phone || body?.email || 'anonymous'));
  const res = await fetch(API + path, { method, headers, body: opts.form || (body ? JSON.stringify(body) : undefined) });
  // A rate-limited call never reached the route, so it is not coverage.
  if (!opts.noHit && res.status !== 429) hits.add(`${method} ${path.split('?')[0]}`);
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json, data: json && json.data !== undefined ? json.data : json };
}

function check(name, condition, detail = '') {
  results.push({ name, ok: !!condition, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : detail ? `  — ${detail}` : ''}`);
  return !!condition;
}

async function step(name, fn) {
  try { await fn(); } catch (e) { check(name, false, `threw: ${e.message}`); }
}

/**
 * A check for a defect that is already known and reported. `condition` is the
 * CORRECT behaviour. While the product is still wrong it prints KNOWN (with
 * the evidence) and is listed again at the end of the run, but does not fail
 * the run. Once the product is fixed it passes; then turn it into check().
 */
const knownIssues = [];
function knownIssue(name, condition, detail = '') {
  if (condition) {
    results.push({ name, ok: true, detail });
    console.log(`PASS  ${name}  (listed as a known issue, but it passes now: turn it into check())`);
    return true;
  }
  knownIssues.push({ name, detail });
  console.log(`KNOWN ${name}${detail ? `  — ${detail}` : ''}`);
  return false;
}

/** Something this run could not exercise (says why); never counted as passed. */
const skipped = [];
function skip(name, reason) {
  skipped.push({ name, reason });
  console.log(`SKIP  ${name}  — ${reason}`);
}

const brief = (r, n = 180) => `status ${r.status} ${JSON.stringify(r.json).slice(0, n)}`;
const idOf = (x) => String(x?._id || x?.id || x || '');
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

const hasArabic = (s) => /[؀-ۿ]/.test(String(s || ''));
const iso = (d) => d.toISOString().slice(0, 10);
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

async function login(role) {
  const phone = PHONES[role];
  const extra = role === 'guest' ? {} : { role };
  await call(null, 'POST', '/auth/send-otp', { phone, ...extra });
  const r = await call(null, 'POST', '/auth/verify-otp', { phone, otp: '0000', ...extra });
  tokens[role] = r.json?.token;
  users[role] = r.json?.user;
  check(`sign in as ${role}`, r.status === 200 && tokens[role] && users[role]?.role === role, `status ${r.status} role ${users[role]?.role}`);
}

/** Book a free one-night slot far in the future for the given unit. */
async function bookUnit(unit) {
  const propertyId = unit.property?._id || unit.property;
  for (let attempt = 0; attempt < 12; attempt++) {
    const start = new Date(Date.now() + (60 + Math.floor(Math.random() * 300)) * 86400000);
    const body = {
      propertyId, unitId: unit._id,
      checkIn: iso(start), checkOut: iso(new Date(start.getTime() + 86400000)),
      guests: { adults: 1 },
    };
    const hold = await call('guest', 'POST', '/bookings/hold', body);
    if (hold.status === 400 && hold.json?.code === 'DATES_UNAVAILABLE') continue;
    const holdId = hold.data?._id || hold.data?.holdId || hold.data?.hold?._id;
    check('dates are held for the guest', hold.status < 300 && holdId, `status ${hold.status} ${JSON.stringify(hold.json).slice(0, 160)}`);
    const made = await call('guest', 'POST', '/bookings', { ...body, holdId });
    const booking = made.data?.booking || made.data;
    check('booking is created from the hold with a positive total', made.status < 300 && booking?._id && booking?.pricing?.total > 0, `status ${made.status} ${JSON.stringify(made.json).slice(0, 160)}`);
    // Commission: 10% service fee from the guest, 5% from the host, both on
    // the stay after discount; the host never receives the fee or the VAT.
    const pr = booking?.pricing || {};
    const stay = (pr.subtotal || 0) - (pr.discount || 0);
    const near = (a, b) => Math.abs(a - b) < 0.011;
    check('guest pays a 10% service fee and 15% VAT on top', near(pr.serviceFee, stay * 0.10) && near(pr.vat, (stay + (pr.cleaningFee || 0) + stay * 0.10) * 0.15) && near(pr.total, (stay + (pr.cleaningFee || 0) + stay * 0.10) * 1.15), JSON.stringify(pr));
    check('booking stores a 5% host commission and the host payout', pr.hostCommissionRate === 0.05 && near(pr.hostCommission, stay * 0.05) && near(pr.hostPayout, stay + (pr.cleaningFee || 0) - stay * 0.05) && pr.hostPayout < pr.total, JSON.stringify(pr));
    return booking;
  }
  check('found free dates to book', false, 'no free slot in 12 attempts');
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
await login('guest');
await login('host');
await login('admin');
if (!tokens.guest || !tokens.host || !tokens.admin) {
  console.error('\nCannot continue without the three sign-ins (is the API up with DEV_OTP_BYPASS and seed data?).');
  process.exit(1);
}

let unit; let booking;

await step('guest: search', async () => {
  const r = await call(null, 'GET', '/units/search?limit=50');
  const list = r.data || [];
  check('search returns units', r.status === 200 && list.length > 0);
  const bad = list.filter((u) => !(u.nameAr || u.nameEn) || !(u.images || []).length || !days.every((d) => u.pricing?.[d] > 0));
  check('every unit in search has a name, a photo and a price for every day', bad.length === 0, `${bad.length} incomplete unit(s) are public`);
  check('units carry their city on the parent property', list.every((u) => u.property?.location?.city), 'a unit has no property.location.city');
  unit = list.find((u) => u.property?.location?.city === 'Jeddah') || list[0];
  const byCity = await call(null, 'GET', '/units/search?city=Jeddah&limit=50');
  check('city filter returns only that city', (byCity.data || []).length > 0 && byCity.data.every((u) => u.property?.location?.city === 'Jeddah'));
});

await step('guest: unit page', async () => {
  const r = await call(null, 'GET', `/units/${unit._id}`);
  check('unit detail has the property title and host', r.status === 200 && r.data?.property?.title && r.data?.property?.host);
  check('licence holder identity is not public', !r.data?.tourismLicense?.nationalId && !r.data?.tourismLicense?.documentUrl);
  const d = await call(null, 'GET', `/bookings/unit/${unit._id}/dates`);
  check('booked dates endpoint answers', d.status === 200);
  const rev = await call(null, 'GET', `/reviews/property/${unit.property._id}`);
  check('reviews of the property load', rev.status === 200 && Array.isArray(rev.data));
});

await step('guest: book and pay', async () => {
  booking = await bookUnit(unit);
  if (!booking) return;
  const init = await call('guest', 'POST', '/payments/initiate', { bookingId: booking._id });
  const paymentId = init.data?.paymentId || init.data?._id || init.data?.payment?._id;
  check('payment is initiated', init.status < 300 && paymentId, `status ${init.status} ${JSON.stringify(init.json).slice(0, 160)}`);
  const sim = await call('guest', 'POST', '/payments/simulate', { paymentId, outcome: 'approved' });
  check('simulated payment is approved', sim.status < 300, `status ${sim.status} ${JSON.stringify(sim.json).slice(0, 160)}`);
  const mine = await call('guest', 'GET', '/bookings/my-bookings');
  const list = mine.data || [];
  check('booking shows in the guest list', list.some((b) => b._id === booking._id));
  const one = await call('guest', 'GET', `/bookings/${booking._id}`);
  check('booking is marked paid', one.data?.paymentStatus === 'paid', `paymentStatus ${one.data?.paymentStatus}`);
});

await step('host: sees and confirms the booking', async () => {
  if (!booking) return check('host confirms booking', false, 'no booking');
  const hb = await call('host', 'GET', '/bookings/host-bookings');
  check('booking shows in the host list', (hb.data || []).some((b) => b._id === booking._id));
  const app = await call('host', 'GET', '/host/bookings');
  check('host app booking list answers', app.status === 200);
  const ok = await call('host', 'PUT', `/bookings/${booking._id}/status`, { status: 'confirmed' });
  check('host confirms the booking', ok.status === 200 && ok.data?.status === 'confirmed', `status ${ok.status}`);
  const seen = await call('guest', 'GET', `/bookings/${booking._id}`);
  check('guest sees the booking confirmed', seen.data?.status === 'confirmed');
  const notes = await call('guest', 'GET', '/notifications');
  const list = notes.data?.notifications || notes.data || [];
  const n = list.find((x) => String(x.data?.bookingId) === booking._id && /confirm/.test(x.type));
  check('guest gets an Arabic confirmation notification', n && hasArabic(n.title) && hasArabic(n.message), n ? `${n.title} / ${n.message}` : 'no notification');
});

await step('chat between guest and host', async () => {
  // No digits here: the chat hides anything that looks like a phone number.
  const tag = Math.random().toString(36).replace(/[0-9.]/g, '') || 'x';
  const text = `رسالة اختبار ${tag}`;
  const conv = await call('guest', 'POST', '/messages/conversations', { recipientId: users.host.id || users.host._id, propertyId: unit.property._id });
  const convId = conv.data?._id || conv.data?.conversation?._id;
  check('conversation opens', conv.status < 300 && convId, `status ${conv.status} ${JSON.stringify(conv.json).slice(0, 160)}`);
  const sent = await call('guest', 'POST', `/messages/conversations/${convId}/messages`, { content: text });
  check('guest sends a message', sent.status < 300, `status ${sent.status}`);
  const hostView = await call('host', 'GET', `/host/conversations/${convId}/messages`);
  const msgs = hostView.data?.messages || hostView.data || [];
  check('host reads the same text in the app', JSON.stringify(msgs).includes(text), 'text not found in host thread');
  const reply = `رد المضيف ${tag}`;
  const hr = await call('host', 'POST', `/host/conversations/${convId}/messages`, { content: reply, text: reply, message: reply });
  check('host replies', hr.status < 300, `status ${hr.status} ${JSON.stringify(hr.json).slice(0, 120)}`);
  const guestView = await call('guest', 'GET', `/messages/conversations/${convId}`);
  check('guest reads the host reply', JSON.stringify(guestView.data).includes(reply), 'reply not found in guest thread');
});

await step('support ticket: guest → admin → guest', async () => {
  const text = `تذكرة اختبار ${Date.now()}`;
  const made = await call('guest', 'POST', '/support', { subject: 'اختبار آلي', category: 'other', priority: 'medium', message: text });
  const id = made.data?._id;
  check('guest opens a ticket', made.status < 300 && id);
  const all = await call('admin', 'GET', '/support/admin/all');
  const t = (all.data || []).find((x) => x._id === id);
  check('admin sees the ticket with its text', t && t.messages?.[0]?.content === text, t ? `content: ${t.messages?.[0]?.content}` : 'ticket missing from admin list');
  const answer = `رد الدعم ${Date.now()}`;
  const rep = await call('admin', 'POST', `/support/${id}/reply`, { message: answer });
  check('admin replies', rep.status < 300);
  const st = await call('admin', 'PUT', `/support/admin/${id}/status`, { status: 'in_progress' });
  check('admin changes the ticket status', st.status === 200);
  const back = await call('guest', 'GET', `/support/${id}`);
  const last = back.data?.messages?.at(-1);
  check('guest reads the reply, marked as from support', last?.content === answer && last?.senderRole === 'admin' && back.data?.status === 'in_progress');
  const mine = await call('guest', 'GET', '/support');
  check('ticket is in the guest list', (mine.data || []).some((x) => x._id === id));
});

await step('report: guest → admin', async () => {
  const description = 'بلاغ اختبار آلي';
  const made = await call('guest', 'POST', '/reports', { targetType: 'property', targetId: unit.property._id, reason: 'spam', description });
  // A guest may hold one open report per item, so a re-run finds the earlier one.
  const already = made.status === 400 && /already have an active report/i.test(made.json?.message || '');
  check('guest files a report', (made.status < 300 && made.data?._id) || already, `status ${made.status} ${JSON.stringify(made.json).slice(0, 140)}`);
  const all = await call('admin', 'GET', '/reports/admin/all');
  const found = (all.data || []).find((x) => (made.data?._id ? x._id === made.data._id : x.description === description));
  check('admin sees the report', !!found);
  const one = await call('admin', 'GET', `/reports/admin/${found?._id}`);
  check('admin opens the report', one.status === 200 && one.data?.description === description);
});

await step('favourites', async () => {
  const made = await call('guest', 'POST', '/wishlists', { name: `اختبار ${Date.now()}` });
  const id = made.data?._id;
  check('guest creates a favourites list', made.status < 300 && id);
  const add = await call('guest', 'POST', `/wishlists/${id}/units/${unit._id}`);
  check('unit is added to the list', add.status < 300);
  const one = await call('guest', 'GET', `/wishlists/${id}`);
  check('the list contains the unit', JSON.stringify(one.data).includes(unit._id));
  await call('guest', 'DELETE', `/wishlists/${id}`);
});

await step('guest cancels a booking', async () => {
  const second = await bookUnit(unit);
  if (!second) return;
  const c = await call('guest', 'PUT', `/bookings/${second._id}/cancel`, { reason: 'اختبار آلي' });
  check('guest cancels', c.status === 200);
  const seen = await call('guest', 'GET', `/bookings/${second._id}`);
  check('booking is cancelled', seen.data?.status === 'cancelled');
  const notes = await call('host', 'GET', '/host/notifications?page=1');
  const list = notes.data?.notifications || notes.data || [];
  const n = list.find((x) => /cancel/.test(x.type || '') && hasArabic(x.title));
  check('host is told about the cancellation in Arabic', !!n, `latest: ${JSON.stringify(list[0] || null).slice(0, 160)}`);
  const summary = await call('host', 'GET', '/host/notifications');
  check('host dashboard summary is in Arabic', (summary.data || []).every((x) => hasArabic(x.title)), JSON.stringify((summary.data || [])[0] || null).slice(0, 120));
});

await step('host: add a listing end to end', async () => {
  const prop = await call('host', 'POST', '/properties', {
    title: 'استراحة الاختبار الآلي', titleAr: 'استراحة الاختبار الآلي', type: 'rest_house',
    location: { city: 'Jazan', district: 'حي الاختبار', address: 'شارع الاختبار', coordinates: { lat: 16.89, lng: 42.55 } },
  });
  const pid = prop.data?._id;
  check('host creates a rest house', prop.status === 201 && pid, `status ${prop.status} ${JSON.stringify(prop.json).slice(0, 140)}`);
  if (!pid) return;
  const made = await call('host', 'POST', `/properties/${pid}/units`, {
    nameAr: 'وحدة الاختبار', description: 'وصف',
    pricing: Object.fromEntries(days.map((d) => [d, 400])),
    capacity: { maxGuests: 6 }, hasBedrooms: true, bedrooms: { count: 2 }, bathroomCount: 2, amenities: ['bbq_area'],
  });
  const uid = made.data?._id;
  check('host creates a unit', made.status === 201 && uid, `status ${made.status} ${JSON.stringify(made.json).slice(0, 140)}`);
  const manage = await call('host', 'GET', `/properties/${pid}/units/manage`);
  const mine = (manage.data || []).find((u) => u._id === uid);
  check('unit keeps what was sent and reports only missing photos', mine?.nameAr === 'وحدة الاختبار' && mine?.pricing?.friday === 400 && mine?.bedrooms?.count === 2 && JSON.stringify(mine?.publishIssues) === '["missing_photos"]', JSON.stringify(mine?.publishIssues));
  const pub = await call(null, 'GET', `/units/${uid}`);
  check('incomplete unit is hidden from guests', pub.status === 404, `status ${pub.status}`);
  const own = await call('host', 'GET', `/units/${uid}`);
  check('owner can still open it', own.status === 200);
  const app = await call('host', 'GET', '/host/properties');
  const row = (app.data || []).flatMap((g) => g.units || []).find((u) => String(u.id) === uid);
  check('host app lists the unit under its own id', !!row && String(row.propertyId) === pid);
  const price = await call('host', 'PUT', `/units/${uid}/pricing`, { pricing: { friday: 550 } });
  const after = await call('host', 'GET', `/units/${uid}`);
  check('pricing screen saves a day price', price.status === 200 && after.data?.pricing?.friday === 550 && after.data?.pricing?.sunday === 400, `friday ${after.data?.pricing?.friday} sunday ${after.data?.pricing?.sunday}`);
  const edit = await call('host', 'PUT', `/properties/${pid}`, { location: { city: 'Jazan', district: 'حي آخر' } });
  const p2 = await call('host', 'GET', `/properties/${pid}`);
  check('editing part of the location keeps the address and pin', edit.status === 200 && p2.data?.location?.address === 'شارع الاختبار' && p2.data?.location?.coordinates?.lat === 16.89, JSON.stringify(p2.data?.location));
  const dup = await call('host', 'POST', `/units/${uid}/duplicate`, {});
  check('a copied unit starts unlisted', dup.status === 201 && dup.data?.isActive === false);
  if (dup.data?._id) await call('host', 'DELETE', `/units/${dup.data._id}`);
  await call('host', 'DELETE', `/units/${uid}`);
  const del = await call('host', 'DELETE', `/properties/${pid}`);
  check('host deletes the test listing', del.status < 300, `status ${del.status}`);
});

await step('host: money and account screens answer', async () => {
  for (const path of ['/host/transfers', '/host/statements', '/host/invoices', '/host/account-summary', '/host/payment-method', '/host/vat', '/host/reviews/summary', '/host/conversations', '/host/support/info', '/host/program/status', '/host/properties/permits', '/host/notifications/unread-count', '/host/stats', '/host/recent-bookings']) {
    const r = await call('host', 'GET', path);
    check(`GET ${path}`, r.status === 200, `status ${r.status}`);
  }
  const chatText = `سؤال للدعم ${Date.now()}`;
  const send = await call('host', 'POST', '/host/support/chat/messages', { text: chatText, message: chatText, content: chatText });
  check('host writes to support from the app', send.status < 300, `status ${send.status} ${JSON.stringify(send.json).slice(0, 120)}`);
  const all = await call('admin', 'GET', '/support/admin/all');
  check('admin sees the host message', JSON.stringify(all.data).includes(chatText));
});

await step('admin: every list answers with data', async () => {
  for (const [path, mustHaveRows] of [['/admin/stats', false], ['/admin/users', true], ['/admin/properties', true], ['/admin/bookings', true], ['/admin/payments', true], ['/admin/licenses', false], ['/admin/logs', true], ['/admin/staff', true], ['/admin/host-assignments', true], ['/support/admin/all', true], ['/reports/admin/all', true]]) {
    const r = await call('admin', 'GET', path);
    const rows = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.users || r.data?.properties || r.data?.bookings || r.data?.payments || r.data?.logs || r.data?.staff || r.data?.hosts || null);
    check(`GET ${path}`, r.status === 200 && (!mustHaveRows || (rows && rows.length > 0)), `status ${r.status} rows ${rows ? rows.length : 'n/a'}`);
  }
});

await step('contract details the screens depend on', async () => {
  // Guest side
  const up = await call('guest', 'GET', '/bookings/my-bookings?status=upcoming');
  const prev = await call('guest', 'GET', '/bookings/my-bookings?status=previous');
  const upIds = new Set((up.data || []).map((b) => b._id));
  check('upcoming and previous bookings are different lists', up.status === 200 && prev.status === 200 && (prev.data || []).every((b) => !upIds.has(b._id)) && (up.data || []).every((b) => ['pending', 'confirmed'].includes(b.status)));
  check('guest bookings carry the host on the property', (up.data || []).concat(prev.data || []).slice(0, 5).every((b) => b.property?.host?.name), 'property.host.name missing');
  const unread = await call('guest', 'GET', '/messages/unread-count');
  check('unread messages is a number called unreadCount', typeof (unread.data?.unreadCount ?? unread.json?.unreadCount) === 'number', JSON.stringify(unread.json).slice(0, 100));
  const convs = await call('guest', 'GET', '/messages/conversations');
  check('conversation unreadCount is a number', (convs.data || []).every((c) => typeof c.unreadCount === 'number'));
  const big = await call(null, 'GET', '/units/search?limit=50');
  check('search reports the total number of matches', typeof big.json?.pagination?.total === 'number' && big.json.pagination.total >= (big.data || []).length);
  const baths = await call(null, 'GET', '/units/search?bathrooms=3&limit=50');
  check('bathrooms filter is applied', baths.status === 200 && (baths.data || []).every((u) => u.bathroomCount >= 3));
  const rated = await call(null, 'GET', '/units/search?rating=9&limit=50');
  check('rating filter matches the property rating', rated.status === 200 && (rated.data || []).every((u) => (u.property?.ratings?.average ?? 0) >= 9));
  const tok = await call('guest', 'POST', '/notifications/device-token', { pushToken: 'ExponentPushToken[qa-check]', platform: 'ios' });
  check('device token registers (pushToken alias)', tok.status === 200, `status ${tok.status}`);
  const again = await call('guest', 'POST', '/payments/initiate', { bookingId: booking?._id });
  check('initiating payment again never returns a missing paymentId', again.status >= 400 || !!again.data?.paymentId, JSON.stringify(again.json).slice(0, 120));

  // Host side
  const stats = await call('host', 'GET', '/host/dashboard/stats');
  check('host stats carry active bookings, rating and revenue', ['activeBookings', 'averageRating', 'totalRevenue'].every((k) => typeof stats.data?.[k] === 'number'), JSON.stringify(stats.data).slice(0, 160));
  const waiting = await call('host', 'GET', '/host/bookings?status=waiting,confirmed');
  check('host bookings filter accepts a list and "waiting"', waiting.status === 200 && Array.isArray(waiting.data));
  const props = await call('host', 'GET', '/host/properties');
  const ids = (props.data || []).map((g) => String(g.id));
  check('host property list has one entry per property', ids.length === new Set(ids).size && ids.length > 0);
  const anyUnit = (props.data || []).flatMap((g) => g.units || [])[0];
  check('host unit rows carry all seven day prices', anyUnit && days.every((d) => typeof anyUnit.pricing?.[d] === 'number'));
  const remit = await call('host', 'GET', '/host/finance/payouts?bookingNumber=abc');
  check('searching transfers by booking number does not crash', remit.status === 200, `status ${remit.status}`);

  // Admin side
  for (const path of ['/admin/users', '/admin/bookings', '/admin/payments', '/admin/logs']) {
    const r = await call('admin', 'GET', path);
    check(`${path} returns pagination.pages`, typeof r.json?.pagination?.pages === 'number', JSON.stringify(Object.keys(r.json || {})));
  }
  const logs = await call('admin', 'GET', '/admin/logs');
  const logRows = logs.data?.logs || logs.data || [];
  const nameless = logRows.filter((l) => l.actor && !l.actor.name);
  check('every activity log row names who did it', logRows.length > 0 && nameless.length === 0, `${nameless.length} of ${logRows.length} rows have no actor name (e.g. ${nameless[0]?.action})`);
  const pays = await call('admin', 'GET', '/admin/payments');
  const payRows = pays.data?.payments || pays.data || [];
  check('paid payments are stored as "completed"', payRows.some((p) => p.status === 'completed'), [...new Set(payRows.map((p) => p.status))].join(','));
  const usersList = await call('admin', 'GET', '/admin/users?limit=100');
  const rows = usersList.data?.users || usersList.data || [];
  const victim = rows.find((u) => u.role === 'guest' && /^User /.test(u.name || '')) || rows.find((u) => u.role === 'guest' && u.phone !== PHONES.guest && String(u._id) !== String(users.guest._id));
  if (victim) {
    const sus = await call('admin', 'PATCH', `/admin/users/${victim._id}`, { action: 'suspend', role: victim.role });
    const act = await call('admin', 'PATCH', `/admin/users/${victim._id}`, { action: 'activate', role: victim.role });
    check('admin can suspend and reactivate a user', sus.status === 200 && act.status === 200, `suspend ${sus.status} activate ${act.status}`);
  } else {
    check('admin can suspend and reactivate a user', false, 'no spare guest account to test with');
  }
  const draftTitle = `مسودة اختبار ${Math.random().toString(36).replace(/[0-9.]/g, '')}`;
  const post = await call('admin', 'POST', '/blog/posts', { title: { ar: draftTitle }, content: { ar: 'نص تجريبي' }, excerpt: { ar: 'ملخص' }, isPublished: false });
  check('admin creates a post without typing a slug', post.status < 300 && post.data?.slug, `status ${post.status} ${JSON.stringify(post.json).slice(0, 140)}`);
  const adminPosts = await call('admin', 'GET', '/blog/posts?limit=50');
  const publicPosts = await call(null, 'GET', '/blog/posts?limit=50');
  const inList = (r) => JSON.stringify(r.data || r.json).includes(draftTitle);
  check('drafts show to the admin and not to the public', inList(adminPosts) && !inList(publicPosts));
  if (post.data?._id) await call('admin', 'DELETE', `/blog/posts/${post.data._id}`);
});

await step('access control', async () => {
  const a = await call('guest', 'GET', '/admin/users');
  check('guest cannot open admin data', a.status === 401 || a.status === 403, `status ${a.status}`);
  const b = await call('guest', 'GET', '/host/transfers');
  check('guest cannot open host money', b.status === 401 || b.status === 403, `status ${b.status}`);
  if (booking) {
    const c = await call('host', 'PUT', `/bookings/${booking._id}/cancel`, {});
    check('host cannot cancel as the guest', c.status === 403, `status ${c.status}`);
  }
  const s = await call('guest', 'GET', '/auth/socket-token');
  const saved = tokens.guest;
  tokens.guest = s.data?.token;
  const me = await call('guest', 'GET', '/auth/me');
  tokens.guest = saved;
  check('socket token cannot be used as a session', s.status === 200 && me.status === 401, `me status ${me.status}`);
  const anon = await call(null, 'GET', '/bookings/my-bookings');
  check('signed-out request is refused', anon.status === 401);
});

// ═════════════════════════════════════════════════════════════════════════════
// Second part: the calls the first part does not reach.
//
// Destructive and account-level calls run on throwaway accounts made in this
// run (a guest, a host with one listing, a website e-mail account) and they
// are deleted again at the end. The three seed accounts and the seeded
// listings are only read, with two exceptions that put the old value back:
// one seeded review's text and one seeded review's host reply.
// ═════════════════════════════════════════════════════════════════════════════
const stamp = Date.now().toString(36);
const randomPhone = () => `57${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const PHOTO = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800';
const QA_MANAGER_PHONE = '559990001';
const dayAt = (offset) => iso(new Date(Date.now() + offset * 86400000));
// A whole month far ahead, for calendar checks (the app asks month by month).
const calMonth = (() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth() + 2, 1)); })();
const calDay = (n) => iso(new Date(Date.UTC(calMonth.getUTCFullYear(), calMonth.getUTCMonth(), n)));

/** Sign in with a phone number the way the apps do; a new number makes a new account. */
async function loginPhone(key, phone, role) {
  const extra = role ? { role } : {};
  const sent = await call(null, 'POST', '/auth/send-otp', { phone, countryCode: '+966', method: 'sms', lang: 'ar', ...extra });
  const r = await call(null, 'POST', '/auth/verify-otp', { phone, otp: '0000', ...extra });
  tokens[key] = r.json?.token;
  users[key] = r.json?.user;
  refreshTokens[key] = r.json?.refreshToken;
  return { sent, r };
}
const refreshTokens = {};

/** Hold + book as the given guest on fixed dates. Returns the booking or null. */
async function bookAs(role, target, checkIn, checkOut) {
  const body = { propertyId: idOf(target.property), unitId: target._id, checkIn, checkOut, guests: { adults: 1 } };
  const hold = await call(role, 'POST', '/bookings/hold', body);
  const holdId = hold.data?._id || hold.data?.holdId || hold.data?.hold?._id;
  if (!(hold.status < 300 && holdId)) return { hold, booking: null };
  const made = await call(role, 'POST', '/bookings', { ...body, holdId });
  return { hold, made, booking: made.data?.booking || made.data };
}

let tProperty; let tUnit; let tBooking; let tBooking2; let tPaymentId; let tConvId; let managerId; let tTicketId;

await step('throwaway accounts: a new guest and a new host sign in by phone', async () => {
  const g = await loginPhone('tGuest', randomPhone());
  check('a new phone number becomes a new guest account', g.r.status === 200 && tokens.tGuest && g.r.json?.isNewUser === true && users.tGuest?.role === 'guest' && refreshTokens.tGuest, brief(g.r));
  const h = await loginPhone('tHost', randomPhone(), 'host');
  check('a new phone number with role "host" becomes a new host account', h.r.status === 200 && tokens.tHost && h.r.json?.isNewUser === true && users.tHost?.role === 'host', brief(h.r));
});
const haveThrowaways = () => Boolean(tokens.tGuest && tokens.tHost);

await step('host app: first launch (onboarding, terms, satisfaction survey)', async () => {
  if (!haveThrowaways()) return skip('host onboarding', 'no throwaway host');
  const st = await call('tHost', 'GET', '/host/onboarding/status');
  check('a new host has not finished onboarding', st.status === 200 && st.data?.onboardingCompleted === false && idOf(st.data?.host) === idOf(users.tHost) && st.data?.host?.role === 'host', brief(st));
  const fin = await call('tHost', 'POST', '/host/onboarding/finish');
  const st2 = await call('tHost', 'GET', '/host/onboarding/status');
  check('finishing onboarding is remembered', fin.status === 200 && fin.data?.onboardingCompleted === true && st2.data?.onboardingCompleted === true, brief(st2));

  const terms = await call('tHost', 'GET', '/host/terms');
  check('host terms start unsigned', terms.status === 200 && terms.data?.signed === false && Array.isArray(terms.data?.articles), brief(terms));
  const sign = await call('tHost', 'POST', '/host/terms/sign');
  const terms2 = await call('tHost', 'GET', '/host/terms');
  check('signing the host terms is remembered with its date', sign.status === 200 && sign.data?.signed === true && isoDay.test(sign.data?.signedDate || '') && terms2.data?.signed === true && terms2.data?.signedDate === sign.data?.signedDate, brief(terms2));

  const show = await call('tHost', 'GET', '/host/nps/should-show');
  check('a brand-new host is not asked for a rating yet', show.status === 200 && show.data?.shouldShow === false, brief(show));
  const nps = await call('tHost', 'POST', '/host/nps', { rating: 9, comment: 'تقييم آلي' });
  check('host rating is stored as sent', nps.status === 201 && nps.data?.rating === 9 && nps.data?.comment === 'تقييم آلي' && nps.data?.id, brief(nps));
  const again = await call('tHost', 'POST', '/host/nps', { rating: 3 });
  check('a second rating the same day is refused', again.status === 409 && hasArabic(again.json?.message), brief(again));
});

await step('host app: profile and e-mail', async () => {
  if (!haveThrowaways()) return skip('host profile', 'no throwaway host');
  const before = await call('tHost', 'GET', '/host/profile');
  check('host profile has name, phone and e-mail fields', before.status === 200 && typeof before.data?.name === 'string' && before.data?.phone === users.tHost.phone && before.data?.email === '', brief(before));
  const name = `مضيف الاختبار ${stamp}`;
  const upd = await call('tHost', 'PATCH', '/host/profile', { name });
  check('host changes the display name', upd.status === 200 && upd.data?.name === name, brief(upd));
  const bad = await call('tHost', 'PATCH', '/host/profile', { avatar: 'http://not-https.example.com/a.png' });
  check('a non-https avatar is refused', bad.status === 400, brief(bad));
  const email = `qa-host-${stamp}@example.com`;
  const em = await call('tHost', 'PUT', '/host/profile/email', { email });
  check('host sets an e-mail', em.status === 200 && em.data?.email === email, brief(em));
  const after = await call('tHost', 'GET', '/host/profile');
  check('profile screen reads the saved name and e-mail back', after.data?.name === name && after.data?.email === email, brief(after));
  const taken = await call('tHost', 'PUT', '/host/profile/email', { email: users.host.email });
  check('an e-mail that belongs to another host is refused', taken.status === 400, brief(taken));
  const adminView = await call('admin', 'GET', `/admin/users/${idOf(users.tHost)}`);
  check('admin opens the host and sees the same name and e-mail', adminView.status === 200 && adminView.data?.role === 'host' && adminView.data?.name === name && adminView.data?.email === email && typeof adminView.data?.stats?.properties === 'number' && adminView.data?.password === undefined, brief(adminView));
});

await step('host money: bank account and transfer timing (app and website)', async () => {
  if (!haveThrowaways()) return skip('host bank account', 'no throwaway host');
  const IBAN1 = 'SA0380000000608010167519';
  const IBAN2 = 'SA4420000001234567891234';
  const none = await call('tHost', 'GET', '/host/payment-method');
  check('a new host has no bank account', none.status === 200 && none.data?.hasBankAccount === false && none.data?.iban === null, brief(none));
  const early = await call('tHost', 'PUT', '/host/transfer-duration', { type: 'weekly' });
  check('transfer timing cannot be set before a bank account exists', early.status === 404, brief(early));
  const web0 = await call('tHost', 'GET', '/host/finance/bank-account');
  check('website shows no bank account either', web0.status === 200 && web0.data === null, brief(web0));

  const badIban = await call('tHost', 'PUT', '/host/payment-method/bank', { iban: 'SA123', bankName: 'بنك', accountHolder: 'x' });
  check('a malformed IBAN is refused', badIban.status === 400, brief(badIban));
  const save = await call('tHost', 'PUT', '/host/payment-method/bank', { iban: IBAN1, bankName: 'Al Rajhi Bank', accountHolder: 'QA Host' });
  check('app saves the bank account', save.status === 200 && save.data?.hasBankAccount === true && save.data?.iban === IBAN1 && save.data?.bankName === 'Al Rajhi Bank' && save.data?.accountHolder === 'QA Host' && save.data?.isVerified === false, brief(save));
  const relabel = await call('tHost', 'PUT', '/host/payment-method', { type: 'bank_transfer', iban: IBAN1, bankName: 'مصرف الراجحي', accountHolder: 'QA Host' });
  check('saving the same IBAN again only corrects the labels', relabel.status === 200 && relabel.data?.iban === IBAN1 && relabel.data?.bankName === 'مصرف الراجحي', brief(relabel));
  const web1 = await call('tHost', 'GET', '/host/finance/bank-account');
  check('website reads the account the app saved', web1.status === 200 && web1.data?.iban === IBAN1 && web1.data?.bankName === 'مصرف الراجحي' && web1.data?.accountHolder === 'QA Host' && web1.data?.isActive === true, brief(web1));
  const sum = await call('tHost', 'GET', '/host/finance/summary');
  check('finance summary knows about the bank account', sum.status === 200 && sum.data?.hasBankAccount === true && ['totalPaidOut', 'pendingPayout', 'totalCommission', 'lastPayoutAmount'].every((k) => typeof sum.data?.[k] === 'number'), brief(sum));

  const thr = await call('tHost', 'PUT', '/host/transfer-duration', { type: 'threshold', thresholdAmount: 750 });
  check('app sets "transfer when the balance reaches an amount"', thr.status === 200 && thr.data?.type === 'threshold' && thr.data?.thresholdAmount === 750 && thr.data?.hasBankAccount === true, brief(thr));
  const getD = await call('tHost', 'GET', '/host/transfer-duration');
  check('app reads the transfer timing back', getD.status === 200 && getD.data?.type === 'threshold' && getD.data?.thresholdAmount === 750, brief(getD));
  const webD = await call('tHost', 'PUT', '/host/finance/transfer-duration', { type: 'weekly', weeklyDay: 3 });
  check('website sets weekly transfers', webD.status === 200 && webD.data?.transferDuration?.type === 'weekly' && webD.data?.transferDuration?.weeklyDay === 3, brief(webD));
  const getD2 = await call('tHost', 'GET', '/host/transfer-duration');
  check('app shows what the website chose', getD2.data?.type === 'weekly' && getD2.data?.weeklyDay === 3, brief(getD2));

  const web2 = await call('tHost', 'PUT', '/host/finance/bank-account', { bankName: 'Saudi National Bank', bankNameAr: 'البنك الأهلي', iban: IBAN2, accountHolder: 'QA Host' });
  check('website replaces the bank account', web2.status === 200 && web2.data?.iban === IBAN2 && web2.data?.isActive === true, brief(web2));
  const app2 = await call('tHost', 'GET', '/host/payment-method');
  check('app shows the account the website saved', app2.data?.iban === IBAN2 && app2.data?.bankName === 'Saudi National Bank' && app2.data?.bankNameAr === 'البنك الأهلي', brief(app2));
  const getD3 = await call('tHost', 'GET', '/host/transfer-duration');
  check('changing the IBAN on the website keeps the chosen transfer timing', getD3.data?.type === 'weekly' && getD3.data?.weeklyDay === 3,
    `after PUT /host/finance/bank-account with a new IBAN, GET /host/transfer-duration answers ${JSON.stringify(getD3.data)} (was weekly/day 3); the app route PUT /host/payment-method carries it over, the website route does not`);

  const del = await call('tHost', 'DELETE', '/host/finance/bank-account');
  const app3 = await call('tHost', 'GET', '/host/payment-method');
  check('website removes the bank account and the app sees none', del.status === 200 && app3.data?.hasBankAccount === false && app3.data?.iban === null, brief(app3));
  const del2 = await call('tHost', 'DELETE', '/host/finance/bank-account');
  check('removing a bank account that is not there answers 404', del2.status === 404, brief(del2));
});

await step('host listing: create, edit and switch on/off from both clients', async () => {
  if (!haveThrowaways()) return skip('throwaway listing', 'no throwaway host');
  const prop = await call('tHost', 'POST', '/properties', {
    title: `QA Chalet ${stamp}`, titleAr: `شاليه الاختبار ${stamp}`, type: 'chalet', description: 'Automated check listing',
    location: { city: 'Abha', district: 'حي الاختبار', address: 'شارع الاختبار', coordinates: { lat: 18.22, lng: 42.5 } },
    images: [{ url: PHOTO, isPrimary: true }, { url: `${PHOTO}&qa=2` }],
  });
  tProperty = prop.data;
  check('throwaway host creates a property with two photos', prop.status === 201 && tProperty?._id && tProperty?.images?.length === 2, brief(prop));
  if (!tProperty?._id) return;
  const made = await call('tHost', 'POST', `/properties/${tProperty._id}/units`, {
    nameAr: 'وحدة مؤقتة', nameEn: 'QA Unit', description: 'وصف',
    pricing: Object.fromEntries(days.map((d) => [d, 500])),
    capacity: { maxGuests: 4 }, hasBedrooms: true, bedrooms: { count: 1 }, bathroomCount: 1, amenities: ['bbq_area'],
    images: [{ url: PHOTO, isPrimary: true }],
  });
  tUnit = made.data;
  check('throwaway host creates a complete unit', made.status === 201 && tUnit?._id, brief(made));
  if (!tUnit?._id) return;
  tUnit.property = { _id: tProperty._id };

  const pub = await call(null, 'GET', `/units/${tUnit._id}`);
  check('a complete unit is public straight away', pub.status === 200 && pub.data?.nameAr === 'وحدة مؤقتة' && pub.data?.pricing?.friday === 500, brief(pub));
  const list = await call(null, 'GET', `/properties/${tProperty._id}/units`);
  check('property page lists the unit with its prices and photo', list.status === 200 && (list.data || []).some((u) => u._id === tUnit._id && u.pricing?.friday === 500 && u.images?.[0]?.url) && typeof list.json?.pagination?.total === 'number', brief(list));
  const all = await call(null, 'GET', '/properties?limit=5');
  check('property list answers with rows the cards can show', all.status === 200 && Array.isArray(all.data) && all.data.length > 0 && all.data.every((p) => p._id && p.title && p.location?.city && p.host?.name), brief(all, 120));
  const stats = await call(null, 'GET', '/properties/stats/public');
  check('home page statistics are numbers', stats.status === 200 && ['properties', 'hosts', 'completedBookings', 'reviews'].every((k) => typeof stats.data?.[k] === 'number'), brief(stats));

  // Host app: legacy unit screen
  const legacy = await call('tHost', 'GET', `/host/units/${tUnit._id}`);
  check('host app unit detail has id, status and the property', legacy.status === 200 && legacy.data?.id === tUnit._id && legacy.data?.status === 'listed' && legacy.data?.propertyId === tProperty._id && legacy.data?.pricing?.friday === 500, brief(legacy));
  const patch = await call('tHost', 'PATCH', `/host/units/${tUnit._id}`, { nameAr: 'وحدة مؤقتة معدلة', bathroomCount: 2, bedrooms: { count: 2 } });
  check('host app edits the unit', patch.status === 200 && patch.data?.nameAr === 'وحدة مؤقتة معدلة' && patch.data?.bathroomCount === 2 && patch.data?.bedrooms?.count === 2, brief(patch));
  const put = await call('tHost', 'PUT', `/units/${tUnit._id}`, { description: 'وصف جديد', capacity: { maxGuests: 5 }, pricing: { saturday: 650 } });
  check('unit form saves and keeps the other day prices', put.status === 200 && put.data?.description === 'وصف جديد' && put.data?.capacity?.maxGuests === 5 && put.data?.pricing?.saturday === 650 && put.data?.pricing?.friday === 500, brief(put));
  const pub2 = await call(null, 'GET', `/units/${tUnit._id}`);
  check('guests see the edited unit', pub2.data?.nameAr === 'وحدة مؤقتة معدلة' && pub2.data?.description === 'وصف جديد' && pub2.data?.capacity?.maxGuests === 5, brief(pub2));
  const other = await call('host', 'PUT', `/units/${tUnit._id}`, { description: 'x' });
  check('another host cannot edit the unit', other.status === 403, brief(other));

  // On / off
  const off = await call('tHost', 'PATCH', `/host/units/${tUnit._id}/status`, { status: 'unlisted' });
  const hidden = await call(null, 'GET', `/units/${tUnit._id}`);
  check('host app unlists the unit and guests stop seeing it', off.status === 200 && off.data?.status === 'unlisted' && off.data?.isActive === false && hidden.status === 404, `${brief(off)} / public ${hidden.status}`);
  const cannot = await call('tHost', 'PUT', `/host/properties/${tProperty._id}/toggle`);
  check('a property with no active unit cannot be switched on', cannot.status === 400, brief(cannot));
  const on = await call('tHost', 'PATCH', `/units/${tUnit._id}/toggle`);
  const shown = await call(null, 'GET', `/units/${tUnit._id}`);
  check('unit toggle brings the unit and its property back', on.status === 200 && on.data?.isActive === true && shown.status === 200, `${brief(on)} / public ${shown.status}`);
  const pOff = await call('tHost', 'PUT', `/host/properties/${tProperty._id}/toggle`);
  const pOn = await call('tHost', 'PUT', `/host/properties/${tProperty._id}/toggle`);
  check('website property switch turns the property off and on', pOff.status === 200 && pOff.data?.isActive === false && pOn.status === 200 && pOn.data?.isActive === true, `${brief(pOff, 60)} / ${brief(pOn, 60)}`);

  // Photos
  const rm = await call('tHost', 'DELETE', `/host/properties/${tProperty._id}/images`, { imageUrl: `${PHOTO}&qa=2` });
  const p2 = await call('tHost', 'GET', `/properties/${tProperty._id}`);
  check('host removes a property photo', rm.status === 200 && rm.json?.totalImages === 1 && p2.data?.images?.length === 1 && p2.data.images[0].url === PHOTO, brief(rm));
  const rm2 = await call('tHost', 'DELETE', `/host/properties/${tProperty._id}/images`, { imageUrl: 'https://example.com/none.jpg' });
  check('removing a photo that is not on the property answers 404', rm2.status === 404, brief(rm2));
});
const haveListing = () => Boolean(haveThrowaways() && tProperty?._id && tUnit?._id);

await step('host app: prices, long-stay discounts and offers', async () => {
  if (!haveListing()) return skip('pricing', 'no throwaway listing');
  const u = tUnit._id;
  const get = await call('tHost', 'GET', `/host/units/${u}/pricing`);
  check('pricing screen gets every day price and the mid-week rate', get.status === 200 && days.every((d) => typeof get.data?.[d] === 'number') && get.data?.midWeek === 500 && get.data?.midWeekUniform === true && get.data?.saturday === 650 && typeof get.data?.weeklyDiscount === 'number', brief(get));
  const put = await call('tHost', 'PUT', `/host/units/${u}/pricing`, { pricing: { thursday: 610 } });
  check('pricing screen fallback route saves a nested day price', put.status === 200 && put.data?.thursday === 610 && put.data?.friday === 500, brief(put));
  const mid = await call('tHost', 'PUT', `/host/units/${u}/pricing`, { midWeek: 333 });
  check('mid-week price is written to Sunday–Wednesday', mid.status === 200 && ['sunday', 'monday', 'tuesday', 'wednesday'].every((d) => mid.data?.[d] === 333) && mid.data?.thursday === 610, brief(mid));
  const pub = await call(null, 'GET', `/units/${u}`);
  check('guests see the new prices', pub.data?.pricing?.thursday === 610 && pub.data?.pricing?.monday === 333, JSON.stringify(pub.data?.pricing).slice(0, 160));
  const neg = await call('tHost', 'PUT', `/host/units/${u}/pricing`, { pricing: { friday: -5 } });
  check('a negative price is refused', neg.status === 400, brief(neg));

  const d0 = await call('tHost', 'GET', `/host/units/${u}/discounts`);
  const weekly0 = (d0.data || []).find((d) => d.type === 'weekly');
  check('discount list has weekly and monthly, both off', d0.status === 200 && weekly0 && weekly0.active === false && weekly0.minNights === 7 && (d0.data || []).some((d) => d.type === 'monthly' && d.minNights === 30) && typeof weekly0.averagePrice === 'number', brief(d0));
  const t0 = await call('tHost', 'PATCH', `/host/units/${u}/discounts/weekly/toggle`);
  check('a discount with no percentage cannot be switched on', t0.status === 400 && t0.json?.code === 'DISCOUNT_PERCENT_REQUIRED', brief(t0));
  const set = await call('tHost', 'POST', `/host/units/${u}/discounts/weekly`, { percentage: 10 });
  check('host sets a weekly discount', set.status === 200 && set.data?.type === 'weekly' && set.data?.percentage === 10 && set.data?.active === true, brief(set));
  const t1 = await call('tHost', 'PATCH', `/host/units/${u}/discounts/weekly/toggle`);
  const t2 = await call('tHost', 'PATCH', `/host/units/${u}/discounts/weekly/toggle`);
  check('weekly discount switches off and on, keeping its percentage', t1.data?.active === false && t1.data?.percentage === 10 && t2.data?.active === true, `${brief(t1, 90)} / ${brief(t2, 90)}`);
  const get2 = await call('tHost', 'GET', `/host/units/${u}/pricing`);
  check('pricing screen shows the weekly discount', get2.data?.weeklyDiscount === 10 && get2.data?.weeklyEnabled === true, brief(get2));
  const bad = await call('tHost', 'POST', `/host/units/${u}/discounts/yearly`, { percentage: 10 });
  check('an unknown discount type is refused', bad.status === 400, brief(bad));

  const dates = [calDay(20), calDay(21)];
  const offer = await call('tHost', 'POST', `/host/units/${u}/offers`, { name: 'عرض الاختبار', discountPercent: 20, selectedDates: dates });
  const o = offer.data;
  check('host creates a dated offer', offer.status === 201 && o?.id && o.name === 'عرض الاختبار' && o.discountPercent === 20 && JSON.stringify(o.selectedDates) === JSON.stringify(dates) && o.active === true
    && o.discountedPrices?.length === 2 && o.discountedPrices.every((p) => p.originalPrice > 0 && Math.abs(p.discountedPrice - p.originalPrice * 0.8) < 0.01), brief(offer, 300));
  const offers = await call('tHost', 'GET', `/host/units/${u}/offers`);
  check('offer shows in the offers list', offers.status === 200 && (offers.data || []).some((x) => x.id === o?.id && x.selectedDates?.length === 2), brief(offers));
  const pub2 = await call(null, 'GET', `/units/${u}`);
  const dp = (pub2.data?.datePricing || []).filter((d) => dates.includes(String(d.date).slice(0, 10)));
  check('guests get the offer discount on those dates', dp.length === 2 && dp.every((d) => d.discountPercent === 20), JSON.stringify(pub2.data?.datePricing || null).slice(0, 200));
  const past = await call('tHost', 'POST', `/host/units/${u}/offers`, { name: 'قديم', discountPercent: 20, selectedDates: ['2020-01-01'] });
  check('an offer on past dates is refused', past.status === 400, brief(past));
  const del = await call('tHost', 'DELETE', `/host/units/${u}/offers/${o?.id}`);
  const offers2 = await call('tHost', 'GET', `/host/units/${u}/offers`);
  const pub3 = await call(null, 'GET', `/units/${u}`);
  const left = (pub3.data?.datePricing || []).filter((d) => dates.includes(String(d.date).slice(0, 10)) && d.discountPercent);
  check('deleting the offer removes it and its discounts', del.status === 200 && (offers2.data || []).length === 0 && left.length === 0, `${brief(del)} left ${left.length}`);
});

await step('host calendar: blocking dates (website and app) and what the guest sees', async () => {
  if (!haveListing()) return skip('calendar', 'no throwaway listing');
  const p = tProperty._id; const u = tUnit._id;
  const y = calMonth.getUTCFullYear(); const m = calMonth.getUTCMonth() + 1;
  const appCal = async () => {
    const r = await call('tHost', 'GET', `/host/calendar?year=${y}&month=${m}`);
    const row = (r.data || []).flatMap((g) => g.units || []).find((x) => String(x.unitId) === u);
    return { r, row };
  };
  const c0 = await appCal();
  check('app calendar lists the unit with booked and blocked days', c0.r.status === 200 && c0.row && Array.isArray(c0.row.bookedDates) && Array.isArray(c0.row.blockedDates) && c0.row.blockedDates.length === 0 && c0.row.isListed === true && typeof c0.row.unitName === 'string', brief(c0.r, 260));

  // Website blocks the unit
  const block = await call('tHost', 'PUT', `/host/calendar/${p}/block`, { startDate: calDay(10), endDate: calDay(12), action: 'block', unitId: u });
  check('website blocks dates on the unit', block.status === 200 && (block.data?.unavailableDates || []).some((d) => String(d.start).slice(0, 10) === calDay(10) && String(d.end).slice(0, 10) === calDay(12)), brief(block));
  const web = await call('tHost', 'GET', `/host/calendar/${p}?unitId=${u}&startDate=${calDay(1)}&endDate=${calDay(28)}`);
  check('website calendar shows the blocked range', web.status === 200 && String(web.data?.propertyId) === p && Array.isArray(web.data?.bookings) && (web.data?.blockedDates || []).some((d) => String(d.start).slice(0, 10) === calDay(10)), brief(web));
  const c1 = await appCal();
  check('app calendar shows the same days as blocked', c1.row && [calDay(10), calDay(11)].every((d) => c1.row.blockedDates.includes(d)), JSON.stringify(c1.row?.blockedDates));
  const guestDates = await call('tGuest', 'GET', `/bookings/unit/${u}/dates`);
  check('guest calendar marks those days unavailable', (guestDates.data || []).some((d) => d.status === 'blocked' && String(d.checkIn).slice(0, 10) === calDay(10)), brief(guestDates));
  const hold = await call('tGuest', 'POST', '/bookings/hold', { propertyId: p, unitId: u, checkIn: calDay(10), checkOut: calDay(11), guests: { adults: 1 } });
  check('guest cannot book a blocked night', hold.status === 400 && hold.json?.code === 'DATES_BLOCKED', brief(hold));

  // App unblocks ({ start, end })
  const un = await call('tHost', 'PUT', `/host/calendar/${p}/unblock`, { start: calDay(10), end: calDay(12) });
  const c2 = await appCal();
  check('app unblocks the range', un.status === 200 && un.data?.released >= 1 && c2.row && c2.row.blockedDates.length === 0, `${brief(un)} / ${JSON.stringify(c2.row?.blockedDates)}`);
  const un2 = await call('tHost', 'PUT', `/host/calendar/${p}/unblock`, { start: calDay(10), end: calDay(12) });
  check('unblocking free dates reports nothing released', un2.status === 200 && un2.data?.released === 0, brief(un2));

  // App blocks the way host.service.ts does: no unitId, so the whole property.
  const pb = await call('tHost', 'PUT', `/host/calendar/${p}/block`, { startDate: calDay(15), endDate: calDay(16), action: 'block' });
  const hold2 = await call('tGuest', 'POST', '/bookings/hold', { propertyId: p, unitId: u, checkIn: calDay(15), checkOut: calDay(16), guests: { adults: 1 } });
  check('a block without a unit closes the whole property for guests', pb.status === 200 && hold2.status === 400 && hold2.json?.code === 'DATES_BLOCKED', `${brief(pb, 100)} / ${brief(hold2)}`);
  const c3 = await appCal();
  check('a property-wide block shows on the app calendar', c3.row && c3.row.blockedDates.includes(calDay(15)),
    `PUT /host/calendar/${'{propertyId}'}/block {startDate,endDate,action:"block"} (no unitId, as host-app/src/services/host.service.ts:93 sends it) blocks guests (DATES_BLOCKED) but GET /host/calendar?year&month returns blockedDates ${JSON.stringify(c3.row?.blockedDates)} for the unit: hostController.getHostCalendarAll reads only unit.unavailableDates`);
  const wun = await call('tHost', 'PUT', `/host/calendar/${p}/block`, { startDate: calDay(15), endDate: calDay(16), action: 'unblock' });
  check('website unblock removes the property-wide block', wun.status === 200 && (wun.data?.unavailableDates || []).length === 0, brief(wun));
  const stranger = await call('host', 'PUT', `/host/calendar/${p}/block`, { startDate: calDay(15), endDate: calDay(16), action: 'block' });
  check('another host cannot block this property', stranger.status === 403, brief(stranger));
});

await step('host app: minimum-stay rule and VAT number', async () => {
  if (!haveListing()) return skip('booking rules', 'no throwaway listing');
  const p = tProperty._id; const u = tUnit._id;
  const none = await call('tHost', 'GET', '/host/booking-settings');
  check('no booking rules at first', none.status === 200 && Array.isArray(none.data) && none.data.length === 0, brief(none));
  const add = await call('tHost', 'POST', '/host/booking-settings', { applyToAll: false, minNights: 3, unitId: u, unitName: 'وحدة مؤقتة' });
  check('host adds a 3-night minimum for the unit', add.status === 201 && add.data?.minNights === 3 && add.data?.applyToAll === false && add.data?.id === p && typeof add.data?.unitName === 'string', brief(add));
  const list = await call('tHost', 'GET', '/host/booking-settings');
  // With a single property the list reports the rule as "all properties".
  const listed = (list.data || [])[0];
  check('the rule shows in the list', (list.data || []).length === 1 && listed.minNights === 3 && (listed.id === add.data?.id || listed.applyToAll === true), brief(list));
  const short = await call('tGuest', 'POST', '/bookings/hold', { propertyId: p, unitId: u, checkIn: calDay(24), checkOut: calDay(25), guests: { adults: 1 } });
  check('guest cannot book fewer nights than the rule', short.status === 400 && short.json?.code === 'MIN_STAY', brief(short));
  const del = await call('tHost', 'DELETE', `/host/booking-settings/${listed?.id}`);
  const list2 = await call('tHost', 'GET', '/host/booking-settings');
  check('deleting the rule empties the list', del.status === 200 && (list2.data || []).length === 0, brief(del));
  const del2 = await call('tHost', 'DELETE', `/host/booking-settings/${add.data?.id}`);
  check('deleting a rule twice answers 404', del2.status === 404, brief(del2));

  const badVat = await call('tHost', 'POST', '/host/vat', { propertyId: p, propertyName: 'x', taxNumber: '12345' });
  check('a wrong VAT number is refused in Arabic', badVat.status === 400 && hasArabic(badVat.json?.message), brief(badVat));
  const vat = await call('tHost', 'POST', '/host/vat', { propertyId: p, propertyName: tProperty.titleAr, taxNumber: '300000000000003' });
  check('host registers a VAT number for the property', vat.status === 201 && vat.data?.propertyId === p && vat.data?.taxNumber === '300000000000003' && vat.data?.verified === false && vat.data?.propertyName === tProperty.titleAr, brief(vat));
  const vats = await call('tHost', 'GET', '/host/vat');
  check('VAT screen lists it', (vats.data || []).some((e) => e.id === vat.data?.id && e.taxNumber === '300000000000003'), brief(vats));
});

await step('booking on the throwaway listing: availability, payment records, host screens', async () => {
  if (!haveListing()) return skip('throwaway booking', 'no throwaway listing');
  const p = tProperty._id;
  const free = await call(null, 'GET', `/properties/${p}/availability?checkIn=${dayAt(200)}&checkOut=${dayAt(202)}`);
  check('free dates are reported available', free.status === 200 && free.json?.available === true, brief(free));
  const made = await bookAs('tGuest', tUnit, dayAt(200), dayAt(202));
  tBooking = made.booking;
  check('new guest books two nights on the new listing', tBooking?._id && tBooking?.pricing?.total > 0 && tBooking?.pricing?.nights === 2, brief(made.made || made.hold));
  if (!tBooking?._id) return;
  const taken = await call(null, 'GET', `/properties/${p}/availability?checkIn=${dayAt(201)}&checkOut=${dayAt(203)}`);
  check('booked dates are reported unavailable', taken.status === 200 && taken.json?.available === false, brief(taken));

  const bn = await call('tGuest', 'GET', '/bnpl/availability?amount=1000');
  check('instalment options answer for an amount (both providers, four payments)', bn.status === 200 && ['tabby', 'tamara'].every((k) => typeof bn.data?.[k]?.available === 'boolean' && bn.data[k].installments === 4 && bn.data[k].installmentAmount === 250 && bn.data[k].currency === 'SAR'), brief(bn));

  const init = await call('tGuest', 'POST', '/payments/initiate', { bookingId: tBooking._id });
  tPaymentId = init.data?.paymentId || init.data?._id || init.data?.payment?._id;
  const sim = await call('tGuest', 'POST', '/payments/simulate', { paymentId: tPaymentId, outcome: 'approved' });
  check('new guest pays (simulator)', init.status < 300 && tPaymentId && sim.status < 300, `${brief(init, 100)} / ${brief(sim, 100)}`);
  const one = await call('tGuest', 'GET', `/payments/${tPaymentId}`);
  check('payment record has the amount, status and its booking', one.status === 200 && one.data?.status === 'completed' && one.data?.amount === tBooking.pricing.total && one.data?.currency === 'SAR' && idOf(one.data?.booking) === tBooking._id && one.data?.booking?.pricing?.total === tBooking.pricing.total && one.data?.user?.name, brief(one, 260));
  const st = await call('tGuest', 'GET', `/payments/${tPaymentId}/status`);
  check('payment status screen sees it paid', st.status === 200 && st.data?.status === 'completed' && st.data?.amount === tBooking.pricing.total && st.data?.simulated === true && st.data?.booking?.paymentStatus === 'paid' && idOf(st.data?.paymentId) === String(tPaymentId), brief(st));
  const mine = await call('tGuest', 'GET', '/payments/my-payments');
  check('payment is in the guest payment history', mine.status === 200 && (mine.data || []).length === 1 && idOf(mine.data[0]) === String(tPaymentId) && idOf(mine.data[0].booking) === tBooking._id, brief(mine, 120));
  const peek = await call('guest', 'GET', `/payments/${tPaymentId}`);
  const peek2 = await call('guest', 'GET', `/payments/${tPaymentId}/status`);
  check('another guest cannot read this payment', peek.status === 403 && peek2.status === 403, `${peek.status} / ${peek2.status}`);

  const ok = await call('tHost', 'PUT', `/bookings/${tBooking._id}/status`, { status: 'confirmed' });
  check('new host confirms the booking', ok.status === 200 && ok.data?.status === 'confirmed', brief(ok, 100));
  const up = await call('tHost', 'GET', '/host/bookings/upcoming');
  const row = (up.data || []).find((b) => String(b.id) === tBooking._id);
  check('upcoming guests screen shows the booking in its own shape', up.status === 200 && row && row.guestName === users.tGuest.name && row.status === 'confirmed' && row.checkIn === dayAt(200) && row.checkOut === dayAt(202) && row.totalAmount === tBooking.pricing.total && typeof row.hostAmount === 'number' && row.bookingNumber, brief(up, 300));
  const earn = await call('tHost', 'GET', `/host/earnings?year=${new Date().getFullYear()}`);
  const month = (earn.data?.monthly || [])[new Date().getMonth()];
  check('earnings screen adds the host payout of the booking to this month', earn.status === 200 && earn.data?.monthly?.length === 12 && Math.abs(earn.data.totalEarnings - tBooking.pricing.hostPayout) < 0.01 && earn.data.totalBookings === 1 && month?.bookings === 1 && earn.data.topProperties?.[0]?.propertyId === p, brief(earn, 200));
  const wcal = await call('tHost', 'GET', `/host/calendar/${p}?startDate=${dayAt(190)}&endDate=${dayAt(215)}`);
  check('website calendar shows the booking with the guest name and total', (wcal.data?.bookings || []).some((b) => idOf(b) === tBooking._id && b.guest?.name === users.tGuest.name && b.total === tBooking.pricing.total && b.status === 'confirmed'), brief(wcal, 260));

  const gDel = await call('tGuest', 'DELETE', '/auth/account', {});
  check('a guest with an upcoming booking cannot delete the account', gDel.status === 409 && gDel.json?.code === 'OPEN_BOOKINGS' && gDel.json?.openBookings === 1 && hasArabic(gDel.json?.message), brief(gDel));
  const hDel = await call('tHost', 'DELETE', '/host/account', {});
  check('a host with an upcoming booking cannot delete the account', hDel.status === 409 && hDel.json?.code === 'OPEN_BOOKINGS' && hasArabic(hDel.json?.message), brief(hDel));
});

await step('notifications: unread counters and marking as read (guest, website, host app)', async () => {
  if (!tBooking?._id) return skip('notifications', 'no throwaway booking');
  const list = await call('tGuest', 'GET', '/notifications');
  const rows = list.data?.notifications || list.data || [];
  const n = rows.find((x) => String(x.data?.bookingId) === tBooking._id && /confirm/.test(x.type));
  check('guest got the confirmation, unread', n && n.isRead === false && hasArabic(n.title) && typeof list.json?.unreadCount === 'number', brief(list, 200));
  const count = await call('tGuest', 'GET', '/notifications/unread-count');
  const sum = await call('tGuest', 'GET', '/notifications/unread-summary');
  check('unread counter and tab badges count it', count.status === 200 && count.data?.count >= 1 && sum.status === 200 && sum.data?.bookings >= 1 && typeof sum.data?.support === 'number' && typeof sum.data?.messages === 'number', `${brief(count, 80)} / ${brief(sum, 100)}`);
  const peek = await call('guest', 'PUT', `/notifications/${n?._id}/read`);
  check('another account cannot mark it read', peek.status === 403, brief(peek));
  const read = await call('tGuest', 'PUT', `/notifications/${n?._id}/read`);
  const count2 = await call('tGuest', 'GET', '/notifications/unread-count');
  check('marking one as read lowers the counter by one', read.status === 200 && read.data?.isRead === true && count2.data?.count === count.data?.count - 1, `${brief(read, 100)} / ${brief(count2, 80)}`);
  const all = await call('tGuest', 'PUT', '/notifications/read-all');
  const count3 = await call('tGuest', 'GET', '/notifications/unread-count');
  const sum3 = await call('tGuest', 'GET', '/notifications/unread-summary');
  check('"mark all as read" clears the counter and the badges', all.status === 200 && count3.data?.count === 0 && sum3.data?.bookings === 0 && sum3.data?.support === 0 && sum3.data?.messages === 0, `${brief(count3, 80)} / ${brief(sum3, 100)}`);

  // Host app
  const hl = await call('tHost', 'GET', '/host/notifications?page=1');
  const hn = (hl.data || []).find((x) => x.read === false);
  const hc = await call('tHost', 'GET', '/host/notifications/unread-count');
  check('host app notification list has unread rows in the app shape', hl.status === 200 && hn && hn.id && hasArabic(hn.title) && typeof hn.body === 'string' && hn.createdAt && hc.data?.count >= 1 && typeof hl.json?.unreadCount === 'number', brief(hl, 260));
  const hr = await call('tHost', 'PATCH', `/host/notifications/${hn?.id}/read`);
  const hc2 = await call('tHost', 'GET', '/host/notifications/unread-count');
  check('host app marks one as read', hr.status === 200 && hr.data?.id === hn?.id && hr.data?.read === true && hc2.data?.count === hc.data?.count - 1, `${brief(hr, 140)} / ${brief(hc2, 80)}`);
  const bad = await call('tHost', 'PATCH', '/host/notifications/not-an-id/read');
  check('a malformed notification id answers 404, not 500', bad.status === 404, brief(bad));
});

await step('chat: unread state, mark as read, block and unblock', async () => {
  if (!haveListing()) return skip('chat block', 'no throwaway listing');
  const tag = Math.random().toString(36).replace(/[0-9.]/g, '') || 'x';
  const conv = await call('tGuest', 'POST', '/messages/conversations', { recipientId: idOf(users.tHost), propertyId: tProperty._id });
  tConvId = conv.data?._id || conv.data?.conversation?._id;
  const text = `استفسار ${tag}`;
  const sent = await call('tGuest', 'POST', `/messages/conversations/${tConvId}/messages`, { content: text });
  check('new guest writes to the new host', conv.status < 300 && tConvId && sent.status < 300, `${brief(conv, 100)} / ${brief(sent, 100)}`);
  const list = await call('tHost', 'GET', '/host/conversations');
  const row = (list.data || []).find((c) => c.id === tConvId);
  check('host app inbox shows the conversation unread, with guest and property', row && row.isUnread === true && row.unreadCount >= 1 && row.guestName === users.tGuest.name && row.lastMessage === text && row.propertyId === tProperty._id && row.isBlocked === false, JSON.stringify(row || null).slice(0, 300));
  const read = await call('tHost', 'POST', `/host/conversations/${tConvId}/read`);
  const list2 = await call('tHost', 'GET', '/host/conversations');
  const row2 = (list2.data || []).find((c) => c.id === tConvId);
  check('opening the conversation marks it read', read.status === 200 && read.data?.unreadCount === 0 && read.data?.isUnread === false && row2?.isUnread === false && row2?.unreadCount === 0, `${brief(read)} / ${JSON.stringify(row2 || null).slice(0, 120)}`);

  const block = await call('tHost', 'PUT', `/messages/conversations/${tConvId}/block`);
  const list3 = await call('tHost', 'GET', '/host/conversations');
  check('host blocks the conversation', block.status === 200 && block.data?.isBlocked === true && (list3.data || []).find((c) => c.id === tConvId)?.isBlocked === true, brief(block));
  const refused = await call('tGuest', 'POST', `/messages/conversations/${tConvId}/messages`, { content: `محظور ${tag}` });
  check('the blocked guest cannot send', refused.status === 403, brief(refused));
  const gUn = await call('tGuest', 'PUT', `/messages/conversations/${tConvId}/block`);
  check('only the one who blocked can unblock', gUn.status === 403, brief(gUn));
  const unblock = await call('tHost', 'PUT', `/messages/conversations/${tConvId}/block`);
  const again = await call('tGuest', 'POST', `/messages/conversations/${tConvId}/messages`, { content: `بعد الحظر ${tag}` });
  check('host unblocks and the guest can write again', unblock.status === 200 && unblock.data?.isBlocked === false && again.status < 300, `${brief(unblock)} / ${again.status}`);
  const outsider = await call('guest', 'PUT', `/messages/conversations/${tConvId}/block`);
  check('someone outside the conversation cannot block it', outsider.status === 403, brief(outsider));
});

await step('guest account: name, e-mail change with a code, push token', async () => {
  if (!tokens.tGuest) return skip('guest account', 'no throwaway guest');
  const name = `ضيف الاختبار ${stamp}`;
  const upd = await call('tGuest', 'PUT', '/auth/profile', { name });
  check('guest changes the name (answer carries the user under "user")', upd.status === 200 && upd.json?.user?.name === name && idOf(upd.json?.user) === idOf(users.tGuest) && upd.json?.user?.password === undefined, brief(upd));
  const bad = await call('tGuest', 'PUT', '/auth/profile', { avatar: 'not a url' });
  check('a bad avatar address is refused', bad.status === 400, brief(bad));

  const email = `qa-guest-${stamp}@example.com`;
  const ask = await call('tGuest', 'PUT', '/auth/profile', { email }, { headers: { 'Accept-Language': 'ar' } });
  check('asking to change the e-mail sends a code and changes nothing yet', ask.status === 200 && ask.json?.success === true && ask.json?.user === undefined && /^\d{6}$/.test(ask.json?.devCode || ''), brief(ask));
  const me0 = await call('tGuest', 'GET', '/auth/me');
  check('e-mail is unchanged until the code is entered', me0.json?.user?.email !== email, `email ${me0.json?.user?.email}`);
  const wrong = await call('tGuest', 'PUT', '/auth/profile', { email, emailVerificationCode: ask.json?.devCode === '000000' ? '111111' : '000000' });
  check('a wrong code is refused', wrong.status === 400, brief(wrong));
  const okc = await call('tGuest', 'PUT', '/auth/profile', { email, emailVerificationCode: ask.json?.devCode });
  const me1 = await call('tGuest', 'GET', '/auth/me');
  check('the right code applies the new e-mail', okc.status === 200 && okc.json?.user?.email === email && me1.json?.user?.email === email && me1.json?.user?.name === name, brief(okc));
  const reuse = await call('tGuest', 'PUT', '/auth/profile', { email: `other-${stamp}@example.com`, emailVerificationCode: ask.json?.devCode });
  check('a used code cannot be used for another address', reuse.status === 400, brief(reuse));
  const adminView = await call('admin', 'GET', `/admin/users/${idOf(users.tGuest)}`);
  check('admin opens the guest with the new name, e-mail and counters', adminView.status === 200 && adminView.data?.role === 'guest' && adminView.data?.name === name && adminView.data?.email === email && ['bookings', 'reviews', 'totalSpent'].every((k) => typeof adminView.data?.stats?.[k] === 'number'), brief(adminView));

  const token = `ExponentPushToken[qa-${stamp}]`;
  const reg = await call('tGuest', 'POST', '/notifications/device-token', { token, platform: 'android' });
  const me2 = await call('tGuest', 'GET', '/auth/me');
  check('guest app registers its push token on the account', reg.status === 200 && (me2.json?.user?.deviceTokens || []).some((t) => t.token === token && t.platform === 'android'), `${brief(reg, 80)} tokens ${JSON.stringify(me2.json?.user?.deviceTokens)}`);
  const move = await call('tHost', 'POST', '/notifications/device-token', { token: `ExponentPushToken[qa-host-${stamp}]`, platform: 'ios' });
  check('host app registers its push token too', move.status === 200, brief(move));
  const none = await call('tGuest', 'DELETE', '/notifications/device-token', {});
  check('removing without a token is refused', none.status === 400, brief(none));
  const rem = await call('tGuest', 'DELETE', '/notifications/device-token', { token });
  const me3 = await call('tGuest', 'GET', '/auth/me');
  check('signing out removes the push token from the account', rem.status === 200 && !(me3.json?.user?.deviceTokens || []).some((t) => t.token === token), JSON.stringify(me3.json?.user?.deviceTokens));
});

await step('favourites: default list, heart button, rename, move between lists', async () => {
  if (!tokens.tGuest) return skip('favourites', 'no throwaway guest');
  const u = unit._id;
  const lists = await call('tGuest', 'GET', '/wishlists');
  const def = (lists.data || []).find((l) => l.isDefault);
  check('a new guest gets one default list', lists.status === 200 && (lists.data || []).length === 1 && def?._id && def.unitCount === 0 && def.coverImage === null && typeof def.name === 'string', brief(lists));
  const heart = await call('tGuest', 'POST', `/auth/wishlist/${u}`);
  check('the heart button answers with the unit ids of the default list', heart.status === 200 && Array.isArray(heart.json?.wishlist) && heart.json.wishlist.map(String).includes(u), brief(heart));
  const member = await call('tGuest', 'GET', `/wishlists/unit/${u}/membership`);
  check('membership says the unit is in the default list', member.status === 200 && JSON.stringify(member.data) === JSON.stringify([def?._id]), brief(member));
  const hostHeart = await call('host', 'POST', `/auth/wishlist/${u}`);
  check('hosts have no favourites', hostHeart.status === 403, brief(hostHeart));

  const made = await call('tGuest', 'POST', '/wishlists', { name: 'رحلة الصيف' });
  const listId = made.data?._id;
  const ren = await call('tGuest', 'PUT', `/wishlists/${listId}`, { name: 'رحلة الشتاء' });
  check('guest renames a list', made.status === 201 && ren.status === 200 && ren.data?.name === 'رحلة الشتاء' && ren.data?._id === listId, brief(ren));
  const renDef = await call('tGuest', 'PUT', `/wishlists/${def?._id}`, { name: 'x' });
  const delDef = await call('tGuest', 'DELETE', `/wishlists/${def?._id}`);
  check('the default list can be neither renamed nor deleted', renDef.status === 400 && delDef.status === 400, `${renDef.status} / ${delDef.status}`);
  const stranger = await call('guest', 'PUT', `/wishlists/${listId}`, { name: 'x' });
  check('another guest cannot rename the list', stranger.status === 403, brief(stranger));

  const mv = await call('tGuest', 'PUT', '/wishlists/move', { unitId: u, fromListId: def?._id, toListId: listId });
  const member2 = await call('tGuest', 'GET', `/wishlists/unit/${u}/membership`);
  check('moving the unit changes which list holds it', mv.status === 200 && JSON.stringify(member2.data) === JSON.stringify([listId]), `${brief(mv, 80)} / ${brief(member2)}`);
  const lists2 = await call('tGuest', 'GET', '/wishlists');
  const moved = (lists2.data || []).find((l) => l._id === listId);
  check('list overview shows the new name, one unit and a cover photo', moved?.name === 'رحلة الشتاء' && moved?.unitCount === 1 && /^https?:\/\//.test(moved?.coverImage || '') && (lists2.data || []).find((l) => l.isDefault)?.unitCount === 0, brief(lists2, 300));
  const one = await call('tGuest', 'GET', `/wishlists/${listId}`);
  check('the list page gets the unit with its property and city', (one.data?.units || []).some((x) => x._id === u && x.property?.location?.city && Array.isArray(x.bookedDates)), brief(one, 200));
});

await step('saved cards and wallet (guest app)', async () => {
  if (!tokens.tGuest) return skip('saved cards', 'no throwaway guest');
  const none = await call('tGuest', 'GET', '/payment-methods');
  check('a new guest has no saved cards', none.status === 200 && Array.isArray(none.data) && none.data.length === 0, brief(none));
  const card = (last4, brand) => ({ provider: 'moyasar', tokenId: `token_qa_${stamp}_${last4}`, cardBrand: brand, cardLast4: last4, expiryMonth: 12, expiryYear: 2031, nickname: 'بطاقة اختبار' });
  const a = await call('tGuest', 'POST', '/payment-methods', card('4242', 'visa'));
  const b = await call('tGuest', 'POST', '/payment-methods', card('1111', 'mada'));
  check('first saved card becomes the default, the second does not', a.status === 201 && a.data?._id && a.data.isDefault === true && a.data.cardLast4 === '4242' && a.data.cardBrand === 'visa' && b.status === 201 && b.data?.isDefault === false, `${brief(a)} / ${brief(b, 80)}`);
  const missing = await call('tGuest', 'POST', '/payment-methods', { provider: 'moyasar', cardLast4: '0000' });
  check('an incomplete card is refused', missing.status === 400, brief(missing));
  const def = await call('tGuest', 'PUT', `/payment-methods/${b.data?._id}/default`);
  const list = await call('tGuest', 'GET', '/payment-methods');
  check('guest makes the second card the default; it is listed first', def.status === 200 && def.data?.isDefault === true && list.data?.length === 2 && list.data[0]._id === b.data?._id && list.data[0].isDefault === true && list.data[1].isDefault === false, brief(list, 300));
  const stranger = await call('guest', 'DELETE', `/payment-methods/${b.data?._id}`);
  check('another guest cannot delete the card', stranger.status === 404, brief(stranger));
  const del = await call('tGuest', 'DELETE', `/payment-methods/${b.data?._id}`);
  const list2 = await call('tGuest', 'GET', '/payment-methods');
  check('deleting the default card hands the default back to the other', del.status === 200 && list2.data?.length === 1 && list2.data[0]._id === a.data?._id && list2.data[0].isDefault === true, brief(list2));

  const bal = await call('tGuest', 'GET', '/wallet/balance');
  check('wallet balance is a number in SAR', bal.status === 200 && bal.data?.balance === 0 && bal.data?.currency === 'SAR', brief(bal));
  const tx = await call('tGuest', 'GET', '/wallet/transactions?page=1&limit=20');
  check('wallet history is a paged list', tx.status === 200 && Array.isArray(tx.data) && tx.json?.pagination?.total === 0 && tx.json.pagination.limit === 20, brief(tx));
});

await step('public pages: contact form and host profile', async () => {
  const sent = await call(null, 'POST', '/contact', { name: 'اختبار آلي', email: `qa-contact-${stamp}@example.com`, subject: 'اختبار', message: 'رسالة من الاختبار الآلي' });
  check('contact form is accepted', sent.status === 201 && sent.json?.success === true, brief(sent));
  const bad = await call(null, 'POST', '/contact', { name: 'x', email: 'not-an-email', subject: 's', message: 'm' });
  const missing = await call(null, 'POST', '/contact', { name: 'x', email: 'a@example.com' });
  check('contact form refuses a bad e-mail or missing fields', bad.status === 400 && missing.status === 400, `${bad.status} / ${missing.status}`);

  const prof = await call(null, 'GET', `/hosts/${idOf(users.host)}`);
  const d = prof.data || {};
  check('host profile page has the host, statistics, listings and reviews', prof.status === 200 && d.host?.name === users.host.name && d.host?.phone === undefined && d.host?.email === undefined
    && d.stats?.propertyCount > 0 && d.stats?.totalReviews > 0 && d.stats.averageRating >= 1 && d.stats.averageRating <= 10 && typeof d.stats.memberSince === 'number'
    && d.properties?.length > 0 && d.properties.every((x) => x.title && x.location?.city) && d.reviews?.length > 0 && d.reviews.every((r) => r.guest?.name && r.ratings?.overall && r.property?.title)
    && typeof d.reviewsPagination?.total === 'number' && typeof d.propertiesPagination?.total === 'number', brief(prof, 260));
  if (haveListing()) {
    const mineP = await call(null, 'GET', `/hosts/${idOf(users.tHost)}`);
    check('a new host profile lists the new property and no reviews', mineP.status === 200 && mineP.data?.stats?.propertyCount === 1 && mineP.data?.properties?.[0]?._id === tProperty._id && mineP.data?.stats?.totalReviews === 0 && mineP.data?.reviews?.length === 0, brief(mineP, 200));
  }
  const nobody = await call(null, 'GET', '/hosts/000000000000000000000000');
  check('an unknown host answers 404', nobody.status === 404, brief(nobody));
});

await step('tourism permit: host submits (website), admin rejects, host resubmits (app)', async () => {
  if (!haveListing()) return skip('tourism permit', 'no throwaway listing');
  const u = tUnit._id; const p = tProperty._id;
  const permitRow = async () => {
    const r = await call('tHost', 'GET', '/host/properties/permits');
    return { r, row: (r.data || []).flatMap((g) => g.units || []).find((x) => x.unitId === u) };
  };
  const p0 = await permitRow();
  check('app permit list has the unit with no permit', p0.r.status === 200 && p0.row?.permitStatus === 'none' && typeof p0.row.unitName === 'string' && (p0.r.data || []).some((g) => g.propertyId === p && g.propertyName), brief(p0.r, 260));
  const noId = await call('tHost', 'PUT', `/host/units/${u}/tourism-license`, { workType: 'individual', licenseNumber: `QA-${stamp}` });
  check('an individual permit without a national id is refused', noId.status === 400, brief(noId));
  const number = `QA-${stamp}`;
  const save = await call('tHost', 'PUT', `/host/units/${u}/tourism-license`, { workType: 'individual', licenseNumber: number, nationalId: '1000000001', expiryDate: dayAt(400) });
  check('website saves the permit and it waits for review', save.status === 200 && save.data?.licenseNumber === number && save.data?.status === 'pending' && save.data?.workType === 'individual', brief(save));
  const over = await call('tHost', 'GET', '/host/tourism-license');
  const ou = (over.data || []).find((g) => String(g.propertyId) === p)?.units?.find((x) => String(x.unitId) === u);
  check('website permit page shows it under the property', over.status === 200 && ou?.license?.licenseNumber === number && ou.license.status === 'pending' && ou.nameAr && /^https?:/.test(ou.thumbnail || ''), JSON.stringify(ou || null).slice(0, 260));
  const p1 = await permitRow();
  check('app shows the same permit as pending', p1.row?.permitStatus === 'pending' && p1.row?.permitNumber === number && p1.row?.expired === false, JSON.stringify(p1.row || null));
  const pub = await call(null, 'GET', `/units/${u}`);
  check('the permit holder identity stays private', pub.status === 200 && !pub.data?.tourismLicense?.nationalId, JSON.stringify(pub.data?.tourismLicense || null));

  const queue = await call('admin', 'GET', '/admin/licenses?limit=100');
  const q = (queue.data || []).find((x) => String(x.unitId) === u);
  check('admin review queue has it with the host and the identity number', queue.status === 200 && q && String(q.host?.id) === idOf(users.tHost) && q.license?.licenseNumber === number && q.license?.nationalId === '1000000001' && q.license?.status === 'pending' && String(q.propertyId) === p && typeof queue.json?.pagination?.pages === 'number', brief(queue, 260));
  const noReason = await call('admin', 'PUT', `/admin/licenses/${u}`, { action: 'reject' });
  check('rejecting without a reason is refused', noReason.status === 400, brief(noReason));
  const reason = 'صورة التصريح غير واضحة';
  const rej = await call('admin', 'PUT', `/admin/licenses/${u}`, { action: 'reject', reason });
  check('admin rejects the permit with a reason', rej.status === 200 && rej.data?.status === 'rejected' && rej.data?.rejectionReason === reason, brief(rej));
  const p2 = await permitRow();
  check('app shows the rejection and its reason', p2.row?.permitStatus === 'rejected' && p2.row?.rejectionReason === reason, JSON.stringify(p2.row || null));
  const notes = await call('tHost', 'GET', '/host/notifications?page=1');
  check('host is told about the rejection in Arabic, with the reason', (notes.data || []).some((n) => hasArabic(n.title) && String(n.body).includes(reason)), brief(notes, 260));

  const form = new FormData();
  form.append('permitNumber', `QA2-${stamp}`);
  form.append('expiryDate', dayAt(500));
  const up = await call('tHost', 'POST', `/host/units/${u}/permit`, null, { form });
  check('app resubmits a permit number (multipart, no file) and it waits again', up.status === 201 && up.data?.unitId === u && up.data?.permitStatus === 'pending' && up.data?.permitNumber === `QA2-${stamp}` && up.data?.rejectionReason === undefined, brief(up));
  const empty = await call('tHost', 'POST', `/host/units/${u}/permit`, null, { form: new FormData() });
  check('a permit with neither number nor document is refused', empty.status === 400, brief(empty));
  const stranger = await call('host', 'PUT', `/host/units/${u}/tourism-license`, { workType: 'individual', licenseNumber: 'X', nationalId: '1' });
  check('another host cannot touch this permit', stranger.status === 403, brief(stranger));
});

await step('account managers: staff, assignment, distribution and the manager portal', async () => {
  if (!haveListing()) return skip('account managers', 'no throwaway listing');
  const u = tUnit._id; const p = tProperty._id; const hostId = idOf(users.tHost);
  const bad = await call('admin', 'POST', '/admin/staff', { name: 'x', phone: '123', adminRole: 'account_manager' });
  check('a staff phone number must be a Saudi mobile', bad.status === 400 && hasArabic(bad.json?.message), brief(bad));
  // There is no API to remove staff, so one fixed QA manager is created once and reused.
  const made = await call('admin', 'POST', '/admin/staff', { name: 'QA Account Manager', phone: QA_MANAGER_PHONE, adminRole: 'account_manager' });
  const staff = await call('admin', 'GET', '/admin/staff');
  const me = (staff.data || []).find((s) => s.phone === QA_MANAGER_PHONE);
  managerId = me && String(me.id);
  check('admin adds an account manager (or it is there from an earlier run)', (made.status === 201 ? made.data?.adminRole === 'account_manager' && String(made.data?.id) === managerId : made.status === 409) && me?.adminRole === 'account_manager' && me.isSuspended === false && typeof me.hosts === 'number' && typeof staff.json?.unassignedHosts === 'number', `${brief(made)} / ${JSON.stringify(me || null)}`);
  if (!managerId) return;

  const auto = await call('admin', 'GET', `/admin/host-assignments?search=${users.tHost.phone}`);
  const autoRow = (auto.data || []).find((h) => String(h.id) === hostId);
  check('a new host is given an account manager automatically', auto.status === 200 && autoRow?.manager?.id && autoRow.manager.name && autoRow.properties === 1 && autoRow.phone === users.tHost.phone && typeof auto.json?.pagination?.pages === 'number', brief(auto, 260));
  const un = await call('admin', 'PUT', `/admin/hosts/${hostId}/account-manager`, { managerId: null });
  check('admin can leave a host without a manager', un.status === 200 && un.data?.manager === null && String(un.data?.hostId) === hostId, brief(un));
  // Distribution hands every unassigned host to a manager: remember who was
  // unassigned so that only the throwaway host is affected by this run.
  const before = await call('admin', 'GET', '/admin/host-assignments?manager=none');
  const wasUnassigned = (before.data || []).map((h) => String(h.id));
  check('the "no manager" filter lists the host', before.status === 200 && wasUnassigned.includes(hostId) && (before.data || []).every((h) => h.manager === null), brief(before, 200));
  const dist = await call('admin', 'POST', '/admin/host-assignments/distribute');
  const after = await call('admin', 'GET', `/admin/host-assignments?search=${users.tHost.phone}`);
  const mine = (after.data || []).find((h) => String(h.id) === hostId);
  const none = await call('admin', 'GET', '/admin/host-assignments?manager=none');
  check('distribution gives every unassigned host a manager', dist.status === 200 && dist.data?.assigned === wasUnassigned.length && mine?.manager?.id && (none.data || []).length === 0, `${brief(dist)} / ${JSON.stringify(mine || null)}`);
  for (const id of wasUnassigned.filter((x) => x !== hostId)) await call('admin', 'PUT', `/admin/hosts/${id}/account-manager`, { managerId: null });

  const notManager = await call('admin', 'PUT', `/admin/hosts/${hostId}/account-manager`, { managerId: idOf(users.admin) });
  check('only an account manager can be assigned', notManager.status === 404, brief(notManager));
  const assign = await call('admin', 'PUT', `/admin/hosts/${hostId}/account-manager`, { managerId });
  check('admin assigns the QA manager to the host', assign.status === 200 && String(assign.data?.manager?.id) === managerId && assign.data.manager.name === 'QA Account Manager', brief(assign));
  const info = await call('tHost', 'GET', '/host/support/info');
  check('host app support screen shows the account manager', info.data?.accountManager?.name === 'QA Account Manager' && info.data.accountManager.phone === `0${QA_MANAGER_PHONE}` && info.data.phone && info.data.email, brief(info));

  const lg = await loginPhone('manager', QA_MANAGER_PHONE, 'admin');
  check('the account manager signs in', lg.r.status === 200 && tokens.manager && users.manager?.adminRole === 'account_manager', brief(lg.r, 120));
  if (!tokens.manager) return;
  const locked = await call('manager', 'GET', '/admin/users');
  const locked2 = await call('manager', 'GET', `/bookings/${tBooking?._id}`);
  check('an account manager cannot open the admin panel or other APIs', locked.status === 403 && locked2.status === 403, `${locked.status} / ${locked2.status}`);
  const ov = await call('manager', 'GET', '/manager/overview');
  // Counts are ">= 1": a host left behind by an interrupted earlier run may still be assigned.
  check('manager overview counts the host, the listing and the waiting permit', ov.status === 200 && ov.data?.hosts >= 1 && ov.data?.properties >= 1 && ov.data?.pendingLicenses >= 1 && ['pendingProperties', 'openTickets', 'upcomingBookings', 'pendingBookings'].every((k) => typeof ov.data?.[k] === 'number') && ov.data.upcomingBookings >= 1, brief(ov));
  const hs = await call('manager', 'GET', '/manager/hosts');
  const hrow = (hs.data || []).find((h) => String(h.id) === hostId);
  check('manager sees the assigned host and not the seed hosts', hs.status === 200 && hs.data?.length === ov.data?.hosts && hrow && hrow.name === `مضيف الاختبار ${stamp}` && hrow.properties === 1 && hrow.activeProperties === 1 && hrow.phone === users.tHost.phone && hrow.isSuspended === false
    && !(hs.data || []).some((h) => String(h.id) === idOf(users.host)), brief(hs, 300));
  const h1 = await call('manager', 'GET', `/manager/hosts/${hostId}`);
  const d = h1.data || {};
  check('manager host page has listings, permit, bookings and money', h1.status === 200 && String(d.host?.id) === hostId && d.properties?.length === 1 && String(d.properties[0].id) === p && d.properties[0].isApproved === true
    && d.licenses?.length === 1 && String(d.licenses[0].unitId) === u && d.licenses[0].status === 'pending' && d.licenses[0].licenseNumber === `QA2-${stamp}`
    && (d.bookings || []).some((b) => String(b.id) === tBooking?._id && b.guestName && b.total === tBooking.pricing.total && b.status === 'confirmed')
    && Array.isArray(d.tickets) && d.finance?.bookingsCount === 1 && Math.abs(d.finance.bookingsValue - tBooking.pricing.total) < 0.01 && Array.isArray(d.finance.payouts), brief(h1, 400));
  const foreign = await call('manager', 'GET', `/manager/hosts/${idOf(users.host)}`);
  const foreignLic = await call('manager', 'PUT', `/manager/licenses/${unit._id}`, { action: 'approve' });
  const foreignProp = await call('manager', 'POST', `/manager/properties/${idOf(unit.property)}/moderate`, { action: 'reject', reason: 'x' });
  check('manager cannot open or act on a host that is not theirs', foreign.status === 404 && foreignLic.status === 404 && foreignProp.status === 404, `${foreign.status} / ${foreignLic.status} / ${foreignProp.status}`);

  const appr = await call('manager', 'PUT', `/manager/licenses/${u}`, { action: 'approve' });
  const row = (await call('tHost', 'GET', '/host/properties/permits')).data?.flatMap((g) => g.units || []).find((x) => x.unitId === u);
  check('manager approves the permit and the host app shows it approved', appr.status === 200 && appr.data?.status === 'active' && row?.permitStatus === 'approved' && row?.permitNumber === `QA2-${stamp}`, `${brief(appr)} / ${JSON.stringify(row || null)}`);

  // Listing moderation: admin rejects, manager approves.
  const reason = 'الصور لا تطابق العقار';
  const rej = await call('admin', 'POST', `/admin/properties/${p}/moderate`, { action: 'reject', reason });
  check('admin rejects the listing', rej.status === 200 && rej.data?.isApproved === false && rej.data?.isActive === false && rej.data?.moderationNote === reason, brief(rej, 120));
  const hiddenSearch = await call(null, 'GET', '/units/search?city=Abha&limit=50');
  check('a rejected listing is not in search', hiddenSearch.status === 200 && !(hiddenSearch.data || []).some((x) => x._id === u), `found ${(hiddenSearch.data || []).some((x) => x._id === u)}`);
  const tryOn = await call('tHost', 'PUT', `/host/properties/${p}/toggle`);
  check('the host cannot switch a rejected listing back on and is told why', tryOn.status === 403 && tryOn.json?.code === 'PROPERTY_REJECTED' && tryOn.json?.moderationNote === reason, brief(tryOn));
  const notes = await call('tHost', 'GET', '/host/notifications?page=1');
  check('host is told about the rejected listing with the reason', (notes.data || []).some((n) => n.type === 'listing_rejected' && String(n.body).includes(reason)), brief(notes, 200));
  const ov2 = await call('manager', 'GET', '/manager/overview');
  check('manager overview now shows one more listing waiting and one permit fewer', ov2.data?.pendingProperties === ov.data?.pendingProperties + 1 && ov2.data?.pendingLicenses === ov.data?.pendingLicenses - 1, `${brief(ov, 160)} → ${brief(ov2, 160)}`);
  const badAct = await call('manager', 'POST', `/manager/properties/${p}/moderate`, { action: 'delete' });
  check('manager moderation accepts only approve or reject', badAct.status === 400, brief(badAct));
  const ok = await call('manager', 'POST', `/manager/properties/${p}/moderate`, { action: 'approve' });
  const back = await call(null, 'GET', '/units/search?city=Abha&limit=50');
  check('manager approves the listing and it is back in search', ok.status === 200 && ok.data?.isApproved === true && ok.data?.isActive === true && (back.data || []).some((x) => x._id === u), brief(ok, 120));

  // Support ticket of the host goes to the manager.
  const text = `سؤال لمدير الحساب ${stamp}`;
  const send = await call('tHost', 'POST', '/host/support/chat/messages', { text });
  tTicketId = send.data?.ticketId;
  const chat = await call('tHost', 'GET', '/host/support/chat');
  check('host app support chat shows the message it sent', send.status === 201 && tTicketId && send.data?.text === text && send.data?.sender === 'host' && chat.data?.[0]?.text === text && chat.json?.ticket?.id === tTicketId && chat.json.ticket.status === 'open', `${brief(send)} / ${brief(chat, 120)}`);
  const tk = await call('manager', 'GET', `/manager/tickets/${tTicketId}`);
  check('manager opens the ticket and reads the host text', tk.status === 200 && String(tk.data?.id) === tTicketId && String(tk.data?.hostId) === hostId && tk.data?.messages?.[0]?.content === text && tk.data.messages[0].fromHost === true && tk.data.status === 'open', brief(tk, 260));
  const answer = `رد مدير الحساب ${stamp}`;
  const rep = await call('manager', 'POST', `/manager/tickets/${tTicketId}/reply`, { message: answer });
  check('manager replies and the ticket moves to in progress', rep.status === 200 && rep.data?.status === 'in_progress' && rep.data?.messages?.at(-1)?.content === answer && rep.data.messages.at(-1).fromHost === false, brief(rep, 200));
  const chat2 = await call('tHost', 'GET', '/host/support/chat');
  check('host reads the reply in the app, marked as from support', chat2.data?.[0]?.text === answer && chat2.data[0].sender === 'support' && chat2.json?.ticket?.status === 'in_progress', brief(chat2, 200));
  const hn = await call('tHost', 'GET', '/host/notifications?page=1');
  check('host gets a notification for the reply', (hn.data || []).some((n) => n.type === 'support_reply' && n.body === answer), brief(hn, 200));
  const badSt = await call('manager', 'PUT', `/manager/tickets/${tTicketId}/status`, { status: 'done' });
  const st = await call('manager', 'PUT', `/manager/tickets/${tTicketId}/status`, { status: 'resolved' });
  const chat3 = await call('tHost', 'GET', '/host/support/chat');
  check('manager resolves the ticket and the host sees it resolved', badSt.status === 400 && st.status === 200 && st.data?.status === 'resolved' && chat3.json?.ticket?.status === 'resolved', `${badSt.status} / ${brief(st, 100)} / ${JSON.stringify(chat3.json?.ticket)}`);
  const foreignTicket = await call('manager', 'GET', '/manager/tickets/000000000000000000000000');
  check('an unknown ticket answers 404 for the manager', foreignTicket.status === 404, brief(foreignTicket));
});

await step('unit quality points and the host loyalty programme', async () => {
  if (!haveListing()) return skip('points', 'no throwaway listing');
  const pu = await call('tHost', 'GET', '/host/properties-units');
  const mine = (pu.data || []).find((x) => x._id === tProperty._id);
  check('points page lists the property with its active unit', pu.status === 200 && mine?.title && mine.units?.length === 1 && mine.units[0]._id === tUnit._id && mine.units[0].nameAr, brief(pu, 200));
  const pts = await call('tHost', 'GET', `/host/units/${tUnit._id}/points`);
  const d = pts.data || {};
  const metric = (k) => (d.performance?.metrics || []).concat(d.excellence?.metrics || []).find((x) => x.key === k);
  check('unit points break down into scored metrics that add up', pts.status === 200 && d.unitId === tUnit._id && typeof d.totalPoints === 'number' && d.maxPoints > 0 && d.performance?.metrics?.length === 8 && d.excellence?.metrics?.length === 2
    && d.performance.metrics.every((x) => x.key && typeof x.score === 'number' && x.max > 0 && x.label) && d.totalPoints === d.performance.total + d.excellence.total
    && d.performance.total === d.performance.metrics.reduce((s, x) => s + x.score, 0), brief(pts, 300));
  check('an approved permit and a weekly discount earn their points', metric('tourismPermit')?.score === 10 && metric('discounts')?.score === 5 && metric('photosUpdated')?.score === 1, JSON.stringify([metric('tourismPermit'), metric('discounts'), metric('photosUpdated')]));
  const pts2 = await call('tHost', 'GET', `/host/units/${tUnit._id}/points`);
  check('a second look compares with the first (previous points and change)', pts2.data?.previousPoints === d.totalPoints && pts2.data?.delta === 0, brief(pts2, 120));
  const foreign = await call('tHost', 'GET', `/host/units/${unit._id}/points`);
  check('a host cannot read points of a unit that is not theirs', foreign.status === 403, brief(foreign));

  // Loyalty: seed host (has history). Read only.
  const loy = await call('host', 'GET', '/host/loyalty');
  const l = loy.data || {};
  const metricKeys = Object.keys(l.metrics || {});
  check('website loyalty page has the tier, every metric and its thresholds', loy.status === 200 && l.tier && l.tierLabel?.ar && l.quarter && metricKeys.length === 6 && metricKeys.every((k) => typeof l.metrics[k].value === 'number' && l.metrics[k].tier && l.thresholds?.[k] && l.metricLabels?.[k]?.ar)
    && Array.isArray(l.tiers) && l.tiers.includes(l.tier) && Array.isArray(l.availableQuarters) && typeof l.benefits?.cashbackPercent === 'number', brief(loy, 300));
  const lq = await call('host', 'GET', `/host/loyalty?quarter=${encodeURIComponent(l.quarter)}`);
  check('asking for the current quarter by name gives the same quarter', lq.status === 200 && lq.data?.quarter === l.quarter && lq.data?.tier === l.tier, brief(lq, 100));
  const ls = await call('host', 'GET', '/host/loyalty/summary');
  check('loyalty summary agrees with the full page', ls.status === 200 && ls.data?.tier === l.tier && ls.data?.quarter === l.quarter && ls.data?.tierLabel?.ar === l.tierLabel?.ar && typeof ls.data?.benefits?.cashbackPercent === 'number', brief(ls));

  const tiers = await call('host', 'GET', '/host/program/tiers');
  check('app programme tiers have names, cashback and benefits', tiers.status === 200 && tiers.data?.length === l.tiers?.length && tiers.data.every((t) => t.level && hasArabic(t.nameAr) && t.nameEn && typeof t.cashbackPercent === 'number' && typeof t.bonusPoints === 'number' && Array.isArray(t.benefits)), brief(tiers, 260));
  const status = await call('host', 'GET', '/host/program/status');
  const ind = await call('host', 'GET', '/host/ambassador/indicators');
  const indKeys = Object.keys(ind.data || {}).filter((k) => ind.data[k] && typeof ind.data[k] === 'object' && 'thresholds' in ind.data[k]);
  check('app indicators carry value, thresholds per tier and the level reached', ind.status === 200 && indKeys.length === 6 && indKeys.every((k) => typeof ind.data[k].value === 'number' && ind.data[k].thresholds.length === tiers.data?.length && ind.data[k].tier && typeof ind.data[k].reverse === 'boolean')
    && ind.data.level === status.data?.level && ind.data.quarter === l.quarter && Array.isArray(ind.data.availableQuarters), brief(ind, 300));
  const indQ = await call('host', 'GET', `/host/ambassador/indicators?quarter=${encodeURIComponent(l.quarter)}`);
  check('indicators for a named quarter answer for that quarter', indQ.status === 200 && indQ.data?.quarter === l.quarter, brief(indQ, 100));
  const cmp = await call('host', 'GET', '/host/ambassador/comparison');
  check('tier comparison lists requirements and benefits per tier', cmp.status === 200 && cmp.data?.tiers?.length === tiers.data?.length && cmp.data.tiers.every((t) => t.level && t.name && hasArabic(t.nameAr) && Object.keys(t.requirements || {}).length === 6 && Array.isArray(t.benefits)), brief(cmp, 260));
  const faq = await call('host', 'GET', '/host/ambassador/faq');
  check('programme questions and answers are present', faq.status === 200 && faq.data?.items?.length > 0 && faq.data.items.every((f) => f.question && f.answer), brief(faq, 160));
  const terms = await call('host', 'GET', '/host/ambassador/terms');
  check('programme terms answer with a list of sections', terms.status === 200 && Array.isArray(terms.data?.sections), brief(terms));
});

await step('host reports and statements (seed host, read only)', async () => {
  const wk = await call('host', 'GET', '/host/reports/weekly');
  const w0 = (wk.data || [])[0];
  check('weekly reports: eight weeks, newest first, with sales, ratings and reply rate', wk.status === 200 && wk.data?.length === 8 && isoDay.test(w0?.id || '') && wk.data[0].id > wk.data[1].id
    && wk.data.every((w) => typeof w.sales === 'number' && typeof w.totalBookings === 'number' && typeof w.confirmedBookings === 'number' && typeof w.ratings?.overall === 'number' && typeof w.conversations?.responseRate === 'number' && typeof w.complaints === 'number'), brief(wk, 300));
  const one = await call('host', 'GET', `/host/reports/weekly/${w0?.id}`);
  check('one weekly report opens by its id with the same week', one.status === 200 && one.data?.id === w0?.id && one.data?.weekStart === w0?.weekStart && typeof one.data?.sales === 'number' && one.data.totalBookings >= w0.totalBookings, brief(one, 200));
  const badId = await call('host', 'GET', '/host/reports/weekly/not-a-date');
  const future = await call('host', 'GET', `/host/reports/weekly/${dayAt(60)}`);
  check('a malformed report id answers 400 and a future week 404', badId.status === 400 && future.status === 404, `${badId.status} / ${future.status}`);

  const app = await call('host', 'GET', '/host/statements');
  const row = (app.data || [])[0];
  if (!row) {
    skip('statement detail', 'the seed host has no month with earnings');
  } else {
    const det = await call('host', 'GET', `/host/statements/${row.month}`);
    const tx = det.data?.transactions || [];
    check('app statement opens by month and its lines add up to the total', det.status === 200 && det.data?.month === row.month && det.data?.year === row.year && tx.length > 0 && Math.abs(det.data.closingBalance - row.closingBalance) < 0.01
      && Math.abs(tx.reduce((s, t) => s + t.credit - t.debit, 0) - det.data.closingBalance) < 0.01 && tx.every((t) => t.date && typeof t.description === 'string' && typeof t.balance === 'number'), brief(det, 300));
    if (det.data?.isFallback) {
      const debits = tx.filter((t) => t.type === 'commission');
      check('statement shows the platform commission as its own debit lines', debits.length > 0 && debits.every((t) => t.debit > 0 && t.credit === 0 && /عمولة المنصة \(5%\)/.test(t.description))
        && Math.abs(debits.reduce((s, t) => s + t.debit, 0) - det.data.totalDebits) < 0.01 && Math.abs(det.data.totalCredits - det.data.totalDebits - det.data.closingBalance) < 0.01, brief(det, 300));
    }
    const badMonth = await call('host', 'GET', '/host/statements/13');
    check('an impossible month is refused', badMonth.status === 400, brief(badMonth));
    const web = await call('host', 'GET', `/host/finance/statements?year=${row.year}`);
    const wrow = (web.data?.statements || []).find((s) => s.period?.month === Number(row.month));
    check('website statements list the same month with the same total', web.status === 200 && web.data?.year === row.year && wrow && Math.abs(wrow.closingBalance - row.closingBalance) < 0.01 && typeof wrow.totalCredits === 'number' && wrow.status, `${brief(web, 260)} / app ${row.closingBalance}`);
    const wdet = await call('host', 'GET', `/host/finance/statements/${wrow?._id}`);
    const entries = wdet.data?.entries || [];
    check('website statement detail has the same lines and total', wdet.status === 200 && wdet.data?.period?.month === Number(row.month) && entries.length === tx.length && Math.abs(wdet.data.closingBalance - row.closingBalance) < 0.01
      && entries.every((e) => e.date && typeof e.credit === 'number' && typeof e.balance === 'number' && (e.descriptionAr || e.description)), `${brief(wdet, 220)} / app lines ${tx.length}`);
  }
  const inv = await call('host', 'GET', '/host/finance/invoices');
  check('website invoices answer as a paged list', inv.status === 200 && Array.isArray(inv.data) && typeof inv.json?.pagination?.total === 'number', brief(inv));
});

await step('reviews: host list, replies from website and app, guest edits', async () => {
  const MARK = ' [qa]';
  const web = await call('host', 'GET', '/host/reviews?limit=100');
  const rows = web.data || [];
  check('host reviews carry both the website fields and the app fields', web.status === 200 && rows.length > 0
    && rows.every((r) => r._id && r.id === r._id && r.ratings?.overall >= 1 && r.overallRating === r.ratings.overall && typeof r.guestName === 'string' && r.guestName && r.guest?.name === r.guestName && r.property?.title && typeof r.unitName === 'string' && typeof r.comment === 'string')
    && typeof web.json?.summary?.averageRating === 'number' && web.json.summary.total >= rows.length && web.json.summary.distribution && typeof web.json?.pagination?.pages === 'number' && web.json?.meta?.totalPages === web.json.pagination.pages, brief(web, 300));
  const paged = await call('host', 'GET', '/host/reviews?page=1&limit=1');
  check('app paging of reviews is honoured', paged.status === 200 && paged.data?.length === 1 && paged.json?.meta?.currentPage === 1 && paged.json.meta.totalPages === web.json?.summary?.total, brief(paged, 120));
  const target = rows.find((r) => r.hostResponse?.comment) || rows[0];
  if (!target) return skip('review replies', 'the seed host has no reviews');
  const pid = idOf(target.property);
  const original = (target.hostResponse?.comment || 'شكراً لتقييمك').replace(MARK, '');

  // Website reply, visible to the public; then the app puts the original text back.
  const res = await call('host', 'POST', `/reviews/${target._id}/respond`, { comment: original + MARK });
  const pub = await call(null, 'GET', `/reviews/property/${pid}`);
  check('website host reply is saved and shown on the property page', res.status === 200 && res.data?.hostResponse?.comment === original + MARK && (pub.data || []).find((r) => r._id === target._id)?.hostResponse?.comment === original + MARK, brief(res, 200));
  const notOwner = await call('tHost', 'POST', `/reviews/${target._id}/respond`, { comment: 'x' });
  const asGuest = await call('guest', 'POST', `/host/reviews/${target._id}/reply`, { reply: 'x' });
  check('only the host of the property can reply', (!tokens.tHost || notOwner.status === 403) && asGuest.status === 403, `${notOwner.status} / ${asGuest.status}`);
  const app = await call('host', 'POST', `/host/reviews/${target._id}/reply`, { reply: original });
  check('app host reply answers in the app shape', app.status === 200 && app.data?.id === target._id && app.data?.hostReply === original && app.data?.hostReplyDate && typeof app.data?.overallRating === 'number' && typeof app.data?.comment === 'string', brief(app, 260));
  const again = await call('host', 'GET', '/host/reviews?limit=100');
  check('the reply shows in the host list and on the property page (original text restored)', (again.data || []).find((r) => r._id === target._id)?.hostReply === original
    && ((await call(null, 'GET', `/reviews/property/${pid}`)).data || []).find((r) => r._id === target._id)?.hostResponse?.comment === original, 'reply not restored');
  const emptyReply = await call('host', 'POST', `/host/reviews/${target._id}/reply`, { reply: '   ' });
  check('an empty reply is refused', emptyReply.status === 400, brief(emptyReply));

  // The seed guest edits their own review and puts the text back.
  const mineRow = rows.find((r) => idOf(r.guest) === idOf(users.guest));
  if (!mineRow) {
    skip('guest edits a review', 'the seed guest has no review on the seed host');
  } else {
    const text = mineRow.comment.replace(MARK, '');
    const ed = await call('guest', 'PUT', `/reviews/${mineRow._id}`, { comment: text + MARK });
    const seen = ((await call(null, 'GET', `/reviews/property/${idOf(mineRow.property)}`)).data || []).find((r) => r._id === mineRow._id);
    check('guest edits the review text and the public page shows it', ed.status === 200 && ed.data?.comment === text + MARK && ed.data?.ratings?.overall === mineRow.ratings.overall && seen?.comment === text + MARK, brief(ed, 200));
    const stranger = tokens.tGuest ? await call('tGuest', 'PUT', `/reviews/${mineRow._id}`, { comment: 'تعديل من شخص آخر' }) : { status: 403 };
    check('another guest cannot edit it', stranger.status === 403, `status ${stranger.status}`);
    const back = await call('guest', 'PUT', `/reviews/${mineRow._id}`, { comment: text });
    check('the original review text is put back', back.status === 200 && back.data?.comment === text, brief(back, 160));

    // Writing a new review needs a stay that ended more than 24 hours ago,
    // which cannot be created through the API. Only the refusals are
    // reachable, so these two calls are not counted as coverage.
    const early = await call('guest', 'POST', '/reviews', { propertyId: idOf(unit.property), bookingId: booking?._id, ratings: { overall: 9 }, comment: 'إقامة ممتازة ونظيفة جداً' }, { noHit: true });
    check('a stay that has not finished cannot be reviewed', !booking || (early.status === 400 && /completed/i.test(early.json?.message || '')), brief(early));
    const twice = await call('guest', 'POST', '/reviews', { propertyId: idOf(mineRow.property), bookingId: idOf(mineRow.booking), ratings: { overall: 9 }, comment: 'إقامة ممتازة ونظيفة جداً' }, { noHit: true });
    check('a stay cannot be reviewed twice', twice.status === 400 && /already reviewed/i.test(twice.json?.message || ''), brief(twice));
  }
});

await step('host app: suggestions and votes', async () => {
  if (!tokens.tHost) return skip('suggestions', 'no throwaway host');
  const short = await call('tHost', 'POST', '/host/suggestions', { text: 'ا' });
  check('a one-letter suggestion is refused', short.status === 400, brief(short));
  const text = `اقتراح من الاختبار الآلي ${stamp}`;
  const made = await call('tHost', 'POST', '/host/suggestions', { text });
  const id = made.data?.id;
  check('host posts a suggestion', made.status === 201 && id && made.data.text === text && made.data.isMine === true && made.data.votes?.important === 0 && made.data.percentages?.notImportant === 0 && made.data.currentUserVote === undefined, brief(made));
  const list = await call('host', 'GET', '/host/suggestions');
  const row = (list.data || []).find((s) => s.id === id);
  check('another host sees it, with only the first name of the author', list.status === 200 && row?.text === text && row.isMine === false && row.hostName === 'مضيف' && row.createdAt, JSON.stringify(row || null));
  const vote = await call('host', 'POST', `/host/suggestions/${id}/vote`, { vote: 'important' });
  check('a vote is counted and remembered for the voter', vote.status === 200 && vote.data?.votes?.important === 1 && vote.data?.percentages?.important === 100 && vote.data?.currentUserVote === 'important', brief(vote));
  const change = await call('host', 'POST', `/host/suggestions/${id}/vote`, { vote: 'not_important' });
  check('changing the vote moves it, it is not counted twice', change.status === 200 && change.data?.votes?.important === 0 && change.data?.votes?.notImportant === 1 && change.data?.percentages?.notImportant === 100 && change.data?.currentUserVote === 'not_important', brief(change));
  const bad = await call('host', 'POST', `/host/suggestions/${id}/vote`, { vote: 'maybe' });
  check('an unknown vote value is refused', bad.status === 400, brief(bad));
  const mine = await call('tHost', 'GET', '/host/suggestions');
  check('the author sees the vote on their suggestion', (mine.data || []).find((s) => s.id === id)?.votes?.notImportant === 1 && (mine.data || []).find((s) => s.id === id)?.isMine === true, brief(mine, 200));
});

await step('host complaint about a guest → admin acts → both are told', async () => {
  if (!tBooking?._id) return skip('complaints', 'no throwaway booking');
  const description = `شكوى اختبار آلي ${stamp}`;
  const made = await call('tHost', 'POST', '/host/complaints', { targetType: 'user', targetId: idOf(users.tGuest), reason: 'property_damage', description, relatedBooking: tBooking._id });
  const id = made.data?.id;
  check('host files a complaint about the guest of a booking', made.status === 201 && id && made.data.title === 'أضرار في العقار' && made.data.status === 'pending' && made.data.description === description && made.data.relatedBooking === tBooking._id && made.data.targetId === idOf(users.tGuest), brief(made));
  const foreignBooking = await call('tHost', 'POST', '/host/complaints', { targetType: 'user', targetId: idOf(users.guest), reason: 'other', description: 'x', relatedBooking: booking?._id });
  check('a complaint cannot cite a booking of another host', !booking || foreignBooking.status === 404, brief(foreignBooking));
  const list = await call('tHost', 'GET', '/host/complaints');
  check('the complaint is in the host list', list.status === 200 && (list.data || []).some((c) => c.id === id && c.status === 'pending' && c.actionTaken === 'none'), brief(list, 200));
  const adminOne = await call('admin', 'GET', `/reports/admin/${id}`);
  check('admin opens the complaint', adminOne.status === 200 && adminOne.data?.description === description && adminOne.data?.reason === 'property_damage', brief(adminOne, 200));
  const act = await call('admin', 'PUT', `/reports/admin/${id}/action`, { status: 'resolved', actionTaken: 'warning', adminNotes: 'تم تنبيه <b>الضيف</b>' });
  check('admin resolves it with a warning (notes are stored without HTML)', act.status === 200 && act.data?.status === 'resolved' && act.data?.actionTaken === 'warning' && act.data?.adminNotes === 'تم تنبيه الضيف' && act.data?.reviewedBy?.name === users.admin.name && act.data?.reviewedAt, brief(act, 260));
  const gl = await call('tGuest', 'GET', '/notifications');
  check('the reported guest receives the warning in Arabic', ((gl.data?.notifications || gl.data) || []).some((n) => n.title === 'تنبيه على حسابك' && hasArabic(n.message) && n.isRead === false), brief(gl, 200));
  const me = await call('tGuest', 'GET', '/auth/me');
  check('a warning does not suspend the account', me.status === 200 && me.json?.user?.isSuspended === false, brief(me, 100));
  const list2 = await call('tHost', 'GET', '/host/complaints');
  check('the host sees the outcome on the complaint', (list2.data || []).some((c) => c.id === id && c.status === 'resolved' && c.actionTaken === 'warning'), brief(list2, 200));
  const hn = await call('tHost', 'GET', '/host/notifications?page=1');
  check('the host is told the complaint was reviewed', (hn.data || []).some((n) => n.title === 'تمت مراجعة بلاغك'), brief(hn, 200));
  const asGuest = await call('guest', 'PUT', `/reports/admin/${id}/action`, { status: 'dismissed' });
  check('a guest cannot act on a report', asGuest.status === 401 || asGuest.status === 403, `status ${asGuest.status}`);

  const prot = await call('tHost', 'GET', '/host/protection-program');
  check('protection programme counters are numbers', prot.status === 200 && prot.data?.claimsThisYear === 0 && prot.data?.openClaims === 0 && prot.data?.totalCompensated === 0, brief(prot));
  const claims = await call('tHost', 'GET', '/host/claims');
  check('claims list is empty for a new host', claims.status === 200 && Array.isArray(claims.data) && claims.data.length === 0, brief(claims));
  // A claim needs a stay that has already started; bookings cannot start in
  // the past, so only the refusal is reachable (not counted as coverage).
  const claim = await call('tHost', 'POST', '/host/claims', { reservationId: tBooking._id, amountRequested: 300, description: 'ضرر في الأثاث' }, { noHit: true });
  check('a damage claim before the stay begins is refused in Arabic', claim.status === 400 && hasArabic(claim.json?.message), brief(claim));
});

await step('host app features that are switched off answer honestly', async () => {
  if (!tokens.tHost) return skip('switched-off features', 'no throwaway host');
  for (const path of ['/host/managers', '/host/referral-links', '/host/discount-codes', '/host/change-requests']) {
    const r = await call('tHost', 'GET', path);
    check(`GET ${path} is an empty list`, r.status === 200 && Array.isArray(r.data) && r.data.length === 0, brief(r));
  }
  const refusals = [
    ['POST', '/host/managers', { name: 'مدير', phone: '512345678', permissions: [] }, 501],
    ['PUT', '/host/managers/000000000000000000000000', { name: 'مدير' }, 501],
    ['DELETE', '/host/managers/000000000000000000000000', null, 501],
    ['POST', '/host/referral-links', null, 501],
    ['POST', '/host/discount-codes', { code: 'QA10', discountPercent: 10 }, 501],
    ['PUT', '/host/discount-codes/000000000000000000000000/toggle', null, 404],
  ];
  for (const [method, path, body, expected] of refusals) {
    const r = await call('tHost', method, path, body);
    check(`${method} ${path} refuses (${expected}) with a message instead of pretending to save`, r.status === expected && r.json?.success === false && typeof r.json?.message === 'string' && r.json.message.length > 0, brief(r));
  }
});

await step('admin: units of a property, bookings and refunds', async () => {
  if (!tBooking?._id) return skip('admin management', 'no throwaway booking');
  const p = tProperty._id; const u = tUnit._id;
  const units = await call('admin', 'GET', `/admin/properties/${p}/units`);
  check('admin lists the units of a property', units.status === 200 && units.data?.length === 1 && units.data[0]._id === u && units.data[0].isActive === true && units.data[0].nameAr && units.json?.pagination?.total === 1, brief(units, 200));
  const off = await call('admin', 'PATCH', `/admin/units/${u}/toggle`);
  const hidden = await call(null, 'GET', `/units/${u}`);
  check('admin switches a unit off and guests stop seeing it', off.status === 200 && off.data?.isActive === false && off.data?._id === u && hidden.status === 404, `${brief(off, 80)} / public ${hidden.status}`);
  const on = await call('admin', 'PATCH', `/admin/units/${u}/toggle`);
  const shown = await call(null, 'GET', `/units/${u}`);
  check('admin switches it back on', on.status === 200 && on.data?.isActive === true && shown.status === 200, `${brief(on, 80)} / public ${shown.status}`);
  const asHost = await call('tHost', 'PATCH', `/admin/units/${u}/toggle`);
  check('a host cannot use the admin unit switch', asHost.status === 403, brief(asHost));

  const second = await bookAs('tGuest', tUnit, dayAt(210), dayAt(211));
  tBooking2 = second.booking;
  check('guest makes a second booking for the admin to manage', tBooking2?._id, brief(second.made || second.hold));
  if (tBooking2?._id) {
    const bad = await call('admin', 'PATCH', `/admin/bookings/${tBooking2._id}`, { action: 'approve' });
    check('an unknown admin booking action is refused', bad.status === 400, brief(bad));
    const conf = await call('admin', 'PATCH', `/admin/bookings/${tBooking2._id}`, { action: 'confirm' });
    const seen = await call('tGuest', 'GET', `/bookings/${tBooking2._id}`);
    check('admin confirms a booking and the guest sees it confirmed', conf.status === 200 && conf.data?.status === 'confirmed' && conf.data?._id === tBooking2._id && seen.data?.status === 'confirmed', brief(conf, 100));
    const canc = await call('admin', 'PATCH', `/admin/bookings/${tBooking2._id}`, { action: 'cancel' });
    const seen2 = await call('tGuest', 'GET', `/bookings/${tBooking2._id}`);
    check('admin cancels it and the guest sees it cancelled', canc.status === 200 && canc.data?.status === 'cancelled' && seen2.data?.status === 'cancelled' && seen2.data?.cancelledAt, brief(canc, 100));
    const rows = await call('admin', 'GET', '/admin/bookings?status=cancelled&limit=50');
    check('admin booking list filters by status and shows guest and property', (rows.data || []).length > 0 && rows.data.every((b) => b.status === 'cancelled') && rows.data.some((b) => b._id === tBooking2._id && b.guest?.name && b.property?.title), brief(rows, 160));
    const del = await call('admin', 'DELETE', `/admin/bookings/${tBooking2._id}`);
    const gone = await call('tGuest', 'GET', `/bookings/${tBooking2._id}`);
    check('admin deletes the booking for good', del.status === 200 && gone.status === 404, `${brief(del)} / guest ${gone.status}`);
    const del2 = await call('admin', 'DELETE', `/admin/bookings/${tBooking2._id}`);
    check('deleting it twice answers 404', del2.status === 404, brief(del2));
    const logs = await call('admin', 'GET', '/admin/logs?limit=30');
    const logRows = logs.data?.logs || logs.data || [];
    check('the deletion is in the activity log', logRows.some((l) => l.action === 'booking_deleted' && String(l.target?.id) === tBooking2._id), `${logRows.length} rows`);
  }

  const ref = await call('admin', 'POST', `/admin/payments/${tPaymentId}/refund`, { reason: 'اختبار آلي' });
  check('admin refunds the payment in full', ref.status === 200 && ref.data?.status === 'refunded' && ref.data?.refundedAmount === tBooking.pricing.total && ref.data?.refundReason === 'اختبار آلي' && ref.data?.refundedAt, brief(ref, 200));
  const ref2 = await call('admin', 'POST', `/admin/payments/${tPaymentId}/refund`, { reason: 'مرة ثانية' });
  check('a payment cannot be refunded twice', ref2.status === 400, brief(ref2));
  const st = await call('tGuest', 'GET', `/payments/${tPaymentId}/status`);
  check('the guest sees the payment refunded', st.data?.status === 'refunded', brief(st));
  const bk = await call('tGuest', 'GET', `/bookings/${tBooking._id}`);
  check('a refunded payment is reflected on its booking', bk.data?.paymentStatus === 'refunded',
    `after POST /admin/payments/{id}/refund → 200 status "refunded", GET /bookings/{id} still answers paymentStatus "${bk.data?.paymentStatus}" and status "${bk.data?.status}": adminController.refundPayment only edits the Payment record (no booking update, no gateway call, no guest notification)`);
});

await step('blog: categories, posts, the host app article list', async () => {
  const name = { ar: 'تصنيف الاختبار', en: `QA Category ${stamp}` };
  const asGuest = await call('guest', 'POST', '/blog/categories', { name });
  check('only an admin can add a blog category', asGuest.status === 403, brief(asGuest));
  const cat = await call('admin', 'POST', '/blog/categories', { name });
  const catId = cat.data?._id;
  check('admin adds a category without typing a slug', cat.status === 201 && catId && cat.data.slug && cat.data.name?.ar === name.ar && cat.data.name?.en === name.en, brief(cat));
  const cats = await call(null, 'GET', '/blog/categories');
  check('the category is in the public list', cats.status === 200 && (cats.data || []).some((c) => c._id === catId && c.slug === cat.data?.slug), brief(cats, 200));

  const title = { ar: `مقال الاختبار ${stamp}`, en: `QA Article ${stamp}` };
  const post = await call('admin', 'POST', '/blog/posts', { title, content: { ar: 'نص المقال', en: 'Article body' }, excerpt: { ar: 'ملخص المقال', en: 'Summary' }, category: catId, tags: ['qa'], isPublished: true });
  const postId = post.data?._id; const slug = post.data?.slug;
  check('admin publishes a post in the category', post.status === 201 && postId && slug && post.data.isPublished === true && post.data.publishedAt && post.data.category?.slug === cat.data?.slug && post.data.author?.name === users.admin.name, brief(post, 260));
  const read = await call(null, 'GET', `/blog/posts/${slug}`);
  check('the article page opens by slug with both languages', read.status === 200 && read.data?._id === postId && read.data.title?.ar === title.ar && read.data.title?.en === title.en && read.data.content?.ar === 'نص المقال' && read.data.category?.name?.ar === name.ar && read.data.author?.name, brief(read, 260));
  const arts = await call('host', 'GET', `/articles?category=${cat.data?.slug}`);
  const a = (arts.data || []).find((x) => x.id === postId);
  check('host app article list shows it under its category, in Arabic, with a link', arts.status === 200 && arts.data?.length === 1 && a && a.title === title.ar && a.excerpt === 'ملخص المقال' && a.category === cat.data?.slug && a.categoryName === name.ar && isoDay.test(a.publishedDate) && a.url.endsWith(`/blog/${slug}`) && arts.json?.pagination?.total === 1, brief(arts, 300));
  const found = await call('host', 'GET', `/articles?search=${encodeURIComponent(`QA Article ${stamp}`)}`);
  check('article search finds it by title', (found.data || []).some((x) => x.id === postId), brief(found, 160));
  const nothing = await call('host', 'GET', '/articles?category=no-such-category');
  check('an unknown article category is an empty list', nothing.status === 200 && nothing.data?.length === 0, brief(nothing));

  const upd = await call('admin', 'PUT', `/blog/posts/${postId}`, { title: { ar: `مقال معدل ${stamp}`, en: title.en }, isPublished: false });
  check('admin edits the title and unpublishes', upd.status === 200 && upd.data?.title?.ar === `مقال معدل ${stamp}` && upd.data?.isPublished === false && upd.data?.slug === slug, brief(upd, 200));
  const arts2 = await call('host', 'GET', `/articles?category=${cat.data?.slug}`);
  const pubList = await call(null, 'GET', '/blog/posts?limit=50');
  check('an unpublished post leaves the app list and the public blog list', arts2.data?.length === 0 && !(pubList.data || []).some((x) => x._id === postId), `${arts2.data?.length} / ${(pubList.data || []).length}`);
  const draft = await call(null, 'GET', `/blog/posts/${slug}`);
  check('an unpublished post cannot be read by its address', draft.status === 404,
    `GET /blog/posts/${'{slug}'} without signing in answers ${draft.status} with the full post although isPublished is false: blogController.getPost has no isPublished filter (the list endpoints do)`);

  const delCat = await call('admin', 'DELETE', `/blog/categories/${catId}`);
  const adminPosts = await call('admin', 'GET', '/blog/posts?limit=50');
  const mine = (adminPosts.data || []).find((x) => x._id === postId);
  check('deleting the category keeps the post, without a category', delCat.status === 200 && mine && mine.category === null && !((await call(null, 'GET', '/blog/categories')).data || []).some((c) => c._id === catId), `${brief(delCat)} / ${JSON.stringify(mine?.category)}`);
  const delCat2 = await call('admin', 'DELETE', `/blog/categories/${catId}`);
  check('deleting a category twice answers 404', delCat2.status === 404, brief(delCat2));
  const delPost = await call('admin', 'DELETE', `/blog/posts/${postId}`);
  const gone = await call(null, 'GET', `/blog/posts/${slug}`);
  check('the test post is deleted', delPost.status === 200 && gone.status === 404, `${delPost.status} / ${gone.status}`);
});

await step('website account with e-mail and password: sign-up to deletion', async () => {
  const email = `qa-web-${stamp}@example.com`;
  const pass1 = `Qa-first-${stamp}`; const pass2 = `Qa-second-${stamp}`; const pass3 = `Qa-third-${stamp}`;
  const short = await call(null, 'POST', '/auth/register', { name: 'QA Web', email: `x-${email}`, password: 'short', role: 'guest' });
  if (short.status === 429) return skip('website e-mail account', 'sign-up is rate limited on this server right now (5 an hour)');
  check('a short password is refused at sign-up', short.status === 400, brief(short));
  const reg = await call(null, 'POST', '/auth/register', { name: 'QA Web', email, password: pass1, role: 'guest' });
  tokens.web = reg.json?.token;
  check('website sign-up answers with a session and the user, without the password', reg.status === 201 && tokens.web && reg.json?.refreshToken && reg.json?.user?.email === email && reg.json.user.role === 'guest' && reg.json.user.name === 'QA Web' && reg.json.user.password === undefined, brief(reg));
  if (!tokens.web) return;
  const dup = await call(null, 'POST', '/auth/register', { name: 'QA Web', email, password: pass1, role: 'guest' });
  check('the same e-mail cannot sign up twice', dup.status === 400, brief(dup));
  const prof = await call('web', 'PUT', '/auth/profile', { name: 'QA Web Renamed' });
  check('website settings page saves the name', prof.status === 200 && prof.json?.user?.name === 'QA Web Renamed' && prof.json.user.email === email, brief(prof));
  const up = await call('web', 'PUT', '/auth/upgrade-to-host');
  const me = await call('web', 'GET', '/auth/me');
  check('"upgrade to host" is retired: 410 and the account stays a guest', up.status === 410 && typeof up.json?.message === 'string' && me.json?.user?.role === 'guest', brief(up));

  // Password change: old session dies, the answer carries a new one.
  const wrongCur = await call('web', 'PUT', '/auth/change-password', { currentPassword: 'not-the-password', newPassword: pass2 });
  check('a wrong current password is refused', wrongCur.status === 400, brief(wrongCur));
  const oldToken = tokens.web;
  const chg = await call('web', 'PUT', '/auth/change-password', { currentPassword: pass1, newPassword: pass2 });
  tokens.web = chg.json?.token;
  const withOld = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${oldToken}` } });
  const withNew = await call('web', 'GET', '/auth/me');
  check('changing the password ends the old session and returns a new one', chg.status === 200 && tokens.web && tokens.web !== oldToken && chg.json?.user?.email === email && withOld.status === 401 && withNew.status === 200, `${brief(chg, 80)} old ${withOld.status} new ${withNew.status}`);

  // Refresh (apps send the token in the body) and sign-out (website sends the cookie).
  const ref = await call(null, 'POST', '/auth/refresh', { refreshToken: chg.json?.refreshToken });
  check('a refresh token is exchanged for a new session', ref.status === 200 && ref.json?.token && ref.json?.refreshToken && ref.json.refreshToken !== chg.json?.refreshToken, brief(ref, 80));
  tokens.web = ref.json?.token || tokens.web;
  const replay = await call(null, 'POST', '/auth/refresh', { refreshToken: chg.json?.refreshToken });
  check('a used refresh token cannot be used again', replay.status === 401, brief(replay));
  const out = await call(null, 'POST', '/auth/logout', null, { headers: { Cookie: `hostn_refresh=${ref.json?.refreshToken}` } });
  const afterOut = await call(null, 'POST', '/auth/refresh', { refreshToken: ref.json?.refreshToken });
  check('website sign-out revokes the refresh token', out.status === 200 && afterOut.status === 401, `${out.status} / ${afterOut.status}`);

  // Forgotten password
  const unknown = await call(null, 'POST', '/auth/forgot-password', { email: `nobody-${stamp}@example.com` });
  const forgot = await call(null, 'POST', '/auth/forgot-password', { email });
  const resetToken = (forgot.json?.resetUrl || '').split('token=')[1];
  check('"forgot password" answers the same for known and unknown e-mails', unknown.status === 200 && forgot.status === 200 && unknown.json?.message === forgot.json?.message && !unknown.json?.resetUrl && resetToken, `${brief(unknown, 120)} / ${brief(forgot, 120)}`);
  const badReset = await call(null, 'POST', '/auth/reset-password', { token: 'f'.repeat(64), password: pass3 });
  check('a made-up reset token is refused', badReset.status === 400, brief(badReset));
  const reset = await call(null, 'POST', '/auth/reset-password', { token: resetToken, password: pass3 });
  const stale = await call('web', 'GET', '/auth/me');
  const reuse = await call(null, 'POST', '/auth/reset-password', { token: resetToken, password: pass1 });
  check('the reset link sets a new password once and ends open sessions', reset.status === 200 && stale.status === 401 && reuse.status === 400, `${reset.status} / ${stale.status} / ${reuse.status}`);
  const oldLogin = await call(null, 'POST', '/auth/login', { email, password: pass2 });
  const login = await call(null, 'POST', '/auth/login', { email, password: pass3 });
  if (login.status === 429) return skip('website password sign-in', 'sign-in is rate limited on this server right now (10 per 15 minutes)');
  tokens.web = login.json?.token;
  check('sign-in works with the new password only', oldLogin.status === 401 && login.status === 200 && tokens.web && login.json?.user?.email === email && login.json.user.role === 'guest' && login.json.user.name === 'QA Web Renamed', `${oldLogin.status} / ${brief(login, 100)}`);

  // Deletion: an account without a phone confirms with its password.
  const ask = await call('web', 'DELETE', '/auth/account', {});
  check('deleting asks for the password first', ask.status === 428 && ask.json?.code === 'PASSWORD_REQUIRED', brief(ask));
  const wrong = await call('web', 'DELETE', '/auth/account', { password: pass1 });
  check('a wrong password does not delete', wrong.status === 400 && wrong.json?.code === 'INVALID_PASSWORD', brief(wrong));
  const del = await call('web', 'DELETE', '/auth/account', { password: pass3 });
  const dead = await call('web', 'GET', '/auth/me');
  const relog = await call(null, 'POST', '/auth/login', { email, password: pass3 });
  check('the account is deleted: session ended and the e-mail no longer signs in', del.status === 200 && dead.status === 401 && relog.status === 401, `${brief(del)} / ${dead.status} / ${relog.status}`);
});

await step('client calls that no screen uses yet, sent exactly as written', async () => {
  // Coupons cannot be created through the API and the seed has none, so the
  // success path of POST /coupons/validate is out of reach; these calls are
  // not counted as coverage. What can be checked is whether each client sends
  // what the server reads.
  const app = await call('guest', 'POST', '/coupons/validate', { code: 'QA-NO-SUCH-CODE', bookingAmount: 500 }, { noHit: true });
  check('guest app coupon check reaches the coupon lookup (unknown code → 404)', app.status === 404, brief(app));
  // The website helper (frontend/src/lib/api.ts couponsApi.validate) sends the same fields.
  const web = await call('guest', 'POST', '/coupons/validate', { code: 'QA-NO-SUCH-CODE', bookingAmount: 500 }, { noHit: true });
  check('website coupon check reaches the coupon lookup (unknown code → 404)', web.status === 404, brief(web));
});

await step('search pages never repeat a unit, and the featured filter filters', async () => {
  const seen = new Set(); let repeats = 0; let total = 0;
  for (let page = 1; page <= 20; page++) {
    const r = await call(null, 'GET', `/units/search?limit=3&page=${page}`);
    total = r.json?.pagination?.total ?? 0;
    for (const u of r.json?.data || []) { if (seen.has(u._id)) repeats++; seen.add(u._id); }
    if (page >= (r.json?.pagination?.pages ?? 0)) break;
  }
  check('paging through the search returns every unit exactly once', repeats === 0 && seen.size === Math.min(total, 60), `${seen.size} distinct of ${total}, ${repeats} repeated`);
  const f = await call(null, 'GET', '/units/search?featured=true&limit=50');
  const rows = f.json?.data || [];
  check('featured=true returns only units of featured properties', f.status === 200 && rows.length < total && rows.every((u) => u.property?.isFeatured === true), `${rows.length} of ${total}; flags ${[...new Set(rows.map((u) => u.property?.isFeatured))]}`);
});

await step('clean up: cancel, delete the listing, delete both throwaway accounts', async () => {
  if (!haveThrowaways()) return skip('clean up', 'no throwaway accounts');
  const hostId = idOf(users.tHost); const guestId = idOf(users.tGuest);

  // Both apps sign out with the refresh token they hold, so the server can revoke it.
  const out = await call('tHost', 'POST', '/auth/logout', { refreshToken: refreshTokens.tHost });
  const still = await call(null, 'POST', '/auth/refresh', { refreshToken: refreshTokens.tHost });
  check('signing out of the app ends the session on the server', out.status === 200 && still.status === 401, `${out.status} / refresh afterwards ${still.status}`);
  if (still.json?.token) tokens.tHost = still.json.token;

  if (tBooking?._id) {
    const c = await call('tGuest', 'PUT', `/bookings/${tBooking._id}/cancel`, { reason: 'تنظيف بعد الاختبار' });
    check('guest cancels the remaining booking', c.status === 200, brief(c, 120));
  }
  if (tUnit?._id) {
    await call('tHost', 'DELETE', `/host/units/${tUnit._id}/permit`);
    const row = ((await call('tHost', 'GET', '/host/properties/permits')).data || []).flatMap((g) => g.units || []).find((x) => x.unitId === tUnit._id);
    check('host app removes the permit', row?.permitStatus === 'none' && row?.permitNumber === undefined, JSON.stringify(row || null));
    const again = await call('tHost', 'PUT', `/host/units/${tUnit._id}/tourism-license`, { workType: 'company', licenseNumber: `QA3-${stamp}`, commercialRegister: '1010000001' });
    const rmv = await call('tHost', 'DELETE', `/host/units/${tUnit._id}/tourism-license`);
    const over = ((await call('tHost', 'GET', '/host/tourism-license')).data || []).find((g) => String(g.propertyId) === tProperty._id)?.units?.find((x) => String(x.unitId) === tUnit._id);
    check('website saves a company permit and removes it again', again.status === 200 && again.data?.workType === 'company' && again.data?.commercialRegister === '1010000001' && again.data?.status === 'pending' && rmv.status === 200 && over && over.license === null, `${brief(again, 120)} / ${rmv.status} / ${JSON.stringify(over || null)}`);

    const du = await call('tHost', 'DELETE', `/units/${tUnit._id}`);
    const dp = await call('tHost', 'DELETE', `/properties/${tProperty._id}`);
    check('host deletes the throwaway unit and property', du.status < 300 && dp.status < 300, `${du.status} / ${dp.status}`);
    const pu = await call('tHost', 'GET', '/host/properties-units');
    check('a deleted property leaves the website points page', !(pu.data || []).some((x) => x._id === tProperty._id),
      `after DELETE /properties/{id} → ${dp.status}, GET /host/properties-units still lists it (${(pu.data || []).length} row(s)): unitPointsController.getPropertiesWithUnits does not filter isDeleted`);
    const tl = await call('tHost', 'GET', '/host/tourism-license');
    const ghost = (tl.data || []).find((g) => String(g.propertyId) === tProperty._id);
    check('a deleted property leaves the website permit page', !ghost,
      `after DELETE /units/{id} and DELETE /properties/{id}, GET /host/tourism-license still lists the property with ${ghost?.unitCount} unit(s): tourismLicenseController.getLicenseOverview filters neither property.isDeleted nor unit.isDeleted`);
    const appList = await call('tHost', 'GET', '/host/properties');
    const permits = await call('tHost', 'GET', '/host/properties/permits');
    check('the host app lists no longer show the deleted property', !(appList.data || []).some((g) => String(g.id) === tProperty._id) && !(permits.data || []).some((g) => g.propertyId === tProperty._id), `${(appList.data || []).length} / ${(permits.data || []).length}`);
  }

  // Host account
  const ask = await call('tHost', 'DELETE', '/host/account', {});
  check('deleting the host account asks for a one-time code first', ask.status === 428 && ask.json?.code === 'OTP_REQUIRED' && hasArabic(ask.json?.message), brief(ask));
  const del = await call('tHost', 'DELETE', '/host/account', { otp: '0000' });
  const dead = await call('tHost', 'GET', '/host/profile');
  const deadRefresh = await call(null, 'POST', '/auth/refresh', { refreshToken: still.json?.refreshToken || refreshTokens.tHost });
  check('the host account is deleted and every session ended', del.status === 200 && (dead.status === 401 || dead.status === 403) && deadRefresh.status === 401, `${brief(del)} / ${dead.status} / ${deadRefresh.status}`);
  const adminHost = await call('admin', 'GET', `/admin/users/${hostId}`);
  check('admin sees the deleted host without name, phone or e-mail', adminHost.status === 200 && adminHost.data?.name === 'Deleted account' && !adminHost.data?.phone && !adminHost.data?.email && adminHost.data?.isSuspended === true && adminHost.data?.deletedAt, brief(adminHost, 260));
  if (tokens.manager) {
    const hs = await call('manager', 'GET', '/manager/hosts');
    check('the deleted host leaves the account manager list', hs.status === 200 && !(hs.data || []).some((h) => String(h.id) === hostId), brief(hs, 160));
  }
  if (tUnit?._id) {
    const pub = await call(null, 'GET', `/units/${tUnit._id}`);
    check('the deleted listing is not public', pub.status === 404, `status ${pub.status}`);
  }

  // Guest account
  const gAsk = await call('tGuest', 'DELETE', '/auth/account', {});
  check('deleting the guest account asks for a one-time code first', gAsk.status === 428 && gAsk.json?.code === 'OTP_REQUIRED', brief(gAsk));
  const gDel = await call('tGuest', 'DELETE', '/auth/account', { otp: '0000' });
  const gDead = await call('tGuest', 'GET', '/auth/me');
  check('the guest account is deleted and its session ended', gDel.status === 200 && (gDead.status === 401 || gDead.status === 403), `${brief(gDel)} / ${gDead.status}`);
  const adminGuest = await call('admin', 'GET', `/admin/users/${guestId}`);
  check('admin sees the deleted guest without personal data', adminGuest.status === 200 && adminGuest.data?.name === 'Deleted account' && !adminGuest.data?.phone && !adminGuest.data?.email && (adminGuest.data?.deviceTokens || []).length === 0, brief(adminGuest, 260));
  const cards = await call('admin', 'GET', '/admin/logs?limit=30');
  const logRows = cards.data?.logs || cards.data || [];
  check('both deletions are in the activity log', logRows.filter((l) => l.action === 'account_deleted' && [hostId, guestId].includes(String(l.target?.id))).length === 2, `${logRows.filter((l) => l.action === 'account_deleted').length} account_deleted rows in the last 30`);
});

// ─────────────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '.hits.json'), JSON.stringify([...hits].sort(), null, 2));
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed, ${knownIssues.length} known issue(s), ${skipped.length} skipped`);
if (knownIssues.length) {
  console.log('\nKnown issues (real defects, reported, still present):');
  knownIssues.forEach((k) => console.log(` - ${k.name}${k.detail ? `: ${k.detail}` : ''}`));
}
if (skipped.length) {
  console.log('\nSkipped:');
  skipped.forEach((k) => console.log(` - ${k.name}: ${k.reason}`));
}
if (failed.length) {
  console.log('\nFailed:');
  failed.forEach((f) => console.log(` - ${f.name}${f.detail ? `: ${f.detail}` : ''}`));
  process.exit(1);
}
