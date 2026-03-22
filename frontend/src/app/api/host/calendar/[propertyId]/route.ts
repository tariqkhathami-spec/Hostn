import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { CalendarData } from '@/types/index';

/**
 * GET /api/host/calendar/:propertyId
 * Returns calendar data (bookings and blocked dates) for a property
 */
export async function GET(request: NextRequest, { params }: { params: { propertyId: string } }) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const property = properties.find((p) => p._id === params.propertyId);

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Verify host ownership
    if (property.host !== payload.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Get bookings for this property
    const propertyBookings = bookings
      .filter((b) => {
        const propId = typeof b.property === 'string' ? b.property : b.property._id;
        return propId === params.propertyId;
      })
      .map((b) => {
        const guestName = typeof b.guest === 'string' ? 'Guest' : b.guest.name;
        const guestEmail = typeof b.guest === 'string' ? '' : b.guest.email;
        return {
          _id: b._id,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          guest: {
            name: guestName,
            email: guestEmail,
          },
          total: b.pricing.total,
        };
      });

    // For seed data, blocked dates are empty
    const blockedDates: { start: string; end: string }[] = [];

    const data: CalendarData = {
      propertyId: params.propertyId,
      propertyTitle: property.title,
      bookings: propertyBookings,
      blockedDates,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
