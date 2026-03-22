import { NextRequest, NextResponse } from 'next/server';
import { users } from '@/lib/data/seed-properties';
import { generateToken } from '@/lib/auth-helpers';
import { isUserBanned, isHostSuspended } from '@/lib/admin-helpers';

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT token
 * For seed data, password is not validated (any password works for known users)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // Check if user is banned
    if (isUserBanned(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Your account has been suspended. Contact support for assistance.' },
        { status: 403 }
      );
    }

    // Check if host is suspended
    if (user.role === 'host' && isHostSuspended(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Your host account has been suspended. Contact support for assistance.' },
        { status: 403 }
      );
    }

    // For seed data, skip password validation
    // In production, compare with hashed password
    const token = generateToken(user);

    return NextResponse.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, message: 'Failed to login' }, { status: 500 });
  }
}
