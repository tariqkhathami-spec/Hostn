import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';

interface MonthlyEarning {
  month: number;
  monthName: string;
  earnings: number;
  bookings: number;
  avgPerBooking: number;
}

interface PropertyEarning {
  propertyId: string;
  title: string;
  type: string;
  earnings: number;
  bookings: number;
}

interface EarningsData {
  year: number;
  totalEarnings: number;
  totalBookings: number;
  avgPerBooking: number;
  monthly: MonthlyEarning[];
  byPropertyType: Record<string, { earnings: number; bookings: number }>;
  topProperties: PropertyEarning[];
}

/**
 * GET /api/host/earnings
 * Returns earnings data for the host with monthly breakdown, by type, and top properties
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Get properties owned by this host
    const hostProperties = await Property.find({ host: payload.userId });
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Get completed bookings for the year
    const completedBookings = await Booking.find({
      property: { $in: hostPropertyIds },
      status: 'completed',
    }).lean();

    const completedBookingsForYear = completedBookings.filter((b) => {
      const bookingYear = new Date(b.createdAt).getFullYear();
      return bookingYear === year;
    });

    // Calculate monthly earnings
    const monthlyMap = new Map();

    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, { earnings: 0, bookings: 0 });
    }

    completedBookingsForYear.forEach((booking) => {
      const month = new Date(booking.createdAt).getMonth();
      const current = monthlyMap.get(month) || { earnings: 0, bookings: 0 };
      current.earnings += booking.pricing.total;
      current.bookings += 1;
      monthlyMap.set(month, current);
    });

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month: month + 1,
      monthName: monthNames[month],
      earnings: data.earnings,
      bookings: data.bookings,
      avgPerBooking: data.bookings > 0 ? Math.round(data.earnings / data.bookings) : 0,
    }));

    const byTypeMap = new Map();
    completedBookingsForYear.forEach((booking) => {
      const property = hostProperties.find((p) => p._id.equals(booking.property));
      const type = property?.type || 'unknown';
      const current = byTypeMap.get(type) || { earnings: 0, bookings: 0 };
      current.earnings += booking.pricing.total;
      current.bookings += 1;
      byTypeMap.set(type, current);
    });
    const byPropertyType = Object.fromEntries(byTypeMap);

    const topPropertiesMap = new Map();
    completedBookingsForYear.forEach((booking) => {
      const property = hostProperties.find((p) => p._id.equals(booking.property));
      if (property) {
        const propId = property._id.toString();
        const current = topPropertiesMap.get(propId) || { title: property.title, type: property.type, earnings: 0, bookings: 0 };
        current.earnings += booking.pricing.total;
        current.bookings += 1;
        topPropertiesMap.set(propId, current);
      }
    });
    const topProperties = Array.from(topPropertiesMap.entries())
      .map(([propertyId, data]) => ({ propertyId, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    const totalEarnings = completedBookingsForYear.reduce((sum, b) => sum + b.pricing.total, 0);
    const totalBookings = completedBookingsForYear.length;

    const data = {
      year,
      totalEarnings,
      totalBookings,
      avgPerBooking: totalBookings > 0 ? Math.round(totalEarnings / totalBookings) : 0,
      monthly,
      byPropertyType,
      topProperties,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch earnings' }, { status: 500 });
  }
}
