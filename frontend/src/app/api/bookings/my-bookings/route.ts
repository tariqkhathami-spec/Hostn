import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties, users } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * GET /api/bookings/my-bookings
 * Returns all bookings for the authenticated guest
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    // Get bookings for this guest
    const myBookings = bookings.filter((b) => {
      const guestId = typeof b.guest === 'string' ? b.guest : b.guest._id;
      return guestId === payload.userId;
    });

    // Ensure full details are populated
    const enriched = myBookings.map((booking) => ({
      ...booking,
      property: booking.property,
      guest: booking.guest,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
