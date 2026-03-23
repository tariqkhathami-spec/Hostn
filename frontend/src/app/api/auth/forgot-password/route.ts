import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { passwordResetRequestSchema } from '@/lib/validation';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email with a secure token.
 * Rate limited to prevent abuse. Uses generic response to prevent user enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per 15 minutes per IP
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`password-reset:${ip}`, 3, '15m');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    await dbConnect();

    // Validate input
    const body = await request.json();
    const parsed = passwordResetRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Generic success message regardless of whether user exists (prevents enumeration)
    const genericResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Return same response to prevent email enumeration
      return genericResponse;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (so even if DB is compromised, token can't be used)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store hashed token and expiry (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send email with unhashed token (user clicks link with this token)
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetToken, // The unhashed token goes in the email link
    });

    return genericResponse;
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
