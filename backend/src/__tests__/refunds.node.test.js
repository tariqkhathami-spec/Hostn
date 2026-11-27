/**
 * Cancellation policy + refund service.  Run: node --test src/__tests__/refunds.node.test.js
 * (No database: the Payment model and the gateway are stubbed.)
 */
const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cancellationQuote, refundDeadline } = require('../utils/cancellationPolicy');

// Check-in on 2026-12-10 (stored as midnight UTC of that day).
const CHECK_IN = new Date('2026-12-10T00:00:00Z');
const riyadh = (iso) => new Date(`${iso}+03:00`);

describe('cancellation policy deadlines', () => {
  test('free: until noon Riyadh on the check-in day', () => {
    assert.equal(refundDeadline('free', CHECK_IN).toISOString(), riyadh('2026-12-10T12:00:00').toISOString());
  });
  test('flexible: until 2 days before the check-in day', () => {
    assert.equal(refundDeadline('flexible', CHECK_IN).toISOString(), riyadh('2026-12-08T00:00:00').toISOString());
  });
  test('normal: until 4 days before the check-in day', () => {
    assert.equal(refundDeadline('normal', CHECK_IN).toISOString(), riyadh('2026-12-06T00:00:00').toISOString());
  });
  test('restricted: never', () => assert.equal(refundDeadline('restricted', CHECK_IN), null));
  test('unknown or missing policy falls back to flexible', () => {
    assert.equal(cancellationQuote({ policy: undefined, checkIn: CHECK_IN }).policy, 'flexible');
    assert.equal(cancellationQuote({ policy: 'weird', checkIn: CHECK_IN }).policy, 'flexible');
  });
});

describe('cancellation quote', () => {
  const q = (policy, now, extra = {}) =>
    cancellationQuote({ policy, checkIn: CHECK_IN, paidAmount: 1150, now: riyadh(now), ...extra });

  test('inside the window refunds everything paid', () => {
    assert.deepEqual(
      { r: q('flexible', '2026-12-07T23:59:00').refundAmount, k: q('flexible', '2026-12-07T23:59:00').retainedAmount },
      { r: 1150, k: 0 },
    );
  });
  test('after the window refunds nothing', () => {
    const x = q('flexible', '2026-12-08T00:01:00');
    assert.equal(x.refundAmount, 0);
    assert.equal(x.retainedAmount, 1150);
  });
  test('free: morning of check-in still refunds, afternoon does not', () => {
    assert.equal(q('free', '2026-12-10T11:59:00').refundAmount, 1150);
    assert.equal(q('free', '2026-12-10T12:01:00').refundAmount, 0);
  });
  test('normal: 5 days before refunds, 3 days before does not', () => {
    assert.equal(q('normal', '2026-12-05T10:00:00').refundAmount, 1150);
    assert.equal(q('normal', '2026-12-07T10:00:00').refundAmount, 0);
  });
  test('restricted never refunds, even weeks ahead', () => {
    assert.equal(q('restricted', '2026-11-01T10:00:00').refundAmount, 0);
  });
  test('only what is left after an earlier partial refund comes back', () => {
    assert.equal(q('flexible', '2026-12-01T10:00:00', { refundedAmount: 150 }).refundAmount, 1000);
  });
  test('unpaid booking: nothing to refund', () => {
    assert.equal(cancellationQuote({ policy: 'free', checkIn: CHECK_IN, now: riyadh('2026-12-01T10:00:00') }).refundAmount, 0);
  });
});

