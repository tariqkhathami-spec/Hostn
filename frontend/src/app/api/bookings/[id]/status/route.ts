import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Property from '@/lib/models/Property';
import { requireHost } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

interface UpdateStatusRequest {
  status: 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  cancellationReason?: string;
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

/**
 * PUT /api/bookings/:id/status
 * Updates the status of a booking (host or admin only)
 * Validates status transitions
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid booking ID' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateStatusRequest;
    const { status, cancellationReason } = body;

    if (!status) {
      return NextResponse.json({ success: false, message: 'Status is required' }, { status: 400 });
    }

    const booking = await Booking.findById(params.id).populate('property');
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Verify host owns the property (unless admin)
    const property = await Property.findById(booking.property._id);
    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    if (auth.payload.role !== 'admin' && property.host.toString() !== auth.payload.userId) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update this booking' },
        { status: 403 }
      );
    }

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[booking.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot transition from '${booking.status}' to '${status}'`,
        },
        { status: 400 }
      );
    }

    // Update booking
    booking.status = status;

    if (status === 'confirmed') {
      // SECURITY: Prevent confirming bookings that haven't been paid
      if (booking.paymentStatus !== 'paid') {
        return NextResponse.json(
          { success: false, message: 'Cannot confirm booking: payment has not been verified' },
          { status: 400 }
        );
      }
      booking.confirmedAt = new Date();
    } else if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      if (cancellationReason) {
        booking.cancellationReason = cancellationReason;
      }
    }

    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'property', select: 'title location' },
      { path: 'guest', select: 'name email' },
    ]);

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
