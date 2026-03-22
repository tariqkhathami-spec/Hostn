import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import User from '@/lib/models/User';
import Property from '@/lib/models/Property';
import Booking from '@/lib/models/Booking';
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
        { success: false, message: 'Invalid host ID' },
        { status: 400 }
      );
    }

    const host = await User.findById(params.id).select('-password');
    if (!host || host.role !== 'host') {
      return NextResponse.json(
        { success: false, message: 'Host not found' },
        { status: 404 }
      );
    }

    // Get host's properties
    const properties = await Property.find({ host: host._id }).select('title type location ratings');

    // Get bookings for this host's properties
    const propertyIds = properties.map((p: any) => p._id);
    const bookings = await Booking.find({ property: { $in: propertyIds } });

    // Get reviews for this host's properties
    const reviews = await Review.find({ property: { $in: propertyIds } });

    // Calculate total earnings
    const earnings = await Booking.aggregate([
      { $match: { property: { $in: propertyIds }, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]);

    const totalEarnings = earnings.length > 0 ? earnings[0].total : 0;

    // Calculate average rating
    const averageRating =
      properties.length > 0
        ? properties.reduce((sum: number, p: any) => sum + (p.ratings?.average || 0), 0) / properties.length
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: host._id,
          name: host.name,
          email: host.email,
          phone: host.phone,
          avatar: host.avatar,
          role: host.role,
          isVerified: host.isVerified,
          isBanned: host.isBanned,
          isSuspended: host.isSuspended,
          createdAt: host.createdAt,
          updatedAt: host.updatedAt,
          properties,
          propertiesCount: properties.length,
          bookingsCount: bookings.length,
          reviewsCount: reviews.length,
          totalEarnings,
          averageRating: Math.round(averageRating * 10) / 10,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin host detail error:', error);
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
        { success: false, message: 'Invalid host ID' },
        { status: 400 }
      );
    }

    const host = await User.findById(params.id);
    if (!host || host.role !== 'host') {
      return NextResponse.json(
        { success: false, message: 'Host not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'suspend') {
      host.isSuspended = true;
      await host.save();

      await ActivityLog.create({
        action: 'host_suspended',
        performedBy: auth.payload.userId,
        targetType: 'user',
        targetId: host._id.toString(),
        details: `Host "${host.name}" was suspended`,
      });

      return NextResponse.json(
        { success: true, message: `Host ${host.name} has been suspended` },
        { status: 200 }
      );
    }

    if (action === 'activate') {
      host.isSuspended = false;
      await host.save();

      await ActivityLog.create({
        action: 'host_activated',
        performedBy: auth.payload.userId,
        targetType: 'user',
        targetId: host._id.toString(),
        details: `Host "${host.name}" was reactivated`,
      });

      return NextResponse.json(
        { success: true, message: `Host ${host.name} has been activated` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin host update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
