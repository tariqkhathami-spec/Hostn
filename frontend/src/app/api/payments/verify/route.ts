import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import Booking from '@/lib/models/Booking';
import ActivityLog from '@/lib/models/ActivityLog';
import { getPaymentProvider } from '@/lib/payment';
import mongoose from 'mongoose';

interface VerifyPaymentRequest {
  paymentId: string;
  moyasarPaymentId: string;
}

/**
 * POST /api/payments/verify
 * Verifies a payment with Moyasar and updates booking status
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    const body = (await request.json()) as VerifyPaymentRequest;
    const { paymentId, moyasarPaymentId } = body;

    // Validate required fields
    if (!paymentId || !moyasarPaymentId) {
      return NextResponse.json(
        { success: false, message: 'paymentId and moyasarPaymentId are required' },
        { status: 400 }
      );
    }

    // Validate paymentId format
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid paymentId format' },
        { status: 400 }
      );
    }

    // Find Payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    // Validate payment belongs to authenticated user
    if (payment.user.toString() !== auth.payload.userId) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to this payment' },
        { status: 403 }
      );
    }

    // Find associated booking
    const booking = await Booking.findById(payment.booking);
    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Associated booking not found' },
        { status: 404 }
      );
    }

    // Call Moyasar API to verify payment
    const provider = getPaymentProvider('moyasar');
    let verificationResult;
    try {
      verificationResult = await provider.verifyPayment(moyasarPaymentId);
    } catch (error) {
      console.error('Moyasar verification failed:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to verify payment with provider' },
        { status: 500 }
      );
    }

    // Verify amount matches (convert Moyasar halalas to SAR)
    const moyasarAmountInSar = verificationResult.amountInSar;
    if (Math.abs(moyasarAmountInSar - booking.pricing.total) > 0.01) {
      // Update payment as failed due to amount mismatch
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = `Amount mismatch: expected ${booking.pricing.total}, got ${moyasarAmountInSar}`;
      payment.providerStatus = verificationResult.status;
      await payment.save();

      return NextResponse.json(
        {
          success: false,
          message: 'Payment amount does not match booking total',
          payment: { status: payment.status, bookingId: booking._id.toString() },
        },
        { status: 400 }
      );
    }

    // Verify currency matches
    if (verificationResult.currency !== 'SAR') {
      // Update payment as failed due to currency mismatch
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = `Currency mismatch: expected SAR, got ${verificationResult.currency}`;
      payment.providerStatus = verificationResult.status;
      await payment.save();

      return NextResponse.json(
        {
          success: false,
          message: 'Payment currency does not match',
          payment: { status: payment.status, bookingId: booking._id.toString() },
        },
        { status: 400 }
      );
    }

    // Handle payment status
    if (verificationResult.status === 'paid') {
      // Extract card information
      const cardLast4 = verificationResult.source?.number
        ? verificationResult.source.number.slice(-4)
        : undefined;

      // Update Payment record
      payment.status = 'paid';
      payment.providerPaymentId = moyasarPaymentId;
      payment.providerStatus = verificationResult.status;
      payment.paidAt = new Date();
      payment.paymentMethod = verificationResult.source?.type;
      payment.cardBrand = verificationResult.source?.company;
      payment.cardLast4 = cardLast4;
      await payment.save();

      // Update Booking
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.confirmedAt = new Date();
      await booking.save();

      // Create ActivityLog entry
      await ActivityLog.create({
        action: 'booking_created',
        performedBy: new mongoose.Types.ObjectId(auth.payload.userId),
        targetType: 'booking',
        targetId: booking._id.toString(),
        details: `Payment verified and booking confirmed. Payment ID: ${moyasarPaymentId}`,
      });

      return NextResponse.json(
        {
          success: true,
          payment: {
            status: payment.status,
            bookingId: booking._id.toString(),
          },
          booking: {
            status: booking.status,
            paymentStatus: booking.paymentStatus,
          },
        },
        { status: 200 }
      );
    } else {
      // Payment not paid - mark as failed
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = verificationResult.source?.message || `Payment status: ${verificationResult.status}`;
      payment.providerStatus = verificationResult.status;
      await payment.save();

      // Booking remains pending/unpaid
      return NextResponse.json(
        {
          success: false,
          message: `Payment verification failed. Status: ${verificationResult.status}`,
          payment: {
            status: payment.status,
            bookingId: booking._id.toString(),
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
