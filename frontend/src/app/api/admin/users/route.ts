import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import User from '@/lib/models/User';
import Booking from '@/lib/models/Booking';
import { escapeRegex } from '@/lib/sanitize';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'));
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (role && ['guest', 'host', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (search) {
      // SECURITY: Escape regex special characters to prevent NoSQL injection / ReDoS
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const totalCount = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich users with booking stats
    const enrichedUsers = await Promise.all(
      users.map(async (user: any) => {
        const bookingCount = await Booking.countDocuments({ guest: user._id });
        const totalSpent = await Booking.aggregate([
          { $match: { guest: user._id, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]);

        return {
          ...user,
          bookingCount,
          totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: enrichedUsers,
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
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
