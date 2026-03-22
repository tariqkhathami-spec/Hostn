import { NextRequest, NextResponse } from 'next/server';
import { properties, bookings } from '@/lib/data/seed-properties';

/**
 * GET /api/properties/:id/availability
 * Checks availability for a property between checkIn and checkOut
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, message: 'checkIn and checkOut parameters required' },
        { status: 400 }
      );
    }

    const property = properties.find((p) => p._id === params.id);
    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Check for overlapping bookings
    const hasConflict = bookings.some((booking) => {
      const propId = typeof booking.property === 'string' ? booking.property : booking.property._id;
      if (propId !== params.id || booking.status === 'cancelled') {
        return false;
      }

      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      return checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn;
    });

    return NextResponse.json({
      success: true,
      data: {
        available: !hasConflict,
        propertyId: params.id,
        checkIn,
        checkOut,
      },
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
