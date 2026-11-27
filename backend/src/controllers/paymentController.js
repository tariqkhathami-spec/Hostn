const { paymentFees } = require('../config/fees');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Property = require('../models/Property');
const { emitToUser, emitToProperty } = require('../config/socket');
const { guestBooking } = require('../config/fees');
const { verifySecretToken, parseEvent } = require('../services/moyasarWebhook');

/**
 * A fully refunded booking does not stand any more: its money went back to
 * the guest, so it is cancelled and its dates open again. A stay that already
 * finished ("completed") keeps its status — there are no dates left to free.
 */
async function releaseRefundedBooking(bookingId, reason) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  booking.paymentStatus = 'refunded';
  const wasStanding = ['held', 'pending', 'confirmed'].includes(booking.status);
  if (wasStanding) {
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'استرداد كامل للمبلغ';
  }
  await booking.save();
  if (!wasStanding) return booking;

  try {
    const property = await Property.findById(booking.property).select('host title titleAr');
    const obj = booking.toObject();
    emitToUser(booking.guest.toString(), 'booking:updated', guestBooking(obj));
    if (property) {
      Notification.createNotification({
        user: property.host,
        userType: 'Host',
        type: 'booking_cancelled',
        title: 'أُلغي حجز بعد استرداد المبلغ',
        message: `أُلغي حجز في "${property.titleAr || property.title}" بعد استرداد المبلغ للضيف، والتواريخ صارت متاحة من جديد`,
        data: { bookingId: booking._id, propertyId: booking.property },
      }).catch(() => {});
      emitToUser(property.host.toString(), 'booking:cancelled', obj);
      emitToProperty(booking.property.toString(), 'availability:changed', {
        propertyId: booking.property.toString(),
        bookingId: booking._id,
        status: 'cancelled',
      });
    }
  } catch (_) { /* the cancellation is saved; telling people is best effort */ }
  return booking;
}

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

const UNSETTLED = ['pending', 'processing', 'failed'];

/** What the web client needs to render the Moyasar payment form. */
function paymentConfig(payment, booking) {
  const title = booking.property?.titleAr || booking.property?.title || '';
  return {
    paymentId: payment._id,
    amount: payment.amount,
    // Moyasar takes the smallest currency unit (halalas).
    amountHalalas: Math.round(payment.amount * 100),
    currency: payment.currency,
    bookingId: booking._id,
    description: `Hostn booking ${booking._id}${title ? ` — ${title}` : ''}`.slice(0, 255),
    // Echoed back on the webhook, so a payment links even if the guest
    // closes the tab before the callback page runs.
    metadata: { payment_id: String(payment._id), booking_id: String(booking._id) },
    publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY || null,
    callbackUrl: `${process.env.CLIENT_URL}/booking/${booking._id}/payment-callback`,
    simulatorEnabled: isSimulatorEnabled(),
  };
}

function sourceFromGateway(src) {
  if (!src) return undefined;
  return {
    type: src.type,
    company: src.company,
    name: src.name,
    number: src.number,
    message: src.message,
  };
}

/**
 * Mark a payment paid, exactly once. Both the browser callback (verify) and
 * the Moyasar webhook call this; whichever arrives first wins the atomic
 * update and sends the notifications, the other becomes a no-op.
 * Returns { payment, settledNow }.
 */
