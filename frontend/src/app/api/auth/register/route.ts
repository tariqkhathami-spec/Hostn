import { NextRequest, NextResponse } from 'next/server';
import { users } from '@/lib/data/seed-properties';
import { generateToken, hashPassword } from '@/lib/auth-helpers';
import { User } from '@/types/index';

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
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest;
    const { name, email, password, phone, role = 'guest' } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    if (users.some((u) => u.email === email)) {
      return NextResponse.json({ success: false, message: 'Email already registered' }, { status: 400 });
    }

    // Create new user
    const newUser: User = {
      _id: `user_${Date.now()}`,
      name,
      email,
      phone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      role,
      isVerified: false,
      wishlist: [],
      createdAt: new Date().toISOString(),
    };

    // Add to users array
    users.push(newUser);

    // Generate token
    const token = generateToken(newUser);

    return NextResponse.json(
      {
        success: true,
        token,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ success: false, message: 'Failed to register' }, { status: 500 });
  }
}
