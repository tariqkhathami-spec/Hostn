import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties, reviews } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { HostStats } from '@/types/index';

/**
 * GET /api/host/stats
 * Returns dashboard statistics for host
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

    const hostProperties = properties.filter((p) => p.host === payload.userId);
    const hostPropertyIds = hostProperties.map((p) => p._id);

    const hostBookings = bookings.filter((b) => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return hostPropertyIds.includes(propId);
    });

    const hostReviews = reviews.filter(() => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return hostPropertyIds.includes(propId);
    });

    const stats: HostStats = {
      properties: {}
      total: hostProperties.length,
      active: hostProperties.filter((p) => p.isActive).length,
      inactive: hostProperties.filter(() => !p.isActive).length,
    },
    bookings: {
      total: hostBookings.length,
      pending: hostBookings.filter((b) => b.status === 'pending').length,
      confirmed: hostBookings.filter((b) => b.status === 'confirmed').length,
      completed: hostBookings.filter((b) => b.status === 'completed').length,
      rejected: hostBookings.filter((b) => b.status === 'rejected').length,
      cancelled: hostBookings.filter((b) => b.status === 'cancelled').length,
    },
    earnings: {
      total: hostBookings.reduce((sum, b) => sum + b.pricing.total, 0),
      monthly: Math.floor(hostBookings.reduce((sum, b) => sum + b.pricing.total, 0) / 12),
    },
    reviews: {
      total: hostReviews.length,
      averageRating: hostReviews.length > 0 ? (hostReviews.reduce((sum, r) => sum + r.ratings.overall, 0) / hostReviews.length).toFixed(1) : '0',
    },
    occupancyRate: Math.ceil((hostBookings.filter((b) => b.status === 'completed').length / hostBookings.length) * 100) || 0,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch stats' }, { status: 500 });
  }
}
