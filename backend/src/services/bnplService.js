/**
 * BNPL (Buy Now Pay Later) Service — Tabby & Tamara integration
 *
 * Tabby: 4 installments, no interest, no late fees (up to 5,000 SAR)
 * Tamara: 3-4 installments, no interest (up to 5,000 SAR)
 *
 * Flow:
 * 1. Create checkout session with provider
 * 2. Redirect user to provider's checkout page
 * 3. Provider redirects back to our callback URL
 * 4. We verify payment status via API
 */

// Read on every call: these keys can be changed from the admin dashboard.
const cfg = {
  get TABBY_API_URL() { return process.env.TABBY_API_URL || 'https://api.tabby.ai/api/v2'; },
  get TABBY_SECRET_KEY() { return process.env.TABBY_SECRET_KEY; },
  get TABBY_PUBLIC_KEY() { return process.env.TABBY_PUBLIC_KEY; },
  get TABBY_MERCHANT_CODE() { return process.env.TABBY_MERCHANT_CODE || 'hostn'; },
  get TAMARA_API_URL() { return process.env.TAMARA_API_URL || 'https://api.tamara.co'; },
  get TAMARA_TOKEN() { return process.env.TAMARA_TOKEN; },
  get TAMARA_NOTIFICATION_TOKEN() { return process.env.TAMARA_NOTIFICATION_TOKEN; },
};

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Tabby ─────────────────────────────────────────────────────────────────────

async function tabbyRequest(method, path, data = null) {
  const fetch = (await import('node-fetch')).default;
  const url = `${cfg.TABBY_API_URL}${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${cfg.TABBY_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error?.message || json.message || `Tabby API error (${res.status})`);
    err.status = res.status;
    err.tabbyError = json;
    throw err;
  }
  return json;
}

/**
 * Create a Tabby checkout session
 * @param {Object} params
 * @param {string} params.bookingId
 * @param {number} params.amount - Total in SAR
 * @param {Object} params.buyer - { name, email, phone }
 * @param {Object} params.property - { title, city }
 * @param {string} params.checkIn
 * @param {string} params.checkOut
 */
async function createTabbySession({
  bookingId,
  amount,
  buyer,
  property,
  checkIn,
  checkOut,
}) {
  const payload = {
    payment: {
      amount: amount.toFixed(2),
      currency: 'SAR',
      description: `Booking at ${property.title}`,
      buyer: {
        phone: buyer.phone,
        email: buyer.email || `${buyer.phone}@hostn.sa`,
        name: buyer.name,
      },
      shipping_address: {
        city: property.city,
        address: property.city,
        zip: '00000',
      },
      order: {
        tax_amount: '0.00',
        shipping_amount: '0.00',
        discount_amount: '0.00',
        reference_id: bookingId,
        items: [
          {
            title: property.title,
            quantity: 1,
            unit_price: amount.toFixed(2),
            category: 'accommodation',
            reference_id: bookingId,
            description: `${checkIn} → ${checkOut}`,
          },
        ],
      },
      order_history: [],
      meta: {
        booking_id: bookingId,
        check_in: checkIn,
        check_out: checkOut,
      },
    },
    lang: 'ar',
    merchant_code: cfg.TABBY_MERCHANT_CODE,
    merchant_urls: {
      success: `${CLIENT_URL}/callback/tabby?booking=${bookingId}&status=success`,
      cancel: `${CLIENT_URL}/callback/tabby?booking=${bookingId}&status=cancel`,
      failure: `${CLIENT_URL}/callback/tabby?booking=${bookingId}&status=failure`,
    },
  };

  const session = await tabbyRequest('POST', '/checkout', payload);

  return {
    sessionId: session.id,
    paymentId: session.payment?.id,
    redirectUrl: session.configuration?.available_products?.installments?.[0]?.web_url
      || session.checkout_url
      || session.payment?.checkout_url,
    status: session.status,
    availableProducts: session.configuration?.available_products,
  };
}

/**
 * Retrieve a Tabby payment by ID
 */
async function getTabbyPayment(paymentId) {
  return tabbyRequest('GET', `/payments/${paymentId}`);
}

/**
 * Capture a Tabby payment (finalize after approval)
 */
async function captureTabbyPayment(paymentId, amount) {
  return tabbyRequest('POST', `/payments/${paymentId}/captures`, {
    amount: amount.toFixed(2),
  });
}

// ── Tamara ────────────────────────────────────────────────────────────────────

async function tamaraRequest(method, path, data = null) {
  const fetch = (await import('node-fetch')).default;
  const url = `${cfg.TAMARA_API_URL}${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${cfg.TAMARA_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || json.error?.message || `Tamara API error (${res.status})`);
    err.status = res.status;
    err.tamaraError = json;
    throw err;
  }
  return json;
}

/**
 * Create a Tamara checkout session
 */
