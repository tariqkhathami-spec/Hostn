import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * POST /api/auth/wishlist/:propertyId
 * Toggles a property in the user's wishlist
 * Returns action taken: 'added' or 'removed'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    await dbConnect();

    // Check authentication
    const auth = requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { payload } = auth;
    const propertyId = params.propertyId;

    // Validate propertyId is a valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(propertyId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid property ID' },
        { status: 400 }
      );
    }

    const propertyObjectId = new Types.ObjectId(propertyId);

    // Check if property is already in wishlist
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const isInWishlist = user.wishlist.some(
      (id) => id.toString() === propertyObjectId.toString()
    );

    let updatedUser;
    let action: 'added' | 'removed';

    if (isInWishlist) {
      // Remove from wishlist using $pull
      updatedUser = await User.findByIdAndUpdate(
        payload.userId,
        { $pull: { wishlist: propertyObjectId } },
        { new: true }
      );
      action = 'removed';
    } else {
      // Add to wishlist using $addToSet (prevents duplicates)
      updatedUser = await User.findByIdAndUpdate(
        payload.userId,
        { $addToSet: { wishlist: propertyObjectId } },
        { new: true }
      );
      action = 'added';
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Failed to update wishlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        wishlist: updatedUser.wishlist,
        action,
      },
    });
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to toggle wishlist' },
      { status: 500 }
    );
  }
}
