import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import Booking from '@/lib/models/Booking';
import { getPaymentProvider } from '@/lib/payment';
import { logPaymentEvent } from '@/lib/logger';
import { sendRefundEmail } from '@/lib/email';
import User from '@/lib/models/User';

/**
 * POST /api/admin/payments/[id]/refund
 * Process a refund for a payment via Moyasar API.
 *
 * Body: { amount?: number, reason?: string }
 * - amount: optional partial refund amount in SAR. Omit for full refund.
 * - reason: optional reason for the refund.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { id } = params;
    let body: { amount?: number; reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — means full refund
    }

    // Find the payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    // Validate payment is refundable
    if (payment.status !== 'paid') {
      return NextResponse.json(
        { success: false, message: `Cannot refund payment with status: ${payment.status}` },
        { status: 400 }
      );
    }

    if (!payment.providerPaymentId) {
      return NextResponse.json(
        { success: false, message: 'Payment has no provider payment ID — cannot process refund' },
        { status: 400 }
      );
    }

    // Validate refund amount
    const refundAmount = body.amount || payment.amount;
    const alreadyRefunded = payment.refundedAmount || 0;
    const maxRefundable = payment.amount - alreadyRefunded;

    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      return NextResponse.json(
        { success: false, message: `Invalid refund amount. Maximum refundable: ${maxRefundable} SAR` },
        { status: 400 }
      );
    }

    // Process refund via Moyasar
    const provider = getPaymentProvider('moyasar');
    let refundResult;
    try {
      refundResult = await provider.refundPayment(
        payment.providerPaymentId,
        refundAmount
      );
    } catch (error) {
      console.error('Moyasar refund failed:', error);
      logPaymentEvent(id, 'refund_failed', `Refund of ${refundAmount} SAR failed: ${(error as Error).message}`, auth.payload.userId).catch(() => {});
      return NextResponse.json(
        { success: false, message: `Refund failed: ${(error as Error).message}` },
        { status: 502 }
      );
    }

    // Update payment record
    const isFullRefund = (alreadyRefunded + refundAmount) >= payment.amount;
    payment.refundedAmount = alreadyRefunded + refundAmount;
    payment.refundedAt = new Date();
    if (isFullRefund) {
      payment.status = 'refunded';
      payment.providerStatus = 'refunded';
    }
    await payment.save();

    // Update booking payment status if full refund
    if (isFullRefund) {
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'refunded';
        booking.status = 'cancelled';
        booking.cancellationReason = body.reason || 'Refund processed by admin';
        booking.cancelledAt = new Date();
        await booking.save();
      }
    }

    // Log the refund event (fire-and-forget)
    logPaymentEvent(
      id,
      'refund_processed',
      `Refund of ${refundAmount} SAR processed. ${isFullRefund ? 'Full refund.' : `Partial refund. Total refunded: ${payment.refundedAmount} SAR`}${body.reason ? ` Reason: ${body.reason}` : ''}`,
      auth.payload.userId
    ).catch(() => {});

    // Send refund email to guest (fire-and-forget)
    const guest = await User.findById(payment.user).select('name email');
    const booking = await Booking.findById(payment.booking).populate('property', 'title');
    if (guest && booking) {
      sendRefundEmail({
        guestEmail: guest.email,
        guestName: guest.name || 'Guest',
        propertyTitle: (booking.property as any)?.title || 'Property',
        refundAmount,
        originalTotal: payment.amount,
        isPartial: !isFullRefund,
        reason: body.reason,
        paymentId: id,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: id,
        refundAmount,
        totalRefunded: payment.refundedAmount,
        isFullRefund,
        paymentStatus: payment.status,
        providerRefundId: refundResult.id,
      },
    });
  } catch (error) {
    console.error('Admin refund error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
