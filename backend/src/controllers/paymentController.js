const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// Moyasar API config
const MOYASAR_API_URL = process.env.MOYASAR_API_URL || 'https://api.moyasar.com/v1';
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;
const MOYASAR_WEBHOOK_SECRET = process.env.MOYASAR_WEBHOOK_SECRET;

// Valid payment state transitions
const VALID_TRANSITIONS = {
  pending: ['processing', 'completed', 'failed', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: ['refunded'],
  failed: ['pending'], // Allow retry
  refunded: [],
  cancelled: [],
};

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

async function moyasarRequest(method, path, data = null) {
  const fetch = (await import('node-fetch')).default;
  const url = `${MOYASAR_API_URL}${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  return res.json();
}

// @desc    Initiate a payment for a booking
// @route   POST /api/payments/initiate
// @access  Private
exports.initiatePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('property', 'title titleAr');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    // Idempotency: check for existing pending payment
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['pending', 'processing'] },
    });

    if (existingPayment) {
      return res.json({
        success: true,
        data: existingPayment,
        message: 'Existing pending payment found',
      });
    }

    // Server-side amount calculation (NEVER trust client amount)
    const serverAmount = booking.pricing.total;
    const idempotencyKey = `pay_${bookingId}_${req.user._id}_${Date.now()}`;

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      user: req.user._id,
      amount: serverAmount,
      currency: 'SAR',
      provider: 'moyasar',
      status: 'pending',
      moyasarStatus: 'initiated',
      idempotencyKey,
    });

    // Log activity
    await ActivityLog.create({
      actor: req.user._id,
      action: 'payment_initiated',
      target: { type: 'Payment', id: payment._id },
      details: `Payment initiated for booking ${bookingId} — ${booking.pricing.total} SAR`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        bookingId: booking._id,
        // Moyasar publishable key for frontend form
        publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY,
        callbackUrl: `${process.env.CLIENT_URL}/booking/${bookingId}/payment-callback`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify a payment after Moyasar callback
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, moyasarPaymentId } = req.body;

    if (!paymentId || !moyasarPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and Moyasar payment ID are required',
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // ALWAYS verify with Moyasar API — never trust client-side callback alone
    if (!MOYASAR_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Payment verification is unavailable. Server misconfiguration.',
      });
    }

    const moyasarPayment = await moyasarRequest('GET', `/payments/${moyasarPaymentId}`);

    if (!moyasarPayment || moyasarPayment.type === 'api_error') {
      return res.status(502).json({
        success: false,
        message: 'Could not verify payment with payment gateway',
      });
    }

    // Verify amount matches to prevent partial-payment fraud
    const expectedAmountHalalas = Math.round(payment.amount * 100);
    if (moyasarPayment.amount !== expectedAmountHalalas) {
      await ActivityLog.create({
        actor: req.user._id,
        action: 'payment_amount_mismatch',
        target: { type: 'Payment', id: payment._id },
        details: `Amount mismatch: expected ${expectedAmountHalalas} halalas, got ${moyasarPayment.amount}`,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch',
      });
    }

    const isPaid =
      moyasarPayment.status === 'paid' ||
      moyasarPayment.status === 'captured';

    if (isPaid) {
      // Update payment
      payment.status = 'completed';
      payment.moyasarPaymentId = moyasarPaymentId;
      payment.moyasarStatus = moyasarPayment.status;
      payment.paidAt = new Date();
      if (moyasarPayment.source) {
        payment.source = {
          type: moyasarPayment.source.type,
          company: moyasarPayment.source.company,
          name: moyasarPayment.source.name,
          number: moyasarPayment.source.number,
          message: moyasarPayment.source.message,
        };
      }
      await payment.save();

      // Update booking payment status
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'paid';
        await booking.save();

        // Notify host about new paid booking
        const Property = require('../models/Property');
        const property = await Property.findById(booking.property);
        if (property) {
          await Notification.createNotification({
            user: property.host,
            userType: 'Host',
            type: 'payment_success',
            title: 'Payment Received',
            message: `Payment of ${payment.amount} SAR received for booking at ${property.title}`,
            data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id },
          });
        }

        // Notify guest
        await Notification.createNotification({
          user: req.user._id,
          userType: 'Guest',
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of ${payment.amount} SAR has been confirmed`,
          data: { bookingId: booking._id, paymentId: payment._id },
        });
      }

      // Log
      await ActivityLog.create({
        actor: req.user._id,
        action: 'payment_completed',
        target: { type: 'Payment', id: payment._id },
        details: `Payment completed via Moyasar — ${payment.amount} SAR`,
        ip: req.ip,
      });

      res.json({ success: true, data: payment, message: 'Payment verified successfully' });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.moyasarPaymentId = moyasarPaymentId;
      payment.moyasarStatus = moyasarPayment.status;
      payment.failureReason = moyasarPayment.source?.message || 'Payment declined';
      await payment.save();

      // Notify guest
      await Notification.createNotification({
        user: req.user._id,
        userType: 'Guest',
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of ${payment.amount} SAR was declined. Please try again.`,
        data: { bookingId: payment.booking, paymentId: payment._id },
      });

      await ActivityLog.create({
        actor: req.user._id,
        action: 'payment_failed',
        target: { type: 'Payment', id: payment._id },
        details: `Payment failed — ${payment.failureReason}`,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        data: payment,
        message: payment.failureReason || 'Payment verification failed',
      });
    }
  } catch (error) {
    next(error);
  }
};

// ─── PAYMENT SIMULATOR (demo mode) ────────────────────────────────────────────
//
// While the real payment integration is still in development, the simulator
// lets the guest finish the booking flow end-to-end by picking an outcome
// instead of running an actual card charge. Every outcome mirrors the state
// transitions that would happen if the real processor returned that result.
//
// PR: demo mode is the default today. Explicitly disable by setting
// `PAYMENT_SIMULATOR_DISABLED=true` on the environment once the real
// payment integration is live — that'll flip the endpoint back to 404.
//
// The check is a GETTER (not a top-level const) so it picks up env var
// changes after a Railway "Restart" without needing a full rebuild.

const isSimulatorEnabled = () => process.env.PAYMENT_SIMULATOR_DISABLED !== 'true';

const SIMULATED_OUTCOMES = {
  approved: {
    paymentStatus: 'completed',
    bookingPaymentStatus: 'paid',
    failureReason: null,
  },
  declined: {
    paymentStatus: 'failed',
    bookingPaymentStatus: 'unpaid',
    failureReason: 'Card declined by issuer',
  },
  insufficient_funds: {
    paymentStatus: 'failed',
    bookingPaymentStatus: 'unpaid',
    failureReason: 'Insufficient funds',
  },
  fraud: {
    paymentStatus: 'failed',
    bookingPaymentStatus: 'unpaid',
    failureReason: 'Blocked by fraud screening',
  },
  cancelled: {
    paymentStatus: 'cancelled',
    bookingPaymentStatus: 'unpaid',
    failureReason: 'Cancelled by cardholder',
  },
  // `timeout` leaves the payment in `pending` to mimic a slow 3DS challenge
  // that the guest abandons. Front-end shows a "still processing" state.
  timeout: {
    paymentStatus: 'pending',
    bookingPaymentStatus: 'unpaid',
    failureReason: null,
  },
};

// @desc    Simulate a payment outcome (demo / dev only)
// @route   POST /api/payments/simulate
// @access  Private
exports.simulatePayment = async (req, res, next) => {
  try {
    if (!isSimulatorEnabled()) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const { paymentId, outcome } = req.body;
    if (!paymentId || !outcome) {
      return res.status(400).json({ success: false, message: 'paymentId and outcome are required' });
    }

    const spec = SIMULATED_OUTCOMES[outcome];
    if (!spec) {
      return res.status(400).json({
        success: false,
        message: `Unknown outcome. Valid: ${Object.keys(SIMULATED_OUTCOMES).join(', ')}`,
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.user && payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Mark the payment with the chosen status. Stamp a fake Moyasar ID so
    // downstream queries can tell it came from the simulator.
    payment.status = spec.paymentStatus;
    payment.moyasarPaymentId = `sim_${outcome}_${Date.now()}`;
    payment.moyasarStatus = `simulated_${outcome}`;
    if (spec.paymentStatus === 'completed') {
      payment.paidAt = new Date();
      payment.source = {
        type: 'creditcard',
        company: 'visa',
        name: 'Simulator Card',
        number: 'XXXX-XXXX-XXXX-4242',
        message: 'Approved (simulated)',
      };
    } else if (spec.failureReason) {
      payment.failureReason = spec.failureReason;
    }
    await payment.save();

    // Mirror the booking-side state so host + downstream endpoints see the
    // expected paymentStatus. Notifications mirror `verifyPayment`.
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      if (spec.bookingPaymentStatus) booking.paymentStatus = spec.bookingPaymentStatus;
      await booking.save();

      const Property = require('../models/Property');
      const property = await Property.findById(booking.property);

      if (spec.paymentStatus === 'completed' && property) {
        await Notification.createNotification({
          user: property.host,
          userType: 'Host',
          type: 'payment_success',
          title: 'Payment Received (simulated)',
          message: `Simulated payment of ${payment.amount} SAR received for booking at ${property.title}`,
          data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id, simulated: true },
        });
        await Notification.createNotification({
          user: req.user._id,
          userType: 'Guest',
          type: 'payment_success',
          title: 'Payment Successful (simulated)',
          message: `Your simulated payment of ${payment.amount} SAR has been recorded`,
          data: { bookingId: booking._id, paymentId: payment._id, simulated: true },
        });
      } else if (spec.paymentStatus === 'failed' || spec.paymentStatus === 'cancelled') {
        await Notification.createNotification({
          user: req.user._id,
          userType: 'Guest',
          type: 'payment_failed',
          title: 'Payment Failed (simulated)',
          message: `Simulated payment failure — ${spec.failureReason}`,
          data: { bookingId: booking._id, paymentId: payment._id, simulated: true },
        });
      }
    }

    await ActivityLog.create({
      actor: req.user._id,
      action: `payment_simulated_${outcome}`,
      target: { type: 'Payment', id: payment._id },
      details: `Simulated payment outcome: ${outcome}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        payment,
        booking,
        outcome,
        simulated: true,
      },
      message: `Simulated ${outcome}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current status of a payment (used by the simulator callback
//          page — replaces the Moyasar verify round-trip for simulated runs)
// @route   GET /api/payments/:id/status
// @access  Private
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('booking', 'status paymentStatus');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.user && payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        failureReason: payment.failureReason || null,
        simulated: payment.moyasarPaymentId?.startsWith('sim_') || false,
        booking: payment.booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Moyasar webhook signature (HMAC-SHA256)
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!MOYASAR_WEBHOOK_SECRET) {
    console.error('[WEBHOOK] MOYASAR_WEBHOOK_SECRET not configured — rejecting all webhooks');
    return false;
  }
  if (!signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac('sha256', MOYASAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch {
    return false;
  }
}

// @desc    Moyasar webhook handler
// @route   POST /api/payments/webhook
// @access  Public (verified by Moyasar signature)
exports.webhook = async (req, res, next) => {
  try {
    // Step 1: Verify webhook signature
    const signature = req.headers['x-moyasar-signature'] || req.headers['x-signature'];
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[WEBHOOK] Signature verification failed');
      await ActivityLog.create({
        action: 'webhook_signature_failed',
        details: `Rejected webhook with invalid signature from IP: ${req.ip}`,
        ip: req.ip,
      });
      return res.status(403).json({ success: false, message: 'Invalid webhook signature' });
    }

    // Step 2: Parse and validate payload
    const { id, status, amount, source, metadata } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    // Step 3: Idempotency — check if we already processed this event
    const idempotencyKey = `webhook_${id}_${status}`;
    const existingLog = await ActivityLog.findOne({
      action: 'webhook_processed',
      'details': { $regex: idempotencyKey },
    });
    if (existingLog) {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // Step 4: Find payment
    const payment = await Payment.findOne({ moyasarPaymentId: id });
    if (!payment) {
      // Acknowledge but log — could be a payment we haven't linked yet
      await ActivityLog.create({
        action: 'webhook_unlinked',
        details: `Webhook for unknown moyasarPaymentId: ${id}, status: ${status}`,
        ip: req.ip,
      });
      return res.status(200).json({ success: true, message: 'Payment not found, acknowledged' });
    }

    // Step 5: Validate amount matches (prevent amount tampering)
    if (amount) {
      const expectedAmountHalalas = Math.round(payment.amount * 100);
      if (status !== 'refunded' && amount !== expectedAmountHalalas) {
        await ActivityLog.create({
          action: 'webhook_amount_mismatch',
          target: { type: 'Payment', id: payment._id },
          details: `Webhook amount mismatch: expected ${expectedAmountHalalas}, got ${amount}. ${idempotencyKey}`,
          ip: req.ip,
        });
        return res.status(400).json({ success: false, message: 'Amount mismatch' });
      }
    }

    // Step 6: Update payment status
    if (status === 'paid' || status === 'captured') {
      payment.status = 'completed';
      payment.moyasarStatus = status;
      payment.paidAt = payment.paidAt || new Date();
    } else if (status === 'failed') {
      payment.status = 'failed';
      payment.moyasarStatus = status;
      payment.failureReason = source?.message || 'Payment failed';
    } else if (status === 'refunded') {
      payment.status = 'refunded';
      payment.moyasarStatus = status;
      payment.refundedAmount = (amount || 0) / 100; // Moyasar sends in halalas
      payment.refundedAt = new Date();
    }

    if (source) {
      payment.source = {
        type: source.type,
        company: source.company,
        name: source.name,
        number: source.number,
        message: source.message,
      };
    }

    await payment.save();

    // Step 7: Update booking
    if (payment.status === 'completed') {
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
    } else if (payment.status === 'refunded') {
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'refunded' });
    }

    // Step 8: Log successful processing (with idempotency key)
    await ActivityLog.create({
      action: 'webhook_processed',
      target: { type: 'Payment', id: payment._id },
      details: `${idempotencyKey} — status updated to ${payment.status}`,
      ip: req.ip,
    });

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking', 'checkIn checkOut pricing status property')
      .populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Only the payer or admin can view
    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's payments
// @route   GET /api/payments/my-payments
// @access  Private
exports.getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('booking', 'checkIn checkOut pricing status property')
      .sort('-createdAt');

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments (admin)
// @route   GET /api/payments
// @access  Private (Admin)
exports.getAllPayments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('booking', 'checkIn checkOut pricing status')
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund a payment (admin)
// @route   POST /api/payments/:id/refund
// @access  Private (Admin)
exports.refundPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed payments can be refunded' });
    }

    // Refund via Moyasar if we have a payment ID
    if (MOYASAR_SECRET_KEY && payment.moyasarPaymentId) {
      const refundResult = await moyasarRequest('POST', `/payments/${payment.moyasarPaymentId}/refund`);
      if (refundResult.type === 'api_error') {
        return res.status(400).json({ success: false, message: refundResult.message || 'Refund failed at gateway' });
      }
    }

    payment.status = 'refunded';
    payment.refundedAmount = payment.amount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    // Update booking
    await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'refunded' });

    // Notify user
    await Notification.createNotification({
      user: payment.user,
      userType: 'Guest',
      type: 'payment_success', // reuse type, message clarifies it's a refund
      title: 'Payment Refunded',
      message: `Your payment of ${payment.amount} SAR has been refunded`,
      data: { bookingId: payment.booking, paymentId: payment._id },
    });

    await ActivityLog.create({
      actor: req.user._id,
      action: 'payment_refunded',
      target: { type: 'Payment', id: payment._id },
      details: `Refunded ${payment.amount} SAR — ${reason || 'No reason given'}`,
      ip: req.ip,
    });

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};
