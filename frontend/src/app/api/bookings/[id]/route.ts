import { NextRequest, NextResponse } from 'next/server';
import { bookings } from '@/lib/data/seed-properties';

/**
 * GET /api/bookings/:id
 * Returns a single booking by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const booking = bookings.find((b) => b._id === params.id);

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
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
