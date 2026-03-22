import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/auth-helpers';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'guest' | 'host';
}

/**
 * POST /api/auth/register
 * Registers a new user and returns JWT token
 * Password is automatically hashed by User pre-save hook
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = (await request.json()) as RegisterRequest;
    const { name, email, password, phone, role = 'guest' } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Password length validation
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate role - only allow 'guest' or 'host'
    if (role !== 'guest' && role !== 'host') {
      return NextResponse.json(
        { success: false, message: 'Invalid role. Only guest or host allowed.' },
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

    // Generate avatar
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    // Create new user - password will be hashed by pre-save hook
    const newUser = await User.create({
      name,
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
