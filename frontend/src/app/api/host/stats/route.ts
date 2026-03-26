import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';
import Review from '@/lib/models/Review';

/**
 * GET /api/host/stats
 * Returns dashboard statistics for the host
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    // Get host properties
    const hostProperties = await Property.find({ host: payload.userId });
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Calculate property stats
    const total = hostProperties.length;
    const active = hostProperties.filter((p) => p.isActive).length;
    const inactive = total - active;

    // Get all bookings for host's properties
    const hostBookings = await Booking.find({ property: { $in: hostPropertyIds } });

    // Calculate booking stats
    const pendingBookings = hostBookings.filter((b) => b.status === 'pending').length;
    const confirmedBookings = hostBookings.filter((b) => b.status === 'confirmed').length;
    const completedBookings = hostBookings.filter((b) => b.status === 'completed').length;
    const cancelledBookings = hostBookings.filter((b) => b.status === 'cancelled').length;

    // Calculate earnings
    const completedBookingsData = hostBookings.filter((b) => b.status === 'completed');
    const totalEarnings = completedBookingsData.reduce((sum, b) => sum + b.pricing.total, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyEarnings = completedBookingsData
      .filter((b) => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + b.pricing.total, 0);

    // Get reviews for host's properties
    const hostReviews = await Review.find({ property: { $in: hostPropertyIds } });

    const avgRating =
      hostReviews.length > 0
        ? hostReviews.reduce((sum, r) => sum + r.ratings.overall, 0) / hostReviews.length
        : 0;

    // Calculate occupancy rate
    const occupancyRate = hostBookings.length > 0 ? (confirmedBookings / hostBookings.length) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        properties: { total, active, inactive },
        bookings: {
          total: hostBookings.length,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        earnings: { total: totalEarnings, monthly: monthlyEarnings },
        reviews: { total: hostReviews.length, averageRating: Math.round(avgRating * 10) / 10 },
        occupancyRate: Math.round(occupancyRate),
      },
    });
  } catch (error) {
    console.error('Error fetching host stats:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch stats' }, { status: 500 });
  }
}
