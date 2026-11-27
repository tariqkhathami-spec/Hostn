/**
 * Integration keys page: no database needed (models are stubbed).
 * Run: npm run test:integrations
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.SECRETS_MASTER_KEY = 'm'.repeat(48);
process.env.MOYASAR_SECRET_KEY = 'sk_test_from_env_1234';
delete process.env.AUTHENTICA_API_KEY;
delete process.env.DEV_OTP_BYPASS;

// ── in-memory IntegrationSetting ─────────────────────────────────────────────
const rows = new Map();
const fakeModel = {
  find: () => ({ lean: async () => [...rows.values()] }),
  findOneAndUpdate: (q, u) => ({ lean: async () => { const doc = { key: q.key, ...u.$set, updatedAt: new Date() }; rows.set(q.key, doc); return doc; } }),
  deleteOne: async (q) => { rows.delete(q.key); },
};
require.cache[path.resolve(__dirname, '../models/IntegrationSetting.js')] = { exports: fakeModel, loaded: true, id: 'x' };

// ── stub admins for protect() ────────────────────────────────────────────────
const Admin = require('../models/Admin');
const admins = {
  aaaaaaaaaaaaaaaaaaaaaaaa: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Super', phone: '512345678', adminRole: 'super', tokenVersion: 0 },
  bbbbbbbbbbbbbbbbbbbbbbbb: { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Support', phone: '512345679', adminRole: 'support', tokenVersion: 0 },
};
Admin.findById = (id) => ({ select: async () => (admins[id] ? { ...admins[id] } : null) });
require('../models/ActivityLog').create = async () => ({});

const jwt = require('jsonwebtoken');
const store = require('../services/secretStore');
const express = require('express');

const session = (id) => jwt.sign({ id, userType: 'admin', tokenVersion: 0 }, process.env.JWT_SECRET);

function request(app, method, url, { token, body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({ port: server.address().port, method, path: url, headers: {
        'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers,
      } }, (res) => {
        let out = '';
        res.on('data', (c) => { out += c; });
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: out ? JSON.parse(out) : null }); });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (data) req.write(data);
      req.end();
    });
  });
}

const app = express();
app.use(express.json());
app.use('/api/v1/admin', require('../routes/admin'));

test('encryption round-trips and is bound to the key name', () => {
  const enc = store._encrypt('A_KEY', 'hello');
  assert.strictEqual(store._decrypt('A_KEY', enc), 'hello');
  assert.throws(() => store._decrypt('OTHER_KEY', enc));
  assert.notStrictEqual(store._encrypt('A_KEY', 'hello').iv, enc.iv);
});

test('masking never shows short secrets', () => {
  assert.strictEqual(store._mask('short'), '••••');
  assert.strictEqual(store._mask('sk_live_abcdefgh1234'), '••••1234');
});

test('dashboard value wins over env, clearing restores env', async () => {
  await store.load();
  assert.strictEqual(process.env.MOYASAR_SECRET_KEY, 'sk_test_from_env_1234');
  await store.set('MOYASAR_SECRET_KEY', 'sk_live_dashboard_9999', { _id: 'a', name: 'S' });
  assert.strictEqual(process.env.MOYASAR_SECRET_KEY, 'sk_live_dashboard_9999');
  assert.ok(!JSON.stringify([...rows.values()]).includes('sk_live_dashboard_9999'), 'plaintext stored');
  const item = store.describe().find((k) => k.key === 'MOYASAR_SECRET_KEY');
  assert.strictEqual(item.value, null);
  assert.strictEqual(item.masked, '••••9999');
  assert.strictEqual(item.restartNeeded, true);
  await store.clear('MOYASAR_SECRET_KEY');
  assert.strictEqual(process.env.MOYASAR_SECRET_KEY, 'sk_test_from_env_1234');
});

test('bootstrap secrets cannot be set', async () => {
  await assert.rejects(store.set('JWT_SECRET', 'y'.repeat(40)));
  await assert.rejects(store.set('MONGODB_URI', 'mongodb://evil'));
});

test('list is super-admin only and never returns secret values', async () => {
  await store.set('ANTHROPIC_API_KEY', 'sk-ant-supersecretvalue-ABCD', null);
  const res = await request(app, 'GET', '/api/v1/admin/integrations', { token: session('aaaaaaaaaaaaaaaaaaaaaaaa') });
  assert.strictEqual(res.status, 200);
  assert.ok(!JSON.stringify(res.body).includes('supersecretvalue'));
  const denied = await request(app, 'GET', '/api/v1/admin/integrations', { token: session('bbbbbbbbbbbbbbbbbbbbbbbb') });
  assert.strictEqual(denied.status, 403);
});

test('with an OTP provider, changes need a step-up token bound to the admin', async () => {
  process.env.DEV_OTP_BYPASS = 'true'; // makes step-up required, code 0000
  const token = session('aaaaaaaaaaaaaaaaaaaaaaaa');
  const blocked = await request(app, 'PUT', '/api/v1/admin/integrations/TABBY_PUBLIC_KEY', { token, body: { value: 'pk_test_1' } });
  assert.strictEqual(blocked.status, 403);
  assert.strictEqual(blocked.body.code, 'STEP_UP_REQUIRED');

  const wrong = await request(app, 'POST', '/api/v1/admin/integrations/step-up/verify', { token, body: { otp: '1111' } });
  assert.strictEqual(wrong.status, 400);
  const ok = await request(app, 'POST', '/api/v1/admin/integrations/step-up/verify', { token, body: { otp: '0000' } });
  assert.strictEqual(ok.status, 200);
  const stepUp = ok.body.data.stepUpToken;

  const saved = await request(app, 'PUT', '/api/v1/admin/integrations/TABBY_PUBLIC_KEY', { token, body: { value: 'pk_test_1' }, headers: { 'x-step-up-token': stepUp } });
  assert.strictEqual(saved.status, 200);
  assert.strictEqual(process.env.TABBY_PUBLIC_KEY, 'pk_test_1');

  // The step-up token is not a session token.
  const asSession = await request(app, 'GET', '/api/v1/admin/integrations', { token: stepUp });
  assert.strictEqual(asSession.status, 401);

  // Bad values are refused.
  const bad = await request(app, 'PUT', '/api/v1/admin/integrations/AI_MODEL', { token, body: { value: 'bad model; rm' }, headers: { 'x-step-up-token': stepUp } });
  assert.strictEqual(bad.status, 400);
  const custom = await request(app, 'PUT', '/api/v1/admin/integrations/AI_MODEL', { token, body: { value: 'gpt-4.1-mini' }, headers: { 'x-step-up-token': stepUp } });
  assert.strictEqual(custom.status, 200);
  const unknown = await request(app, 'PUT', '/api/v1/admin/integrations/JWT_SECRET', { token, body: { value: 'z'.repeat(40) }, headers: { 'x-step-up-token': stepUp } });
  assert.strictEqual(unknown.status, 404);
  delete process.env.DEV_OTP_BYPASS;
});

