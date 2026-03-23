import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/auth-helpers';
import { loginSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT token.
 * Input validated with Zod. Rate limited to prevent brute-force attacks.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`login:${ip}`, 5, '1m');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await dbConnect();

    // Validate input with Zod
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

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
