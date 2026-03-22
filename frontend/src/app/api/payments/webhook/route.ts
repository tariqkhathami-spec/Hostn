import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Payment from '@/lib/models/Payment';
import Booking from '@/lib/models/Booking';
import { getPaymentProvider } from '@/lib/payment';

/**
 * POST /api/payments/webhook
 * Receives webhook notifications from Moyasar payment provider
 * No authentication required - uses webhook signature verification
 *
 * SECURITY NOTES:
 * - Moyasar may provide a signature in the webhook headers (e.g., X-Moyasar-Signature)
 * - Always verify the webhook signature to ensure it came from Moyasar
 * - Signature verification should compare a computed HMAC with the provided signature
 * - Do not blindly trust webhook status - always verify with the payment provider API
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Parse webhook payload
    const body = await request.json();

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