async function createTamaraSession({
  bookingId,
  amount,
  taxAmount,
  buyer,
  property,
  checkIn,
  checkOut,
}) {
  const payload = {
    order_reference_id: bookingId,
    total_amount: {
      amount: amount.toFixed(2),
      currency: 'SAR',
    },
    description: `Booking at ${property.title}`,
    country_code: 'SA',
    payment_type: 'PAY_BY_INSTALMENTS',
    instalments: 4,
    locale: 'ar_SA',
    items: [
      {
        reference_id: bookingId,
        type: 'accommodation',
        name: property.title,
        quantity: 1,
        total_amount: {
          amount: amount.toFixed(2),
          currency: 'SAR',
        },
        unit_price: {
          amount: amount.toFixed(2),
          currency: 'SAR',
        },
        tax_amount: {
          amount: (taxAmount || 0).toFixed(2),
          currency: 'SAR',
        },
      },
    ],
    consumer: {
      first_name: buyer.name?.split(' ')[0] || buyer.name,
      last_name: buyer.name?.split(' ').slice(1).join(' ') || '',
      phone_number: buyer.phone?.startsWith('+') ? buyer.phone : `+966${buyer.phone}`,
      email: buyer.email || `${buyer.phone}@hostn.sa`,
    },
    shipping_address: {
      city: property.city,
      country_code: 'SA',
      first_name: buyer.name?.split(' ')[0] || buyer.name,
      last_name: buyer.name?.split(' ').slice(1).join(' ') || '',
      line1: property.city,
    },
    tax_amount: {
      amount: (taxAmount || 0).toFixed(2),
      currency: 'SAR',
    },
    shipping_amount: {
      amount: '0.00',
      currency: 'SAR',
    },
    merchant_url: {
      success: `${CLIENT_URL}/callback/tamara?booking=${bookingId}&status=success`,
      failure: `${CLIENT_URL}/callback/tamara?booking=${bookingId}&status=failure`,
      cancel: `${CLIENT_URL}/callback/tamara?booking=${bookingId}&status=cancel`,
      notification: `${process.env.API_URL || 'http://localhost:5000'}/api/v1/bnpl/webhook/tamara`,
    },
    platform: 'web',
    order_expires_in_minutes: 60,
    risk_assessment: {
      booking_details: {
        check_in: checkIn,
        check_out: checkOut,
      },
    },
  };

  const session = await tamaraRequest('POST', '/checkout', payload);

  return {
    orderId: session.order_id,
    checkoutUrl: session.checkout_url,
    status: session.status,
  };
}

/**
 * Get Tamara order details by order ID
 */
async function getTamaraOrder(orderId) {
  return tamaraRequest('GET', `/orders/${orderId}`);
}

/**
 * Authorize (capture) a Tamara order after customer approval
 */
async function authorizeTamaraOrder(orderId) {
  return tamaraRequest('POST', `/orders/${orderId}/authorise`);
}

// ── Availability Check ────────────────────────────────────────────────────────

/**
 * Check BNPL availability for a given amount
 * Returns which providers are available and installment details
 */
function getBnplAvailability(amount) {
  const TABBY_MIN = 1;
  const TABBY_MAX = 5000;
  const TAMARA_MIN = 1;
  const TAMARA_MAX = 5000;

  const result = {
    tabby: {
      available: !!cfg.TABBY_SECRET_KEY && amount >= TABBY_MIN && amount <= TABBY_MAX,
      installments: 4,
      installmentAmount: Math.ceil((amount / 4) * 100) / 100,
      currency: 'SAR',
      minAmount: TABBY_MIN,
      maxAmount: TABBY_MAX,
      noLateFees: true,
      noInterest: true,
    },
    tamara: {
      available: !!cfg.TAMARA_TOKEN && amount >= TAMARA_MIN && amount <= TAMARA_MAX,
      installments: 4,
      installmentAmount: Math.ceil((amount / 4) * 100) / 100,
      currency: 'SAR',
      minAmount: TAMARA_MIN,
      maxAmount: TAMARA_MAX,
      noLateFees: true,
      noInterest: true,
    },
  };

  return result;
}

// ── Webhook signature verification ────────────────────────────────────────────

const crypto = require('crypto');

function verifyTabbyWebhook(rawBody, signature) {
  if (!cfg.TABBY_SECRET_KEY || !signature) return false;
  const expected = crypto
    .createHmac('sha256', cfg.TABBY_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
}

function verifyTamaraWebhook(rawBody, token) {
  // Tamara uses a notification token in the header
  return token === cfg.TAMARA_NOTIFICATION_TOKEN;
}

module.exports = {
  // Tabby
  createTabbySession,
  getTabbyPayment,
  captureTabbyPayment,
  verifyTabbyWebhook,
  // Tamara
  createTamaraSession,
  getTamaraOrder,
  authorizeTamaraOrder,
  verifyTamaraWebhook,
  // Utility
  getBnplAvailability,
};
