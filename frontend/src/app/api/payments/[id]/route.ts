import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import mongoose from 'mongoose';

/**
 * GET /api/payments/[id]
 * Returns a payment record by ID
 * Only accessible by the payment owner or admin users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    const { id } = params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment ID format' },
        { status: 400 }
      );
    }

    // Find payment and populate related data
    const payment = await Payment.findById(id)
      .populate('booking', 'status paymentStatus checkIn checkOut pricing')
      .populate('user', 'name email')
      .populate('property', 'title location');

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check authorization: user must be the payment owner or admin
    const isPaymentOwner = payment.user._id.toString() === auth.payload.userId;
    const isAdmin = auth.payload.role === 'admin';

    if (!isPaymentOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to this payment' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}
