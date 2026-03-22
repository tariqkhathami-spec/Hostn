import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Booking from '@/lib/models/Booking';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'));
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (status && ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'].includes(status)) {
      filter.status = status;
    }

    if (paymentStatus && ['unpaid', 'paid', 'refunded'].includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    if (search) {
      // Search by booking ID, guest name, property title
      filter.$or = [
        { _id: { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate('property', 'title location')
      .populate('guest', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // If search is provided, filter results on client side (since guest/property names are populated)
    let filteredBookings = bookings;
    if (search) {
      filteredBookings = bookings.filter((b: any) => {
        const guestName = b.guest?.name?.toLowerCase() || '';
        const propertyTitle = b.property?.title?.toLowerCase() || '';
        return guestName.includes(search.toLowerCase()) || propertyTitle.includes(search.toLowerCase());
      });
    }

    // For pagination consistency, recalculate if filter changed results
    const displayCount = filteredBookings.length;

    return NextResponse.json(
      {
        success: true,
        data: filteredBookings,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin bookings list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
