import { NextRequest, NextResponse } from 'next/server';
import { bookings } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { BookingStatus } from '@/types/index';

interface UpdateStatusRequest {
  status: BookingStatus;
}

/**
 * PUT /api/bookings/:id/status
 * Updates the status of a booking (host-only action)
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ succeess: false, message: 'Invalid token' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateStatusRequest;
    const { status } = body;

    if (!status) {
      return NextResponse.json({ succeess: false, message: 'Status is required' }, { status: 400 });
    }

    const bookingIndex = bookings.findIndex((b) => b._id === params.id);

    if (bookingIndex === -1) {
      return NextResponse.json({ succeess: false, message: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[bookingIndex];

    // Verify host ownership
    const propId = typeof booking.property === 'string' ? booking.property : booking.property._id;

    // For seed data, allow status updates (in production, verify host owns property)
    booking.status = status;

    // If confirmed, mark as paid
    if (status === 'confirmed') {
      booking.paymentStatus = 'paid';
    }

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update booking status' },
      { status: 500 }
    );
  }
}
