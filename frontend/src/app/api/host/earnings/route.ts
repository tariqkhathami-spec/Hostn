import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { EarningsData, MonthlyEarning } from '@/types/index';

/**
 * GET /api/host/earnings
 * Returns earnings data for the host
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Get properties owned by this host
    const hostProperties = properties.filter((p) => p.host === payload.userId);
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Get completed bookings
    const completedBookings = bookings.filter((b) => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      const bookingYear = new Date(b.createdAt).getFullYear();
      return hostPropertyIds.includes(propId) && b.status === 'completed' && bookingYear === year;
    });

    // Calculate monthly earnings
    const monthlyMap = new Map<number, { earnings: number; bookings: number }>();

    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, { earnings: 0, bookings: 0 });
    }

    completedBookings.forEach((booking) => {
      const month = new Date(booking.createdAt).getMonth();
      const current = monthlyMap.get(month) || { earnings: 0, bookings: 0 };
      current.earnings += booking.pricing.total;
      current.bookings += 1;
      monthlyMap.set(month, current);
    });

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const monthly: MonthlyEarning[] = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month: month + 1,
      monthName: monthNames[month],
      earnings: data.earnings,
      bookings: data.bookings,
      avgPerBooking: data.bookings > 0 ? Math.round(data.earnings / data.bookings) : 0,
    }));

    // Calculate by property type
    const byTypeMap = new Map<string, { earnings: number; bookings: number }>();

    completedBookings.forEach((booking) => {
      const propId = typeof booking.property === 'string' ? booking.property : booking.property._id;
      const property = hostProperties.find((p) => p._id === propId);
      const type = property?.type || 'unknown';

      const current = byTypeMap.get(type) || { earnings: 0, bookings: 0 };
      current.earnings += booking.pricing.total;
      current.bookings += 1;
      byTypeMap.set(type, current);
    });

    const byType = Object.fromEntries(byTypeMap);

    // Get top properties by earnings
    const topPropertiesMap = new Map<string, { title: string; type: string; earnings: number; bookings: number }>();

    completedBookings.forEach((booking) => {
      const propId = typeof booking.property === 'string' ? booking.property : booking.property._id;
      const property = hostProperties.find((p) => p._id === propId);

      if (property) {
        const current = topPropertiesMap.get(propId) || {
          title: property.title,
          type: property.type,
          earnings: 0,
          bookings: 0,
        };
        current.earnings += booking.pricing.total;
        current.bookings += 1;
        topPropertiesMap.set(propId, current);
      }
    });

    const topProperties = Array.from(topPropertiesMap.entries())
      .map(([propertyId, data]) => ({ propertyId, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.pricing.total, 0);
    const totalBookings = completedBookings.length;

    const data: EarningsData = {
      year,
      totalEarnings,
      totalBookings,
      avgPerBooking: totalBookings > 0 ? Math.round(totalEarnings / totalBookings) : 0,
      monthly,
      byType,
      topProperties,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch earnings' }, { status: 500 });
  }
}
