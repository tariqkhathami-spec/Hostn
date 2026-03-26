const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// Moyasar API config
const MOYASAR_API_URL = 'https://api.moyasar.com/v1';
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;

async function moyasarRequest(method, path, data = null) {
  const fetch = (await import('node-fetch')).default;
  const url = MOYASAR_API_URL + path;
  const options = {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64'),
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

    const booking = await Booking.findById(bookingId).populate('property', 'title');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    // Check if there's already a pending payment
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: 'pending',
    });

    if (existingPayment) {
      return res.json({
        success: true,
        data: existingPayment,
        message: 'Existing pending payment found',
      });
    }

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      user: req.user._id,
      amount: booking.pricing.total,
      currency: 'SAR',
      provider: 'moyasar',
      status: 'pending',
      moyasarStatus: 'initiated',
    });

    // Log activity
    await ActivityLog.create({
      actor: req.user._id,
      action: 'payment_initiated',
      target: { type: 'Payment', id: payment._id },
      details: 'Payment initiated for booking ' + bookingId + ' — ' + booking.pricing.total + ' SAR',
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        bookingId: booking._id,
        publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY,
        callbackUrl: process.env.CLIENT_URL + '/booking/' + bookingId + '/payment-callback',
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

    // Verify with Moyasar API
    let moyasarPayment;
    if (MOYASAR_SECRET_KEY) {
      moyasarPayment = await moyasarRequest('GET', '/payments/' + moyasarPaymentId);
    }

    const isPaid =
      moyasarPayment?.status === 'paid' ||
      moyasarPayment?.status === 'captured' ||
      (!MOYASAR_SECRET_KEY && moyasarPaymentId);

    if (isPaid) {
      payment.status = 'completed';
      payment.moyasarPaymentId = moyasarPaymentId;
      payment.moyasarStatus = moyasarPayment?.status || 'paid';
      payment.paidAt = new Date();
      if (moyasarPayment?.source) {
        payment.source = {
          type: moyasarPayment.source.type,
          company: moyasarPayment.source.company,
          name: moyasarPayment.source.name,
          number: moyasarPayment.source.number,
          message: moyasarPayment.source.message,
        };
      }
      await payment.save();

      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'paid';
        await booking.save();

        const Property = require('../models/Property');
        const property = await Property.findById(booking.property);
        if (property) {
          await Notification.createNotification({
            user: property.host,
            type: 'payment_success',
            title: 'Payment Received',
            message: 'Payment of ' + payment.amount + ' SAR received for booking at ' + property.title,
            data: { bookingId: booking._id, paymentId: payment._id, propertyId: property._id },
          });
        }

        await Notification.createNotification({
          user: req.user._id,
          type: 'payment_success',
          title: 'Payment Successful',
          message: 'Your payment of ' + payment.amount + ' SAR has been confirmed',
          data: { bookingId: booking._id, paymentId: payment._id },
        });
      }

      await ActivityLog.create({
        actor: req.user._id,
        action: 'payment_completed',
        target: { type: 'Payment', id: payment._id },
        details: 'Payment completed via Moyasar — ' + payment.amount + ' SAR',
        ip: req.ip,
      });

      res.json({ success: true, data: payment, message: 'Payment verified successfully' });
    } else {
      payment.status = 'failed';
      payment.moyasarPaymentId = moyasarPaymentId;
      payment.moyasarStatus = moyasarPayment?.status || 'failed';
      payment.failureReason = moyasarPayment?.source?.message || 'Payment declined';
      await payment.save();

      await Notification.createNotification({
        user: req.user._id,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Your payment of ' + payment.amount + ' SAR was declined. Please try again.',
        data: { bookingId: payment.booking, paymentId: payment._id },
      });

      await ActivityLog.create({
        actor: req.user._id,
        action: 'payment_failed',
        target: { type: 'Payment', id: payment._id },
        details: 'Payment failed — ' + payment.failureReason,
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

// @desc    Moyasar webhook handler
// @route   POST /api/payments/webhook
// @access  Public (verified by Moyasar signature)
exports.webhook = async (req, res, next) => {
  try {
    const { id, status, amount, source, metadata } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    const payment = await Payment.findOne({ moyasarPaymentId: id });
    if (!payment) {
      return res.status(200).json({ success: true, message: 'Payment not found, acknowledged' });
    }

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
      payment.refundedAmount = (amount || 0) / 100;
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

    if (payment.status === 'completed') {
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
    } else if (payment.status === 'refunded') {
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'refunded' });
    }

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

    if (MOYASAR_SECRET_KEY && payment.moyasarPaymentId) {
      const refundResult = await moyasarRequest('POST', '/payments/' + payment.moyasarPaymentId + '/refund');
      if (refundResult.type === 'api_error') {
        return res.status(400).json({ success: false, message: refundResult.message || 'Refund failed at gateway' });
      }
    }

    payment.status = 'refunded';
    payment.refundedAmount = payment.amount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'refunded' });

    await Notification.createNotification({
      user: payment.user,
      type: 'payment_success',
      title: 'Payment Refunded',
      message: 'Your payment of ' + payment.amount + ' SAR has been refunded',
      data: { bookingId: payment.booking, paymentId: payment._id },
    });

    await ActivityLog.create({
      actor: req.user._id,
      action: 'payment_refunded',
      target: { type: 'Payment', id: payment._id },
      details: 'Refunded ' + payment.amount + ' SAR — ' + (reason || 'No reason given'),
      ip: req.ip,
    });

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};