import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/auth-helpers';
import { registerSchema } from '@/lib/validation';
import { sanitizeText } from '@/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/auth/register
 * Registers a new user and returns JWT token.
 * Input validated with Zod. Rate limited. Names sanitized against XSS.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per hour per IP
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`register:${ip}`, 3, '1h');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await dbConnect();

    // Validate input with Zod
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, email, password, phone, role } = parsed.data;

    // Sanitize name to prevent stored XSS
    const sanitizedName = sanitizeText(name);
    if (!sanitizedName) {
      return NextResponse.json(
        { success: false, message: 'Name contains invalid characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate avatar using sanitized name
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sanitizedName)}`;

    // Create new user - password will be hashed by pre-save hook
    const newUser = await User.create({
      name: sanitizedName,
      email,
      password,
      phone: phone || undefined,
      avatar,
      role,
      isVerified: false,
      isBanned: false,
      isSuspended: false,
      wishlist: [],
    });

    // Generate token
    const token = generateToken(newUser);

    // Return user without password
    const userObj = newUser.toObject();
    delete userObj.password;

    return NextResponse.json(
      {
        success: true,
        token,
        user: userObj,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);

    // Handle validation errors
    if (error instanceof Error) {
      if (error.message.includes('email')) {
        return NextResponse.json(
          { success: false, message: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: 'Failed to register' },
      { status: 500 }
    );
  }
}
