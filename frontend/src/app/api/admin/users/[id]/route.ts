import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import User from '@/lib/models/User';
import Booking from '@/lib/models/Booking';
import Property from '@/lib/models/Property';
import Review from '@/lib/models/Review';
import ActivityLog from '@/lib/models/ActivityLog';
import mongoose from 'mongoose';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id).select('-password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's bookings
    const bookings = await Booking.find({ guest: user._id })
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's properties (if host)
    const properties = await Property.find({ host: user._id }).select('title type location moderationStatus');

    // Get user's reviews
    const reviews = await Review.find({ guest: user._id })
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate stats
    const totalSpent = await Booking.aggregate([
      { $match: { guest: user._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified,
          isBanned: user.isBanned,
          isSuspended: user.isSuspended,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          bookingCount: bookings.length,
          totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
          bookings,
          properties,
          reviews,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'ban') {
      user.isBanned = true;
      await user.save();

      await ActivityLog.create({
        action: 'user_banned',
        performedBy: auth.payload.userId,
        targetType: 'user',
        targetId: user._id.toString(),
        details: `User "${user.name}" (${user.email}) was banned`,
      });

      return NextResponse.json(
        { success: true, message: `User ${user.name} has been banned` },
        { status: 200 }
      );
    }

    if (action === 'unban') {
      user.isBanned = false;
      await user.save();

      await ActivityLog.create({
        action: 'user_unbanned',
        performedBy: auth.payload.userId,
        targetType: 'user',
        targetId: user._id.toString(),
        details: `User "${user.name}" (${user.email}) was unbanned`,
      });

      return NextResponse.json(
        { success: true, message: `User ${user.name} has been unbanned` },
        { status: 200 }
      );
    }

    if (action === 'suspend' && user.role === 'host') {
      user.isSuspended = true;
      await user.save();

      await ActivityLog.create({
        action: 'host_suspended',
        performedBy: auth.payload.userId,
        targetType: 'user',
        targetId: user._id.toString(),
        details: `Host "${user.name}" (${user.email}) was suspended`,
      });

      return NextResponse.json(
        { success: true, message: `Host ${user.name} has been suspended` },
        { status: 200 }
      );
    }

    if (action === 'activate' && user.role === 'host') {
      user.isSuspended = false;
      await user.save();

      await ActivityLog.create({
        action: 'host_activated',
        performedBy: auth.payload.userId,
        targetType: 'user',
        targetId: user._id.toString(),
        details: `Host "${user.name}" (${user.email}) was activated`,
      });

      return NextResponse.json(
        { success: true, message: `Host ${user.name} has been activated` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
