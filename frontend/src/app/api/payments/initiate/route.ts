import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import Booking from '@/lib/models/Booking';
import { getPaymentProvider } from '@/lib/payment';
import mongoose from 'mongoose';

interface InitiatePaymentRequest {
  bookingId: string;
}

/**
 * POST /api/payments/initiate
 * Initiates a payment for a booking
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    const body = (await request.json()) as InitiatePaymentRequest;
    const { bookingId } = body;

    // Validate bookingId is provided
    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: 'bookingId is required' },
        { status: 400 }
      );
    }

    // Validate bookingId is a valid MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid bookingId format' },
        { status: 400 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('property', 'title');
    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify booking belongs to authenticated user
    if (booking.guest.toString() !== auth.payload.userId) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to this booking' },
        { status: 403 }
      );
    }

    // Validate booking status is 'pending'
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: `Booking status must be pending, current status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Validate payment status is 'unpaid'
    if (booking.paymentStatus !== 'unpaid') {
      return NextResponse.json(
        { success: false, message: `Payment status must be unpaid, current status: ${booking.paymentStatus}` },
        { status: 400 }
      );
    }

    // Check for existing successful/processing payment (idempotency)
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['paid', 'processing'] },
    });

    if (existingPayment) {
      return NextResponse.json(
        { success: false, message: 'A payment is already processing or completed for this booking' },
        { status: 400 }
      );
    }

    // Calculate fees
    const platformFee = booking.pricing.serviceFee;
    const hostPayout = booking.pricing.total - booking.pricing.serviceFee;
    const idempotencyKey = `booking_${bookingId}_${Date.now()}`;

    // Create Payment record
    const newPayment = await Payment.create({
      booking: new mongoose.Types.ObjectId(bookingId),
      user: new mongoose.Types.ObjectId(auth.payload.userId),
      property: booking.property,
      amount: booking.pricing.total,
      currency: 'SAR',
      provider: 'moyasar',
      status: 'pending',
      fees: {
        platformFee,
        providerFee: 0,
        hostPayout,
      },
      idempotencyKey,
      metadata: {
        bookingId,
        paymentId: null, // Will be set to payment._id
        userId: auth.payload.userId,
      },
    });

    // Update metadata with the actual payment ID
    newPayment.metadata = {
      bookingId,
      paymentId: newPayment._id.toString(),
      userId: auth.payload.userId,
    };
    await newPayment.save();

    // Get payment provider and create payment config
    const provider = getPaymentProvider('moyasar');
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/booking/${bookingId}/payment-callback`;
    const description = `Hostn Booking #${bookingId.slice(-8)}`;

    const paymentConfig = provider.createPaymentConfig({
      amount: booking.pricing.total,
      currency: 'SAR',
      description,
      callbackUrl,
      metadata: {
        bookingId,
        paymentId: newPayment._id.toString(),
        userId: auth.payload.userId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        paymentConfig,
        paymentId: newPayment._id.toString(),
        bookingId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
