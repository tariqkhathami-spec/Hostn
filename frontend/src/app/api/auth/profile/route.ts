import { NextRequest, NextResponse } from 'next/server';
import { users } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatar?: string;
}

/**
 * PUT /api/auth/profile
 * Updates the authenticated user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateProfileRequest;
    const userIndex = users.findIndex((u) => u._id === payload.userId);

    if (userIndex === -1) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Update user properties
    if (body.name !== undefined) users[userIndex].name = body.name;
    if (body.phone !== undefined) users[userIndex].phone = body.phone;
    if (body.avatar !== undefined) users[userIndex].avatar = body.avatar;

    return NextResponse.json({
      success: true,
      data: users[userIndex],
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}
