import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Property from '@/lib/models/Property';
import { requireHost } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

/**
 * GET /api/bookings/host-bookings
 * Returns all bookings for properties owned by the authenticated host
 * Retrieves host's properties first, then finds all bookings for those properties
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;

    // Get properties owned by this host
    const hostProperties = await Property.find({
      host: new mongoose.Types.ObjectId(auth.payload.userId),
    }).select('_id');

    const propertyIds = hostProperties.map((p) => p._id);

    // Get bookings for these properties, populate guest and property details
    const hostBookings = await Booking.find({
      property: { $in: propertyIds },
    })
      .populate('property', 'title location host pricing')
      .populate('guest', 'name email avatar phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: hostBookings,
    });
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
