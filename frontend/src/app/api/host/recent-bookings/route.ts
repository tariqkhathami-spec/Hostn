import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * GET /api/host/recent-bookings
 * Returns recent bookings for the host's properties
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get properties owned by this host
    const hostPropertyIds = properties
      .filter((p) => p.host === payload.userId)
      .map((p) => p._id);

    // Get bookings for these properties
    const hostBookings = bookings.filter((b) => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return hostPropertyIds.includes(propId);
    });

    // Sort by date (newest first) and limit
    const recent = hostBookings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: recent,
    });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
