import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth-helpers';

interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatar?: string;
}

/**
 * PUT /api/auth/profile
 * Updates the authenticated user's profile
 * Only allows whitelisted fields: name, phone, avatar
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Check authentication
    const auth = requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { payload } = auth;

    const body = (await request.json()) as UpdateProfileRequest;

    // Whitelist fields that can be updated
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.avatar !== undefined) updates.avatar = body.avatar;

    // Update user with validation
    const user = await User.findByIdAndUpdate(payload.userId, updates, {
      new: true,
      runValidators: true,
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
    console.error('Error updating profile:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
