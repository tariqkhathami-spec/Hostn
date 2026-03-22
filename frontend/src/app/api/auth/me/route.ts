import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile with populated wishlist
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Check authentication
    const auth = requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { payload } = auth;

    // Find user by ID and populate wishlist with Property details
    const user = await User.findById(payload.userId).populate({
      path: 'wishlist',
      model: 'Property',
      select: 'title images pricing location ratings',
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
