import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties, reviews } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { HostDashboardStats } from '@/types/index';

/**
 * GET /api/host/stats
 * Returns dashboard statistics for the host
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

    // Get host properties
    const hostProperties = properties.filter((p) => p.host === payload.userId);
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Calculate property stats
    const total = hostProperties.length;
    const active = hostProperties.filter((p) => p.isActive).length;
    const inactive = total - active;

    // Calculate booking stats
    const hostBookings = bookings.filter((b) => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return hostPropertyIds.includes(propId);
    });

    const pendingBookings = hostBookings.filter((b) => b.status === 'pending').length;
    const confirmedBookings = hostBookings.filter((b) => b.status === 'confirmed').length;
    const completedBookings = hostBookings.filter((b) => b.status === 'completed').length;
    const cancelledBookings = hostBookings.filter((b) => b.status === 'cancelled').length;

    // Calculate earnings
    const completedBookingsData = hostBookings.filter((b) => b.status === 'completed');
    const totalEarnings = completedBookingsData.reduce((sum, b) => sum + b.pricing.total, 0);
    const monthlyEarnings = completedBookingsData
      .filter((b) => {
        const bookingMonth = new Date(b.createdAt).getMonth();
        const currentMonth = new Date().getMonth();
        return bookingMonth === currentMonth;
      })
      .reduce((sum, b) => sum + b.pricing.total, 0);

    // Calculate reviews
    const propertyReviews = reviews.filter((r) => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return hostPropertyIds.includes(propId);
    });

    const avgRating = propertyReviews.length
      ? propertyReviews.reduce((sum, r) => sum + r.ratings.overall, 0) / propertyReviews.length
      : 0;

    // Calculate occupancy
    const occupancyRate = hostBookings.length > 0 ? (confirmedBookings / hostBookings.length) * 100 : 0;

    const stats: HostDashboardStats = {
      properties: { total, active, inactive },
      bookings: {
        total: hostBookings.length,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      earnings: { total: totalEarnings, monthly: monthlyEarnings },
      reviews: { total: propertyReviews.length, averageRating: Math.round(avgRating * 10) / 10 },
      occupancyRate: Math.round(occupancyRate),
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching host stats:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch stats' }, { status: 500 });
  }
}
