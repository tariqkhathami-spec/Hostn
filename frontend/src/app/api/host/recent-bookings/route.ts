import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';

/**
 * GET /api/host/recent-bookings
 * Returns recent bookings for the host's properties
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '5');
    limit = Math.min(Math.max(1, limit), 50); // Ensure 1 <= limit <= 50

    // Get properties owned by this host
    const hostProperties = await Property.find({ host: payload.userId });
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Get bookings for these properties, populated with property and guest data
    const hostBookings = await Booking.find({ property: { $in: hostPropertyIds } })
      .populate({
        path: 'property',
        select: 'title images',
      })
      .populate({
        path: 'guest',
        select: 'name avatar',
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: hostBookings,
    });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
