import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/auth-helpers';

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT token
 * Validates password with bcrypt
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = (await request.json()) as LoginRequest;
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email with password field selected
    const user = await User.findOne({ email }).select('+password');

    // Generic message to prevent user enumeration
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been suspended. Contact support for assistance.',
        },
        { status: 403 }
      );
    }

    // Check if host is suspended
    if (user.role === 'host' && user.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your host account has been suspended. Contact support for assistance.',
        },
        { status: 403 }
      );
    }

    // Generate token
    const token = generateToken(user);

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({
      success: true,
      token,
      user: userObj,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to login' },
      { status: 500 }
    );
  }
}
