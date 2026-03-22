import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/lib/models/Booking';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * GET /api/bookings/my-bookings
 * Returns all bookings for the authenticated guest
 * Populates property details and sorts by creation date
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    // Get bookings where user is the guest
    const bookings = await Booking.find({ guest: auth.payload.userId })
      .populate('property', 'title images location pricing')
      .populate('guest', 'name email avatar')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
