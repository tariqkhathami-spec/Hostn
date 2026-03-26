import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';
import Review from '@/lib/models/Review';

interface HostNotification {
  id: string;
  type: 'booking_pending' | 'review_new';
  title: string;
  message: string;
  action: string;
  read: boolean;
  createdAt: string;
}

/**
 * GET /api/host/notifications
 * Returns notifications from pending bookings and recent reviews
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    const notifications: HostNotification[] = [];

    // Get properties owned by this host
    const hostProperties = await Property.find({ host: payload.userId });
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Find pending bookings
    const pendingBookings = await Booking.find({
      property: { $in: hostPropertyIds },
      status: 'pending',
    }).populate({
      path: 'guest',
      select: 'name',
    });

    pendingBookings.forEach((booking) => {
      const guestName = booking.guest ? (booking.guest as any).name : 'Guest';
      notifications.push({
        id: `notif_booking_${booking._id}`,
        type: 'booking_pending',
        title: 'New Booking Request',
        message: `${guestName} requested to book your property`,
        action: `/host/bookings/${booking._id}`,
        read: false,
        createdAt: new Date(booking.createdAt).toISOString(),
      });
    });

    // Find recent reviews from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReviews = await Review.find({
      property: { $in: hostPropertyIds },
      createdAt: { $gte: sevenDaysAgo },
    }).populate({
      path: 'guest',
      select: 'name',
    });

    recentReviews.forEach((review) => {
      const guestName = review.guest ? (review.guest as any).name : 'Guest';
      notifications.push({
        id: `notif_review_${review._id}`,
        type: 'review_new',
        title: 'New Review',
        message: `${guestName} left a ${review.ratings.overall}-star review`,
        action: `/host/reviews`,
        read: false,
        createdAt: new Date(review.createdAt).toISOString(),
      });
    });

    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch notifications' }, { status: 500 });
  }
}
