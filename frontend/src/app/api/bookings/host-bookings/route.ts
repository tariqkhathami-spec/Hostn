import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * GET /api/bookings/host-bookings
 * Returns all bookings for properties owned by the authenticated host
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

    // Get properties owned by this host
    const hostPropertyIds = properties
      .filter((p) => p.host === payload.userId)
      .map((p) => p._id);

    // Get bookings for these properties
    const hostBookings = bookings.filter((b) => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return hostPropertyIds.includes(propId);
    });

    // Sort by creation date (newest first)
    hostBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: hostBookings,
    });
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
