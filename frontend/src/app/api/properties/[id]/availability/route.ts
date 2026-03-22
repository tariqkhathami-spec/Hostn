import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';

/**
 * GET /api/properties/:id/availability
 * Checks availability for a property between checkIn and checkOut
 * PUBLIC endpoint
 * Returns {available: boolean} if dates don't conflict with pending or confirmed bookings
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, message: 'checkIn and checkOut parameters required' },
        { status: 400 }
      );
    }

    // Verify property exists
    const property = await Property.findById(params.id).lean();
    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Check for conflicting bookings (pending or confirmed)
    const conflictingBooking = await Booking.findOne({
      property: params.id,
      status: { $in: ['pending', 'confirmed'] },
      $expr: {
        $and: [{ $lt: ['$checkIn', checkOutDate] }, { $gt: ['$checkOut', checkInDate] }],
      },
    });

    const available = !conflictingBooking;

    return NextResponse.json({
      success: true,
      data: {
        available,
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
