import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties, reviews } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { HostNotification } from '@/types/index';

/**
 * GET /api/host/notifications
 * Returns notifications for the host
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

    const notifications: HostNotification[] = [];

    // Get properties owned by this host
    const hostPropertyIds = properties
      .filter((p) => p.host === payload.userId)
      .map((p) => p._id);

    // Find pending bookings
    const pendingBookings = bookings.filter((b) => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return hostPropertyIds.includes(propId) && b.status === 'pending';
    });

    pendingBookings.forEach((booking, idx) => {
      notifications.push({
        id: `notif_booking_${booking._id}`,
        type: 'booking_pending',
        title: 'New Booking Request',
        message: `${booking.guest.name} requested to book your property`,
        time: new Date(booking.createdAt).toISOString(),
        read: false,
        action: `/host/bookings/${booking._id}`,
      });
    });

    // Find new reviews
    const recentReviews = reviews.filter((r) => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return hostPropertyIds.includes(propId);
    });

    recentReviews.slice(0, 2).forEach((review) => {
      notifications.push({
        id: `notif_review_${review._id}`,
        type: 'review_new',
        title: 'New Review',
        message: `${review.guest.name} left a ${review.ratings.overall}-star review`,
        time: new Date(review.createdAt).toISOString(),
        read: false,
        action: `/host/reviews`,
      });
    });

    // Sort by time (newest first)
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch notifications' }, { status: 500 });
  }
}
