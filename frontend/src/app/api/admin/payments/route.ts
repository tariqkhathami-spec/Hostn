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
    const paymentStatus = searchParams.get('paymentStatus');

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (paymentStatus && ['unpaid', 'paid', 'refunded'].includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    const totalCount = await Booking.countDocuments(filter);

    // Get bookings and transform to payment records
    const bookings = await Booking.find(filter)
      .populate('guest', 'name email')
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const payments = bookings.map((b: any) => ({
      _id: b._id,
      bookingId: b._id,
      guestName: b.guest?.name || 'Unknown',
      guestEmail: b.guest?.email || '',
      propertyTitle: b.property?.title || 'Unknown',
      amount: b.pricing?.total || 0,
      subtotal: b.pricing?.subtotal || 0,
      cleaningFee: b.pricing?.cleaningFee || 0,
      serviceFee: b.pricing?.serviceFee || 0,
      status: b.paymentStatus,
      method: b.paymentStatus === 'paid' ? 'Credit Card' : 'Pending',
      bookingStatus: b.status,
      createdAt: b.createdAt,
    }));

    // Calculate summary stats
    const summaryData = await Booking.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          total: { $sum: '$pricing.total' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary: any = {
      totalRevenue: 0,
      totalPending: 0,
      totalRefunded: 0,
      totalTransactions: totalCount,
    };

    summaryData.forEach((item: any) => {
      if (item._id === 'paid') summary.totalRevenue = item.total;
      if (item._id === 'unpaid') summary.totalPending = item.total;
      if (item._id === 'refunded') summary.totalRefunded = item.total;
    });

    return NextResponse.json(
      {
        success: true,
        data: payments,
        summary,
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
    console.error('Admin payments list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
