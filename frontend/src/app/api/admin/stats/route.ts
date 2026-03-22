import { NextResponse } from 'next/server';
import { requireAdmin, getActivityLogs, getPropertyModeration, isUserBanned, isHostSuspended } from '@/lib/admin-helpers';
import { seedUsers, seedProperties, seedBookings, seedReviews } from '@/lib/data/seed-properties';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const users = seedUsers;
  const properties = seedProperties;
  const bookings = seedBookings;

  const totalUsers = users.filter(u => u.role === 'guest').length;
  const totalHosts = users.filter(u => u.role === 'host').length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalProperties = properties.length;
  const totalBookings = bookings.length;

  const totalRevenue = bookings
    .filter(b => {
      const status = typeof b.status === 'string' ? b.status : '';
      return status === 'confirmed' || status === 'completed';
    })
    .reduce((sum, b) => {
      const total = typeof b.pricing === 'object' ? b.pricing.total : 0;
      return sum + total;
    }, 0);

  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid').length;
  const unpaidBookings = bookings.filter(b => b.paymentStatus === 'unpaid').length;

  const recentLogs = getActivityLogs().slice(0, 10);

  // Moderation queue stats
  const pendingProperties = properties.filter(p => getPropertyModeration(p._id).status === 'pending').length;
  const rejectedProperties = properties.filter(p => getPropertyModeration(p._id).status === 'rejected').length;
  const bannedUsersCount = users.filter(u => isUserBanned(u._id)).length;
  const suspendedHostsCount = users.filter(u => u.role === 'host' && isHostSuspended(u._id)).length;

  // Property type distribution
  const propertyTypes: Record<string, number> = {};
  properties.forEach(p => {
    propertyTypes[p.type] = (propertyTypes[p.type] || 0) + 1;
  });

  // City distribution
  const cityDistribution: Record<string, number> = {};
  properties.forEach(p => {
    const city = typeof p.location === 'object' ? p.location.city : '';
    if (city) cityDistribution[city] = (cityDistribution[city] || 0) + 1;
  });

  // Monthly revenue (simulated based on booking dates)
  const monthlyRevenue: { month: string; revenue: number; bookings: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach((month, idx) => {
    const monthBookings = bookings.filter(b => {
      const date = new Date(b.createdAt);
      return date.getMonth() === idx;
    });
    monthlyRevenue.push({
      month,
      revenue: monthBookings.reduce((s, b) => s + (typeof b.pricing === 'object' ? b.pricing.total : 0), 0),
      bookings: monthBookings.length,
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      users: { total: totalUsers + totalHosts + totalAdmins, guests: totalUsers, hosts: totalHosts, admins: totalAdmins },
      properties: { total: totalProperties, pending: pendingProperties, rejected: rejectedProperties, types: propertyTypes, cities: cityDistribution },
      bookings: { total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings, completed: completedBookings, cancelled: cancelledBookings },
      payments: { totalRevenue, paid: paidBookings, unpaid: unpaidBookings },
      reviews: { total: seedReviews.length },
      moderation: { pendingProperties, rejectedProperties, bannedUsers: bannedUsersCount, suspendedHosts: suspendedHostsCount },
      monthlyRevenue,
      recentActivity: recentLogs,
    },
  });
}
