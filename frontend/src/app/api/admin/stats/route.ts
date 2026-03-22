import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import User from '@/lib/models/User';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';
import Review from '@/lib/models/Review';
import ActivityLog from '@/lib/models/ActivityLog';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    // User stats
    const totalUsers = await User.countDocuments({ role: 'guest' });
    const totalHosts = await User.countDocuments({ role: 'host' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Property stats
    const totalProperties = await Property.countDocuments();
    const propertyTypes = await Property.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const propertyTypeMap: Record<string, number> = {};
    propertyTypes.forEach((item: any) => {
      propertyTypeMap[item._id] = item.count;
    });

    const pendingProperties = await Property.countDocuments({ moderationStatus: 'pending' });
    const rejectedProperties = await Property.countDocuments({ moderationStatus: 'rejected' });

    const cityCounts = await Property.aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
    ]);
    const cityDistribution: Record<string, number> = {};
    cityCounts.forEach((item: any) => {
      if (item._id) cityDistribution[item._id] = item.count;
    });

    // Booking stats
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    // Payment stats
    const paidBookings = await Booking.countDocuments({ paymentStatus: 'paid' });
    const unpaidBookings = await Booking.countDocuments({ paymentStatus: 'unpaid' });

    const paidBookingsData = await Booking.find({ paymentStatus: 'paid' }).select('pricing.total');
    const totalRevenue = paidBookingsData.reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

    // Review stats
    const totalReviews = await Review.countDocuments();

    // Suspended hosts
    const suspendedHosts = await User.countDocuments({ role: 'host', isSuspended: true });

    // Monthly revenue
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: { paymentStatus: 'paid' },
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          revenue: { $sum: '$pricing.total' },
          bookingCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12,
      },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyRevenue = monthlyRevenue.map((item: any) => ({
      month: months[item._id.month - 1],
      revenue: item.revenue,
      bookings: item.bookingCount,
    }));

    // Recent activity logs
    const recentLogs = await ActivityLog.find()
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json(
      {
        success: true,
        data: {
          users: {
            total: totalUsers + totalHosts + totalAdmins,
            guests: totalUsers,
            hosts: totalHosts,
            admins: totalAdmins,
          },
          properties: {
            total: totalProperties,
            pending: pendingProperties,
            rejected: rejectedProperties,
            types: propertyTypeMap,
            cities: cityDistribution,
          },
          bookings: {
            total: totalBookings,
            pending: pendingBookings,
            confirmed: confirmedBookings,
            completed: completedBookings,
            cancelled: cancelledBookings,
          },
          payments: {
            totalRevenue,
            paid: paidBookings,
            unpaid: unpaidBookings,
          },
          reviews: {
            total: totalReviews,
          },
          moderation: {
            pendingProperties,
            rejectedProperties,
            bannedUsers,
            suspendedHosts,
          },
          monthlyRevenue: formattedMonthlyRevenue,
          recentActivity: recentLogs,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
