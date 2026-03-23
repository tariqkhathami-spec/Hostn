import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/User';
import Property from '@/lib/models/Property';
import ActivityLog from '@/lib/models/ActivityLog';
import { getPaymentProvider } from '@/lib/payment';
import { verifyPaymentSchema } from '@/lib/validation';
import { sendPaymentReceipt, sendHostBookingNotification } from '@/lib/email';
import mongoose from 'mongoose';

/**
 * POST /api/payments/verify
 * Verifies a payment with Moyasar and updates booking status.
 * Sends email notifications on successful payment.
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    // Validate input with Zod
    const body = await request.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { paymentId, moyasarPaymentId } = parsed.data;

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

      // Send email notifications (non-blocking)
      try {
        const guest = await User.findById(auth.payload.userId);
        const property = await Property.findById(booking.property);
        if (guest && property) {
          // Send payment receipt to guest
          sendPaymentReceipt({
            guestEmail: guest.email,
            guestName: guest.name,
            propertyTitle: property.title,
            total: booking.pricing.total,
            paymentMethod: payment.paymentMethod,
            cardLast4: payment.cardLast4,
            bookingId: booking._id.toString(),
            paymentId: payment._id.toString(),
          }).catch((err) => console.error('Failed to send payment receipt:', err));

          // Send booking notification to host
          const host = await User.findById(property.host);
          if (host) {
            sendHostBookingNotification({
              hostEmail: host.email,
              hostName: host.name,
              guestName: guest.name,
              propertyTitle: property.title,
              checkIn: booking.checkIn.toLocaleDateString('en-US'),
              checkOut: booking.checkOut.toLocaleDateString('en-US'),
              total: booking.pricing.total,
              bookingId: booking._id.toString(),
            }).catch((err) => console.error('Failed to send host notification:', err));
          }
        }
      } catch (emailError) {
        // Email failures should not block the payment response
        console.error('Email notification error:', emailError);
      }

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