async function settlePaid(paymentId, { moyasarPaymentId, moyasarStatus, source, ip, via }) {
  const update = {
    status: 'completed',
    moyasarPaymentId,
    moyasarStatus,
    paidAt: new Date(),
    failureReason: null,
  };
  const src = sourceFromGateway(source);
  if (src) update.source = src;

  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: UNSETTLED } },
    { $set: update },
    { new: true }
  );
  if (!payment) {
    return { payment: await Payment.findById(paymentId), settledNow: false };
  }

  const booking = await Booking.findById(payment.booking);
  if (booking) {
    booking.paymentStatus = 'paid';
    await booking.save();

    try {
      const property = await Property.findById(booking.property);
      if (property) {
        await Notification.createNotification({
          user: property.host,
          userType: 'Host',
          type: 'payment_success',
          title: 'تم استلام دفعة',
          message: `استلمنا ${payment.amount} ر.س عن حجز في ${property.titleAr || property.title}`,
          data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id },
        });
      }
      await Notification.createNotification({
        user: payment.user,
        userType: 'Guest',
        type: 'payment_success',
        title: 'تم الدفع بنجاح',
        message: `تم تأكيد دفعتك بقيمة ${payment.amount} ر.س`,
        data: { bookingId: booking._id, paymentId: payment._id },
      });
    } catch (notifErr) {
      console.warn('[settlePaid] notification dispatch failed:', notifErr?.message);
    }
  }

  await ActivityLog.create({
    actor: payment.user,
    action: 'payment_completed',
    target: { type: 'Payment', id: payment._id },
    details: `Payment completed via Moyasar (${via}) — ${payment.amount} SAR`,
    ip,
  }).catch(() => {});

  return { payment, settledNow: true };
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

    if (['cancelled', 'rejected', 'expired'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Booking is ${booking.status} and cannot be paid` });
    }

    // Idempotency: check for existing pending payment
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['pending', 'processing'] },
    });

    if (existingPayment) {
      // Same shape as a fresh payment, so a retry finds `paymentId`.
      return res.json({
        success: true,
        data: paymentConfig(existingPayment, booking),
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
      fees: paymentFees(booking.pricing),
    });

    // Log activity
    await ActivityLog.create({
      actor: req.user._id,
      action: 'payment_initiated',
      target: { type: 'Payment', id: payment._id },
      details: `Payment initiated for booking ${bookingId} — ${booking.pricing.total} SAR`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: paymentConfig(payment, booking) });
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

    // SECURITY: the gateway id is client-supplied. Validate its shape (it is
    // interpolated into the gateway URL), make verification idempotent, and
    // never let one gateway payment settle more than one booking.
    if (typeof moyasarPaymentId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(moyasarPaymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment reference' });
    }
    if (payment.status === 'completed' && payment.moyasarPaymentId === moyasarPaymentId) {
      return res.json({ success: true, data: { payment }, message: 'Payment already verified' });
    }
    if (!['pending', 'processing', 'failed'].includes(payment.status)) {
      return res.status(400).json({ success: false, message: `Payment cannot be verified in status "${payment.status}"` });
    }
    const reused = await Payment.exists({ moyasarPaymentId, _id: { $ne: payment._id } });
    if (reused) {
      await ActivityLog.create({
        actor: req.user._id,
        action: 'payment_amount_mismatch',
        target: { type: 'Payment', id: payment._id },
        details: `Gateway payment ${moyasarPaymentId} is already attached to another payment`,
        ip: req.ip,
      }).catch(() => {});
      return res.status(400).json({ success: false, message: 'Payment reference already used' });
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

    if (moyasarPayment.currency && moyasarPayment.currency !== 'SAR') {
      return res.status(400).json({ success: false, message: 'Payment currency mismatch' });
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
      const { payment: settled } = await settlePaid(payment._id, {
        moyasarPaymentId,
        moyasarStatus: moyasarPayment.status,
        source: moyasarPayment.source,
        ip: req.ip,
        via: 'callback',
      });
      res.json({ success: true, data: settled, message: 'Payment verified successfully' });
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
        title: 'لم تكتمل عملية الدفع',
        message: `تعذّر خصم ${payment.amount} ر.س. حاول مرة أخرى أو استخدم بطاقة أخرى.`,
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
// The simulator marks bookings paid without charging anyone, so it is OFF in
// production unless `PAYMENT_SIMULATOR_ENABLED=true` is set explicitly (e.g. a
// staging deploy that runs with NODE_ENV=production). Outside production it
// stays on for local development unless `PAYMENT_SIMULATOR_DISABLED=true`.
//
// The check is a GETTER (not a top-level const) so it picks up env var
// changes after a Railway "Restart" without needing a full rebuild.

const isSimulatorEnabled = () => {
  if (process.env.PAYMENT_SIMULATOR_ENABLED === 'true') return true;
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.PAYMENT_SIMULATOR_DISABLED !== 'true';
};
exports.isSimulatorEnabled = isSimulatorEnabled;

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
    if (!payment.user || payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // Only an unsettled payment may be simulated — never flip a completed,
    // refunded or cancelled payment.
    if (!['pending', 'processing', 'failed'].includes(payment.status)) {
      return res.status(400).json({ success: false, message: `Payment cannot be simulated in status "${payment.status}"` });
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
    // expected paymentStatus. Notifications + audit are best-effort: the
    // critical Payment + Booking saves above must not be undone by a
    // non-critical side-effect failure.
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      if (spec.bookingPaymentStatus) booking.paymentStatus = spec.bookingPaymentStatus;
      await booking.save();

      try {
        const Property = require('../models/Property');
        const property = await Property.findById(booking.property);

        if (spec.paymentStatus === 'completed' && property) {
          await Notification.createNotification({
            user: property.host,
            userType: 'Host',
            type: 'payment_success',
            title: 'تم استلام دفعة',
            message: `استلمنا ${payment.amount} ر.س عن حجز في ${property.titleAr || property.title} (تشغيل تجريبي)`,
            data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id, simulated: true },
          });
          await Notification.createNotification({
            user: req.user._id,
            userType: 'Guest',
            type: 'payment_success',
            title: 'تم تسجيل الدفع',
            message: `سُجّلت دفعتك بقيمة ${payment.amount} ر.س (تشغيل تجريبي — لم يُخصم أي مبلغ)`,
            data: { bookingId: booking._id, paymentId: payment._id, simulated: true },
          });
        } else if (spec.paymentStatus === 'failed' || spec.paymentStatus === 'cancelled') {
          await Notification.createNotification({
            user: req.user._id,
            userType: 'Guest',
            type: 'payment_failed',
            title: 'لم تكتمل عملية الدفع',
            message: 'تعذّر إتمام الدفع. حاول مرة أخرى.',
            data: { bookingId: booking._id, paymentId: payment._id, simulated: true },
          });
        }
      } catch (notifErr) {
        console.warn('[simulatePayment] notification dispatch failed:', notifErr?.message);
      }
    }

    // PR: map the simulated outcome onto the existing enum values in
    // `ActivityLog.action`. Wrapped in try/catch so any future enum
    // mismatch can't fail the whole simulator endpoint after Payment
    // and Booking have already been updated successfully.
    try {
      const auditAction = spec.paymentStatus === 'completed'
        ? 'payment_completed'
        : 'payment_failed';
      await ActivityLog.create({
        actor: req.user._id,
        action: auditAction,
        target: { type: 'Payment', id: payment._id },
        details: `Simulated payment outcome: ${outcome}`,
        ip: req.ip,
      });
    } catch (logErr) {
      console.warn('[simulatePayment] ActivityLog.create failed:', logErr?.message);
    }

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

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Moyasar webhook handler
// @route   POST /api/payments/webhook
// @access  Public (verified by the `secret_token` Moyasar puts in the body)
exports.webhook = async (req, res, next) => {
  try {
    // Step 1: Authenticate. Moyasar sends no signature header; the body
    // carries the secret token configured on the webhook in the dashboard.
    if (!MOYASAR_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] MOYASAR_WEBHOOK_SECRET not configured — rejecting all webhooks');
    }
    if (!verifySecretToken(req.body, MOYASAR_WEBHOOK_SECRET)) {
      await ActivityLog.create({
        action: 'webhook_signature_failed',
        details: `Rejected Moyasar webhook with invalid secret_token from IP: ${req.ip}`,
        ip: req.ip,
      }).catch(() => {});
      return res.status(403).json({ success: false, message: 'Invalid webhook token' });
    }

    // Step 2: Parse the event envelope.
    const event = parseEvent(req.body);
    if (event.error) {
      return res.status(400).json({ success: false, message: event.error });
    }
    if (event.action === 'verification') {
      // Enter this code in the Moyasar dashboard to activate the webhook.
      console.log(`[WEBHOOK] Moyasar webhook verification code: ${event.code}`);
      return res.status(200).json({ success: true, message: 'Verification received' });
    }
    if (event.action === 'ignore') {
      return res.status(200).json({ success: true, message: `Event ${event.type} ignored` });
    }

    // A test-mode event must never settle a live booking (and vice versa).
    if (MOYASAR_SECRET_KEY && typeof event.live === 'boolean') {
      const serverIsLive = MOYASAR_SECRET_KEY.startsWith('sk_live_');
      if (event.live !== serverIsLive) {
        console.warn(`[WEBHOOK] Ignored ${event.live ? 'live' : 'test'} event on a ${serverIsLive ? 'live' : 'test'} server`);
        return res.status(200).json({ success: true, message: 'Mode mismatch, ignored' });
      }
    }

    const mp = event.payment;
    const idempotencyKey = `webhook_${event.eventId}_${event.type}`;

    // Step 3: Idempotency — Moyasar retries up to 5 times.
    const existingLog = await ActivityLog.findOne({
      action: 'webhook_processed',
      details: { $regex: `^${escapeRegex(idempotencyKey)}` },
    });
    if (existingLog) {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // Step 4: Find our Payment. The gateway id is linked once the browser
    // callback runs; if the guest closed the tab before that, fall back to
    // the payment_id we put in the Moyasar form's metadata.
    let payment = await Payment.findOne({ moyasarPaymentId: mp.id });
    const metaId = mp.metadata?.payment_id;
    if (!payment && typeof metaId === 'string' && /^[a-f0-9]{24}$/i.test(metaId)) {
      const candidate = await Payment.findById(metaId);
      if (candidate && UNSETTLED.includes(candidate.status)) payment = candidate;
    }
    if (!payment) {
      await ActivityLog.create({
        action: 'webhook_unlinked',
        details: `Webhook ${event.type} for unknown Moyasar payment ${mp.id}`,
        ip: req.ip,
      }).catch(() => {});
      return res.status(200).json({ success: true, message: 'Payment not found, acknowledged' });
    }

    // Step 5: Amount + currency must match what we charged.
    const expectedHalalas = Math.round(payment.amount * 100);
    if ((mp.currency && mp.currency !== 'SAR') || mp.amount !== expectedHalalas) {
      await ActivityLog.create({
        action: 'webhook_amount_mismatch',
        target: { type: 'Payment', id: payment._id },
        details: `Webhook ${event.type}: expected ${expectedHalalas} SAR halalas, got ${mp.amount} ${mp.currency}. ${idempotencyKey}`,
        ip: req.ip,
      }).catch(() => {});
      // 200 so Moyasar stops retrying; the mismatch is logged for review.
      return res.status(200).json({ success: true, message: 'Amount mismatch, logged' });
    }

    // Step 6: Apply the event.
    let outcome = 'no change';
    if (event.action === 'paid') {
      const { settledNow, payment: p } = await settlePaid(payment._id, {
        moyasarPaymentId: mp.id,
        moyasarStatus: mp.status,
        source: mp.source,
        ip: req.ip,
        via: 'webhook',
      });
      outcome = settledNow ? 'completed' : `already ${p?.status}`;
    } else if (event.action === 'failed' || event.action === 'voided') {
      // Only an unsettled payment can fail. A failure for an older attempt
      // must not undo a later successful one.
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $in: ['pending', 'processing'] } },
        {
          $set: {
            status: event.action === 'failed' ? 'failed' : 'cancelled',
            moyasarPaymentId: mp.id,
            moyasarStatus: mp.status,
            failureReason: mp.source?.message || (event.action === 'failed' ? 'Payment failed' : 'Payment voided'),
          },
        },
        { new: true }
      );
      outcome = updated ? updated.status : 'ignored (already settled)';
    } else if (event.action === 'refunded') {
      if (payment.status === 'refunded') {
        outcome = 'already refunded';
      } else if (payment.status === 'completed' || payment.status === 'paid') {
        const refundedHalalas = mp.refunded || 0;
        payment.moyasarStatus = mp.status;
        payment.refundedAmount = refundedHalalas / 100;
        if (refundedHalalas >= expectedHalalas) {
          payment.status = 'refunded';
          payment.refundedAt = new Date();
          await payment.save();
          await releaseRefundedBooking(payment.booking);
          outcome = 'refunded';
        } else {
          // Partial refund: the booking stands. Record the amount only.
          await payment.save();
          outcome = `partial refund ${refundedHalalas} halalas`;
        }
      } else {
        outcome = `ignored (payment is ${payment.status})`;
      }
    }

    // Step 7: Log with the idempotency key.
    await ActivityLog.create({
      action: 'webhook_processed',
      target: { type: 'Payment', id: payment._id },
      details: `${idempotencyKey} — ${outcome}`,
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
      .populate('booking', 'checkIn checkOut pricing.perNight pricing.nights pricing.subtotal pricing.cleaningFee pricing.serviceFee pricing.discount pricing.vat pricing.total status property')
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
      .populate('booking', 'checkIn checkOut pricing.perNight pricing.nights pricing.subtotal pricing.cleaningFee pricing.serviceFee pricing.discount pricing.vat pricing.total status property')
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

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Payment already refunded' });
    }
    if (payment.status !== 'completed' && payment.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Only completed payments can be refunded' });
    }

    // Refund via Moyasar if we have a payment ID
    if (MOYASAR_SECRET_KEY && payment.moyasarPaymentId && !payment.moyasarPaymentId.startsWith('sim_')) {
      const refundResult = await moyasarRequest('POST', `/payments/${payment.moyasarPaymentId}/refund`);
      if (refundResult.type === 'api_error') {
        return res.status(400).json({ success: false, message: refundResult.message || 'Refund failed at gateway' });
      }
    }

    payment.status = 'refunded';
    payment.refundedAmount = payment.amount;
    payment.refundReason = reason || 'Admin refund';
    payment.refundedAt = new Date();
    await payment.save();

    // Update booking
    await releaseRefundedBooking(payment.booking, reason ? `استرداد المبلغ: ${reason}` : undefined);

    // Notify user
    await Notification.createNotification({
      user: payment.user,
      userType: 'Guest',
      type: 'payment_success', // reuse type, message clarifies it's a refund
      title: 'تم استرداد المبلغ',
      message: `تم استرداد ${payment.amount} ر.س إلى وسيلة الدفع الأصلية، وأُلغي الحجز`,
      data: { bookingId: payment.booking, paymentId: payment._id },
    });

    await ActivityLog.create({
      actor: req.user._id,
      actorType: 'Admin',
      actorRole: req.user.userType || req.user.role,
      actorAdminRole: req.user.adminRole || null,
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
