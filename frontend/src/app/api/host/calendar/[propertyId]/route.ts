import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';
import mongoose from 'mongoose';

interface CalendarBooking {
  _id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guest: {
    name: string;
    email: string;
  };
  total: number;
}

interface CalendarData {
  propertyId: string;
  propertyTitle: string;
  bookings: CalendarBooking[];
  blockedDates: Array<{ start: string; end: string }>;
}

/**
 * GET /api/host/calendar/:propertyId
 * Returns calendar data (bookings and blocked dates) for a property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    // Validate propertyId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.propertyId)) {
      return NextResponse.json({ success: false, message: 'Invalid property ID' }, { status: 400 });
    }

    const propertyId = new mongoose.Types.ObjectId(params.propertyId);

    // Get the property
    const property = await Property.findById(propertyId);

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Verify host ownership
    if (!property.host.equals(new mongoose.Types.ObjectId(payload.userId))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Get bookings for this property (pending/confirmed)
    const propertyBookings = await Booking.find({
      property: propertyId,
      status: { $in: ['pending', 'confirmed'] },
    })
      .populate({
        path: 'guest',
        select: 'name email',
      })
      .lean();

    const bookings: CalendarBooking[] = propertyBookings.map((b) => ({
      _id: b._id.toString(),
      checkIn: new Date(b.checkIn).toISOString(),
      checkOut: new Date(b.checkOut).toISOString(),
      status: b.status,
      guest: {
        name: (b.guest as any)?.name || 'Guest',
        email: (b.guest as any)?.email || '',
      },
      total: b.pricing.total,
    }));

    // Get blocked dates from property unavailableDates
    const blockedDates = property.unavailableDates.map((d) => ({
      start: new Date(d.start).toISOString(),
      end: new Date(d.end).toISOString(),
    }));

    const data: CalendarData = {
      propertyId: propertyId.toString(),
      propertyTitle: property.title,
      bookings,
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