describe('refund service', () => {
  const Payment = require('../models/Payment');
  let store; let fetchCalls;
  const svcPath = require.resolve('../services/refundService');

  beforeEach(() => {
    store = {};
    fetchCalls = [];
    const apply = (doc, upd) => {
      Object.assign(doc, upd.$set || {});
      for (const k of Object.keys(upd.$unset || {})) delete doc[k];
      return doc;
    };
    mock.method(Payment, 'findOneAndUpdate', async (filter, upd) => {
      const doc = store[filter._id];
      if (!doc || doc.status !== filter.status || (doc.refundedAmount || 0) !== filter.refundedAmount) return null;
      if (doc.refundLockAt) return null;
      return { ...apply(doc, upd) };
    });
    mock.method(Payment, 'findByIdAndUpdate', async (id, upd) => ({ ...apply(store[id], upd) }));
    mock.method(Payment, 'updateOne', async (f, upd) => apply(store[f._id], upd));
    delete require.cache[svcPath];
  });
  afterEach(() => { mock.restoreAll(); delete process.env.MOYASAR_SECRET_KEY; });

  const put = (p) => { store[p._id] = { refundedAmount: 0, ...p }; return { ...store[p._id] }; };
  const service = () => require(svcPath);

  test('simulated payment is refunded without the gateway', async () => {
    const p = put({ _id: 'p1', amount: 1000, status: 'completed', moyasarPaymentId: 'sim_success_1' });
    const r = await service().refundPayment(p, { amount: 400 });
    assert.equal(r.refunded, 400);
    assert.equal(r.fullyRefunded, false);
    assert.equal(store.p1.status, 'partially_refunded');
    assert.equal(store.p1.refundedAmount, 400);
    assert.equal(store.p1.refundLockAt, undefined);
  });

  test('second partial refund up to the total makes it fully refunded', async () => {
    put({ _id: 'p2', amount: 1000, status: 'partially_refunded', refundedAmount: 400, moyasarPaymentId: 'sim_success_2' });
    const r = await service().refundPayment({ ...store.p2 });
    assert.equal(r.refunded, 600);
    assert.equal(r.fullyRefunded, true);
    assert.equal(store.p2.status, 'refunded');
  });

  test('refusing more than what is left', async () => {
    const p = put({ _id: 'p3', amount: 1000, status: 'completed', moyasarPaymentId: 'sim_success_3' });
    await assert.rejects(service().refundPayment(p, { amount: 1000.01 }), /exceeds/);
    assert.equal(store.p3.status, 'completed');
  });

  test('real payment without MOYASAR_SECRET_KEY fails and records nothing', async () => {
    const p = put({ _id: 'p4', amount: 1000, status: 'completed', moyasarPaymentId: 'pay_abc12345' });
    await assert.rejects(service().refundPayment(p), (e) => e.status === 503);
    assert.equal(store.p4.status, 'completed');
    assert.equal(store.p4.refundedAmount, 0);
    assert.equal(store.p4.refundLockAt, undefined, 'lock released');
  });

  const stubGateway = (status, body) =>
    mock.method(globalThis, 'fetch', async (url, opts) => {
      fetchCalls.push({ url, body: JSON.parse(opts.body) });
      return { ok: status < 300, json: async () => body };
    });

  test('real payment: partial amount sent in halalas, recorded after gateway success', async () => {
    process.env.MOYASAR_SECRET_KEY = 'sk_test_x';
    const p = put({ _id: 'p5', amount: 1150.5, status: 'completed', moyasarPaymentId: 'pay_abc12345' });
    stubGateway(200, { id: 'pay_abc12345', status: 'refunded', amount: 115050, refunded: 50025 });
    const r = await service().refundPayment(p, { amount: 500.25 });
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0].url, /\/payments\/pay_abc12345\/refund$/);
    assert.deepEqual(fetchCalls[0].body, { amount: 50025 });
    assert.equal(r.fullyRefunded, false);
    assert.equal(store.p5.status, 'partially_refunded');
    assert.equal(store.p5.refundedAmount, 500.25);
  });

  test('gateway error: nothing recorded, lock released', async () => {
    process.env.MOYASAR_SECRET_KEY = 'sk_test_x';
    const p = put({ _id: 'p8', amount: 1000, status: 'completed', moyasarPaymentId: 'pay_abc12345' });
    stubGateway(400, { type: 'invalid_request_error', message: 'Amount exceeds' });
    await assert.rejects(service().refundPayment(p), (e) => e.status === 502 && /Amount exceeds/.test(e.message));
    assert.equal(store.p8.status, 'completed');
    assert.equal(store.p8.refundLockAt, undefined);
  });

  test('gateway says ok but refunded total did not move: not recorded', async () => {
    process.env.MOYASAR_SECRET_KEY = 'sk_test_x';
    const p = put({ _id: 'p9', amount: 1000, status: 'completed', moyasarPaymentId: 'pay_abc12345' });
    stubGateway(200, { id: 'pay_abc12345', status: 'paid', amount: 100000, refunded: 0 });
    await assert.rejects(service().refundPayment(p), (e) => e.status === 502);
    assert.equal(store.p9.refundedAmount, 0);
  });

  test('a refund already in progress is refused', async () => {
    const p = put({ _id: 'p6', amount: 1000, status: 'completed', moyasarPaymentId: 'sim_success_6', refundLockAt: new Date() });
    await assert.rejects(service().refundPayment(p), (e) => e.status === 409);
  });

  test('a payment already fully refunded is refused', async () => {
    const p = put({ _id: 'p7', amount: 1000, status: 'refunded', refundedAmount: 1000, moyasarPaymentId: 'sim_success_7' });
    await assert.rejects(service().refundPayment(p), /already refunded/);
  });
});
