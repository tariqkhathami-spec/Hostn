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

async function call(role, method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (role && tokens[role]) headers.Authorization = `Bearer ${tokens[role]}`;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  hits.add(`${method} ${path.split('?')[0]}`);
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

// ─────────────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '.hits.json'), JSON.stringify([...hits].sort(), null, 2));
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) {
  console.log('\nFailed:');
  failed.forEach((f) => console.log(` - ${f.name}${f.detail ? `: ${f.detail}` : ''}`));
  process.exit(1);
}
