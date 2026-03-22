import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/lib/models/Booking';
import { requireAuth } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

/**
 * GET /api/bookings/:id
 * Returns a single booking by ID (guest, property host, or admin only)
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid booking ID' }, { status: 400 });
    }

    const booking = await Booking.findById(params.id).populate([
      { path: 'property', select: 'title location host' },
      { path: 'guest', select: 'name email avatar' },
    ]);

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Check permissions: only guest, property host, or admin can view
    const isGuest = booking.guest._id.toString() === auth.payload.userId;
    const isHost = (booking.property as any).host?.toString() === auth.payload.userId;
    const isAdmin = auth.payload.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view this booking' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch booking' }, { status: 500 });
  }
}
