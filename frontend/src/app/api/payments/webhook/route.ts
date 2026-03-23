import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Payment from '@/lib/models/Payment';
import Booking from '@/lib/models/Booking';
import { getPaymentProvider } from '@/lib/payment';
import { verifyWebhookSignature } from '@/lib/webhook-verify';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/payments/webhook
 * Receives webhook notifications from Moyasar payment provider.
 *
 * SECURITY:
 * 1. Verifies HMAC signature from Moyasar headers
 * 2. Rate limited to prevent webhook flooding
 * 3. Always re-verifies payment with Moyasar API (defense in depth)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit webhooks: 50 per minute per IP
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`webhook:${ip}`, 50, '1m');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ success: false, message: 'Rate limit exceeded' }, { status: 429 });
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // SECURITY: Verify webhook HMAC signature — hard reject on failure
    const signature = request.headers.get('x-moyasar-signature') ||
                      request.headers.get('x-signature') ||
                      request.headers.get('signature');

    let signatureValid: boolean;
    try {
      signatureValid = verifyWebhookSignature(rawBody, signature);
    } catch (error) {
      // MOYASAR_WEBHOOK_SECRET is not configured — refuse to process any webhooks
      console.error('Webhook processing disabled:', (error as Error).message);
      return NextResponse.json(
        { success: false, message: 'Webhook verification not configured' },
        { status: 500 }
      );
    }

    if (!signatureValid) {
      console.warn('Webhook REJECTED: invalid signature. IP:', ip);
      return NextResponse.json(
        { success: false, message: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Parse webhook payload
    const body = JSON.parse(rawBody);

    // Extract payment ID and status from Moyasar webhook
    const moyasarPaymentId = body.id || body.payment_id;
    const webhookStatus = body.status;

    if (!moyasarPaymentId) {
      console.warn('Webhook received without payment ID:', body);
      return NextResponse.json(
        { success: false, message: 'Missing payment ID in webhook' },
        { status: 400 }
      );
    }

    // Find our Payment record by Moyasar payment ID
    const payment = await Payment.findOne({
      providerPaymentId: moyasarPaymentId,
    });

    if (!payment) {
      console.warn(`Payment not found for Moyasar ID: ${moyasarPaymentId}`);
      // Return 200 OK to acknowledge webhook even if we don't have the payment
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // IMPORTANT: Do not trust webhook alone - verify payment with Moyasar API
    const provider = getPaymentProvider('moyasar');
    let verificationResult;
    try {
      verificationResult = await provider.verifyPayment(moyasarPaymentId);
    } catch (error) {
      console.error('Failed to verify payment from webhook:', error);
      // Return 200 to acknowledge webhook, but don't update status
      // Manual verification can be triggered later
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update payment status based on verified result
    if (verificationResult.status === 'paid') {
      // Extract card information
      const cardLast4 = verificationResult.source?.number
        ? verificationResult.source.number.slice(-4)
        : undefined;

      // Update Payment record
      payment.status = 'paid';
      payment.providerStatus = verificationResult.status;
      payment.paidAt = new Date();
      payment.paymentMethod = verificationResult.source?.type;
      payment.cardBrand = verificationResult.source?.company;
      payment.cardLast4 = cardLast4;
      await payment.save();

      // Update associated Booking
      const booking = await Booking.findById(payment.booking);
      if (booking && booking.status === 'pending' && booking.paymentStatus === 'unpaid') {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        await booking.save();
      }
    } else if (
      verificationResult.status === 'failed' ||
      verificationResult.status === 'cancelled'
    ) {
      // Update Payment record as failed
      payment.status = 'failed';
      payment.providerStatus = verificationResult.status;
      payment.failedAt = new Date();
      payment.failureReason = verificationResult.source?.message || `Status: ${verificationResult.status}`;
      await payment.save();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    // Return 200 OK to acknowledge webhook receipt, even if processing failed
    // This prevents Moyasar from retrying indefinitely
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
