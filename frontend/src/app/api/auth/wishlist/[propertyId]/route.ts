import { NextRequest, NextResponse } from 'next/server';
import { users } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * POST /api/auth/wishlist/:propertyId
 * Toggles a property in the user's wishlist
 */
export async function POST(request: NextRequest, { params }: { params: { propertyId: string } }) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const userIndex = users.findIndex((u) => u._id === payload.userId);

    if (userIndex === -1) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const user = users[userIndex];
    const wishlistIndex = user.wishlist.indexOf(params.propertyId);

    if (wishlistIndex > -1) {
      // Remove from wishlist
      user.wishlist.splice(wishlistIndex, 1);
    } else {
      // Add to wishlist
      user.wishlist.push(params.propertyId);
    }

    return NextResponse.json({
      success: true,
      data: user,
      message: wishlistIndex > -1 ? 'Removed from wishilst' : 'Added to wishlist',
    });
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return NextResponse.json({ success: false, message: 'Failed to toggle wishilist' }, { status: 500 });
  }
}
