// Run with: node --test src/__tests__/launchCompliance.node.test.js
const test = require('node:test');
const assert = require('node:assert');

const { unitPublishIssues, hasActiveLicense, requirePublishable } = require('../utils/unitPublish');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const complete = (tourismLicense) => ({
  nameAr: 'شاليه',
  pricing: Object.fromEntries(DAYS.map((d) => [d, 500])),
  images: [{ url: 'https://example.com/a.jpg' }],
  tourismLicense,
});
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

test('a unit needs an approved, unexpired licence', () => {
  delete process.env.TOURISM_LICENSE_REQUIRED;
  assert.deepStrictEqual(unitPublishIssues(complete(undefined)), ['missing_license']);
  assert.deepStrictEqual(unitPublishIssues(complete({ status: 'pending', licenseNumber: '123' })), ['missing_license']);
  assert.deepStrictEqual(unitPublishIssues(complete({ status: 'active', licenseNumber: '' })), ['missing_license']);
  assert.deepStrictEqual(unitPublishIssues(complete({ status: 'active', licenseNumber: '123', expiryDate: past })), ['missing_license']);
  assert.deepStrictEqual(unitPublishIssues(complete({ status: 'active', licenseNumber: '123', expiryDate: future })), []);
  assert.deepStrictEqual(unitPublishIssues(complete({ status: 'active', licenseNumber: '123' })), []);
  assert.strictEqual(hasActiveLicense(null), false);
});

test('public queries filter on the licence', () => {
  delete process.env.TOURISM_LICENSE_REQUIRED;
  const f = requirePublishable({ isActive: true });
  assert.ok(f.$and.some((c) => c['tourismLicense.status'] === 'active'));
});

test('TOURISM_LICENSE_REQUIRED=false turns the requirement off', () => {
  process.env.TOURISM_LICENSE_REQUIRED = 'false';
  try {
    assert.deepStrictEqual(unitPublishIssues(complete(undefined)), []);
    const f = requirePublishable({ isActive: true });
    assert.ok(!f.$and.some((c) => 'tourismLicense.status' in c));
  } finally {
    delete process.env.TOURISM_LICENSE_REQUIRED;
  }
});

test('Authentica TLS: real name and the known *.t2.sa name pass, anything else fails', () => {
  const { httpsAgent } = require('../services/authentica');
  const check = httpsAgent.options.checkServerIdentity;
  assert.strictEqual(httpsAgent.options.rejectUnauthorized, undefined);
  const cert = (san) => ({ subject: {}, subjectaltname: san });
  assert.strictEqual(check('api.authentica.sa', cert('DNS:*.authentica.sa')), undefined);
  assert.strictEqual(check('api.authentica.sa', cert('DNS:*.t2.sa')), undefined);
  assert.ok(check('api.authentica.sa', cert('DNS:evil.example')) instanceof Error);
});
