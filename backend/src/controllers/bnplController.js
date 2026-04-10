/**
 * BNPL Controller — Tabby & Tamara checkout and callback handling
 */

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const bnpl = require('../services/bnplService');

// ── Check BNPL availability for a booking amount ───────────────────────────────
// GET /api/v1/bnpl/availability?amount=1000
exports.checkAvailability = async (req, res, next) => {
  try {
    const amount = parseFloat(req.query.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    const availability = bnpl.getBnplAvailability(amount);
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
};

// ── Initiate Tabby checkout ─────────────────────────────────────────────────────
// POST /api/v1/bnpl/tabby/create
exports.createTabbyCheckout = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('property', 'title titleAr location');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    const amount = booking.pricing.total;
    const availability = bnpl.getBnplAvailability(amount);
    if (!availability.tabby.available) {
      return res.status(400).json({
        success: false,
        message: `Tabby is not available for this amount (${amount} SAR). Range: ${availability.tabby.minAmount}-${availability.tabby.maxAmount} SAR`,
      });
    }

    // Check for existing pending BNPL payment
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      provider: 'tabby',
      status: { $in: ['pending', 'processing'] },
    });

    if (existingPayment && existingPayment.metadata?.tabbyRedirectUrl) {
      return res.json({
        success: true,
        data: {
          paymentId: existingPayment._id,
          redirectUrl: existingPayment.metadata.tabbyRedirectUrl,
          provider: 'tabby',
        },
        message: 'Existing Tabby session found',
      });
    }

    const user = await User.findById(req.user._id);
    const property = booking.property;

    // Create Tabby session
    const session = await bnpl.createTabbySession({
      bookingId: bookingId.toString(),
      amount,
      buyer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      property: {
        title: property.title,
        city: property.location?.city || 'Riyadh',
      },
      checkIn: booking.checkIn.toISOString().split('T')[0],
      checkOut: booking.checkOut.toISOString().split('T')[0],
    });

    // Create payment record
    const idempotencyKey = `tabby_${bookingId}_${req.user._id}_${Date.now()}`;
    const payment = await Payment.create({
      booking: bookingId,
      user: req.user._id,
      property: property._id,
      amount,
      currency: 'SAR',
      provider: 'tabby',
      status: 'pending',
      providerPaymentId: session.sessionId || session.paymentId,
      providerStatus: session.status,
      idempotencyKey,
      metadata: {
        tabbySessionId: session.sessionId,
        tabbyPaymentId: session.paymentId,
        tabbyRedirectUrl: session.redirectUrl,
        installments: 4,
        installmentAmount: availability.tabby.installmentAmount,
      },
    });

    await ActivityLog.create({
      actor: req.user._id,
      action: 'bnpl_tabby_initiated',
      target: { type: 'Payment', id: payment._id },
      details: `Tabby checkout created for booking ${bookingId} — ${amount} SAR (4 × ${availability.tabby.installmentAmount} SAR)`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        redirectUrl: session.redirectUrl,
        provider: 'tabby',
        installments: 4,
        installmentAmount: availability.tabby.installmentAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Verify Tabby payment after callback ──────────────────────────────────────
// POST /api/v1/bnpl/tabby/verify
exports.verifyTabbyPayment = async (req, res, next) => {
  try {
    const { paymentId, tabbyPaymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Verify with Tabby API
    const providerPaymentId = tabbyPaymentId || payment.metadata?.tabbyPaymentId || payment.providerPaymentId;
    const tabbyPayment = await bnpl.getTabbyPayment(providerPaymentId);

    const isApproved = tabbyPayment.status === 'AUTHORIZED' || tabbyPayment.status === 'CLOSED';
    const isCaptured = tabbyPayment.status === 'CLOSED';

    if (isApproved) {
      // Auto-capture if not already captured
      if (!isCaptured) {
        try {
          await bnpl.captureTabbyPayment(providerPaymentId, payment.amount);
        } catch (captureErr) {
          console.error('[TABBY] Capture failed:', captureErr.message);
          // Continue — some Tabby plans auto-capture
        }
      }

      payment.status = 'completed';
      payment.providerStatus = tabbyPayment.status;
      payment.paidAt = new Date();
      payment.source = {
        type: 'bnpl',
        company: 'tabby',
        name: 'Tabby - 4 installments',
      };
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'paid';
        await booking.save();

        // Notify host
        const property = await Property.findById(booking.property);
        if (property) {
          await Notification.createNotification({
            user: property.host,
            type: 'payment_success',
            title: 'تم استلام الدفع عبر تابي',
            message: `تم استلام ${payment.amount} ر.س عبر تابي (4 أقساط) لحجز في ${property.title}`,
            data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id },
          });
        }

        // Notify guest
        await Notification.createNotification({
          user: req.user._id,
          type: 'payment_success',
          title: 'تم تأكيد الدفع عبر تابي',
          message: `تم تأكيد دفعتك بقيمة ${payment.amount} ر.س عبر تابي (4 أقساط بدون فوائد)`,
          data: { bookingId: booking._id, paymentId: payment._id },
        });
      }

      await ActivityLog.create({
        actor: req.user._id,
        action: 'bnpl_tabby_completed',
        target: { type: 'Payment', id: payment._id },
        details: `Tabby payment completed — ${payment.amount} SAR`,
        ip: req.ip,
      });

      return res.json({ success: true, data: payment, message: 'Payment verified successfully' });
    } else {
      // Payment not approved
      payment.status = 'failed';
      payment.providerStatus = tabbyPayment.status;
      payment.failureReason = `Tabby status: ${tabbyPayment.status}`;
      await payment.save();

      await ActivityLog.create({
        actor: req.user._id,
        action: 'bnpl_tabby_failed',
        target: { type: 'Payment', id: payment._id },
        details: `Tabby payment failed — status: ${tabbyPayment.status}`,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        data: payment,
        message: `Payment not approved. Status: ${tabbyPayment.status}`,
      });
    }
  } catch (error) {
    next(error);
  }
};

// ── Initiate Tamara checkout ────────────────────────────────────────────────────
// POST /api/v1/bnpl/tamara/create
exports.createTamaraCheckout = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('property', 'title titleAr location');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    const amount = booking.pricing.total;
    const availability = bnpl.getBnplAvailability(amount);
    if (!availability.tamara.available) {
      return res.status(400).json({
        success: false,
        message: `Tamara is not available for this amount (${amount} SAR). Range: ${availability.tamara.minAmount}-${availability.tamara.maxAmount} SAR`,
      });
    }

    // Check for existing pending BNPL payment
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      provider: 'tamara',
      status: { $in: ['pending', 'processing'] },
    });

    if (existingPayment && existingPayment.metadata?.tamaraCheckoutUrl) {
      return res.json({
        success: true,
        data: {
          paymentId: existingPayment._id,
          checkoutUrl: existingPayment.metadata.tamaraCheckoutUrl,
          provider: 'tamara',
        },
        message: 'Existing Tamara session found',
      });
    }

    const user = await User.findById(req.user._id);
    const property = booking.property;

    // Create Tamara session
    const session = await bnpl.createTamaraSession({
      bookingId: bookingId.toString(),
      amount,
      taxAmount: booking.pricing.vat || 0,
      buyer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      property: {
        title: property.title,
        city: property.location?.city || 'Riyadh',
      },
      checkIn: booking.checkIn.toISOString().split('T')[0],
      checkOut: booking.checkOut.toISOString().split('T')[0],
    });

    // Create payment record
    const idempotencyKey = `tamara_${bookingId}_${req.user._id}_${Date.now()}`;
    const payment = await Payment.create({
      booking: bookingId,
      user: req.user._id,
      property: property._id,
      amount,
      currency: 'SAR',
      provider: 'tamara',
      status: 'pending',
      providerPaymentId: session.orderId,
      providerStatus: session.status,
      idempotencyKey,
      metadata: {
        tamaraOrderId: session.orderId,
        tamaraCheckoutUrl: session.checkoutUrl,
        installments: 4,
        installmentAmount: availability.tamara.installmentAmount,
      },
    });

    await ActivityLog.create({
      actor: req.user._id,
      action: 'bnpl_tamara_initiated',
      target: { type: 'Payment', id: payment._id },
      details: `Tamara checkout created for booking ${bookingId} — ${amount} SAR (4 × ${availability.tamara.installmentAmount} SAR)`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        checkoutUrl: session.checkoutUrl,
        provider: 'tamara',
        installments: 4,
        installmentAmount: availability.tamara.installmentAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Verify Tamara payment after callback ─────────────────────────────────────
// POST /api/v1/bnpl/tamara/verify
exports.verifyTamaraPayment = async (req, res, next) => {
  try {
    const { paymentId, orderId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Verify with Tamara API
    const tamaraOrderId = orderId || payment.metadata?.tamaraOrderId || payment.providerPaymentId;
    const tamaraOrder = await bnpl.getTamaraOrder(tamaraOrderId);

    const isApproved = tamaraOrder.status === 'approved' || tamaraOrder.status === 'fully_captured';

    if (isApproved) {
      // Authorize the order if only approved (not yet captured)
      if (tamaraOrder.status === 'approved') {
        try {
          await bnpl.authorizeTamaraOrder(tamaraOrderId);
        } catch (authErr) {
          console.error('[TAMARA] Authorization failed:', authErr.message);
        }
      }

      payment.status = 'completed';
      payment.providerStatus = tamaraOrder.status;
      payment.paidAt = new Date();
      payment.source = {
        type: 'bnpl',
        company: 'tamara',
        name: 'Tamara - 4 installments',
      };
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'paid';
        await booking.save();

        const property = await Property.findById(booking.property);
        if (property) {
          await Notification.createNotification({
            user: property.host,
            type: 'payment_success',
            title: 'تم استلام الدفع عبر تمارا',
            message: `تم استلام ${payment.amount} ر.س عبر تمارا (4 أقساط) لحجز في ${property.title}`,
            data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id },
          });
        }

        await Notification.createNotification({
          user: req.user._id,
          type: 'payment_success',
          title: 'تم تأكيد الدفع عبر تمارا',
          message: `تم تأكيد دفعتك بقيمة ${payment.amount} ر.س عبر تمارا (4 أقساط بدون فوائد)`,
          data: { bookingId: booking._id, paymentId: payment._id },
        });
      }

      await ActivityLog.create({
        actor: req.user._id,
        action: 'bnpl_tamara_completed',
        target: { type: 'Payment', id: payment._id },
        details: `Tamara payment completed — ${payment.amount} SAR`,
        ip: req.ip,
      });

      return res.json({ success: true, data: payment, message: 'Payment verified successfully' });
    } else {
      payment.status = 'failed';
      payment.providerStatus = tamaraOrder.status;
      payment.failureReason = `Tamara status: ${tamaraOrder.status}`;
      await payment.save();

      await ActivityLog.create({
        actor: req.user._id,
        action: 'bnpl_tamara_failed',
        target: { type: 'Payment', id: payment._id },
        details: `Tamara payment failed — status: ${tamaraOrder.status}`,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        data: payment,
        message: `Payment not approved. Status: ${tamaraOrder.status}`,
      });
    }
  } catch (error) {
    next(error);
  }
};

// ── Tabby Webhook ─────────────────────────────────────────────────────────────
// POST /api/v1/bnpl/webhook/tabby
exports.tabbyWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-tabby-signature'] || req.headers['x-signature'];
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify signature (skip if secret not configured — log warning)
    if (process.env.TABBY_SECRET_KEY && !bnpl.verifyTabbyWebhook(rawBody, signature)) {
      console.error('[WEBHOOK] Tabby signature verification failed');
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    const { id, status, amount } = req.body;
    if (!id || !status) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    const payment = await Payment.findOne({
      $or: [
        { providerPaymentId: id },
        { 'metadata.tabbyPaymentId': id },
        { 'metadata.tabbySessionId': id },
      ],
    });

    if (!payment) {
      return res.status(200).json({ success: true, message: 'Payment not found, acknowledged' });
    }

    if (status === 'AUTHORIZED' || status === 'CLOSED') {
      payment.status = 'completed';
      payment.providerStatus = status;
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
    } else if (status === 'REJECTED' || status === 'EXPIRED') {
      payment.status = 'failed';
      payment.providerStatus = status;
      payment.failureReason = `Tabby: ${status}`;
      await payment.save();
    }

    await ActivityLog.create({
      action: 'bnpl_webhook_tabby',
      target: { type: 'Payment', id: payment._id },
      details: `Tabby webhook: ${id} → ${status}`,
      ip: req.ip,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Tamara Webhook ────────────────────────────────────────────────────────────
// POST /api/v1/bnpl/webhook/tamara
exports.tamaraWebhook = async (req, res, next) => {
  try {
    const notificationToken = req.headers['x-tamara-notification-token'];

    if (process.env.TAMARA_NOTIFICATION_TOKEN && !bnpl.verifyTamaraWebhook(null, notificationToken)) {
      console.error('[WEBHOOK] Tamara notification token verification failed');
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }

    const { order_id, order_status, event_type } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    const payment = await Payment.findOne({
      $or: [
        { providerPaymentId: order_id },
        { 'metadata.tamaraOrderId': order_id },
      ],
    });

    if (!payment) {
      return res.status(200).json({ success: true, message: 'Payment not found, acknowledged' });
    }

    const status = order_status || event_type;

    if (status === 'approved' || status === 'fully_captured' || event_type === 'order_approved') {
      payment.status = 'completed';
      payment.providerStatus = status;
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
    } else if (status === 'declined' || status === 'expired' || event_type === 'order_declined') {
      payment.status = 'failed';
      payment.providerStatus = status;
      payment.failureReason = `Tamara: ${status}`;
      await payment.save();
    }

    await ActivityLog.create({
      action: 'bnpl_webhook_tamara',
      target: { type: 'Payment', id: payment._id },
      details: `Tamara webhook: ${order_id} → ${status || event_type}`,
      ip: req.ip,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
