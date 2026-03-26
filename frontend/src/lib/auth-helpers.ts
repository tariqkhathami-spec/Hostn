import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

// SECURITY: JWT_SECRET is REQUIRED in ALL environments at RUNTIME.
// Deferred to runtime so that next build (static analysis) doesn't crash
// when env vars aren't available during the build phase on Vercel.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Get the JWT secret at runtime. Throws a clear error if not set.
 * This is called per-request, NOT at module load time,
 * so it won't break next build on Vercel.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'This is REQUIRED for the application to function securely. ' +
      'Set JWT_SECRET to a strong random value (minimum 32 characters). ' +
      'Generate with: openssl rand -base64 32'
    );
  }
  if (secret.length < 32) {
    console.warn(
      '[SECURITY WARNING] JWT_SECRET is shorter than 32 characters. ' +
      'Use a longer secret for production security.'
    );
  }
  return secret;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a signed JWT token
 */
export function generateToken(user: { _id: any; email: string; role: string }): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Require authenticated user - extracts and verifies token from request
 */
export function requireAuth(request: Request): { payload: TokenPayload } | { error: NextResponse } {
  const token = extractToken(request.headers.get('Authorization'));
  if (!token) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }) };
  }
  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 }) };
  }
  return { payload };
}

/**
 * Require admin role - extracts token and verifies admin role
 */
export function requireAdmin(request: Request): { payload: TokenPayload } | { error: NextResponse } {
  const auth = requireAuth(request);
  if ('error' in auth) return auth;
  if (auth.payload.role !== 'admin') {
    return { error: NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 }) };
  }
  return auth;
}

/**
 * Require host role - extracts token and verifies host or admin role.
 * Also checks if host is suspended in the database (covers pre-suspension tokens).
 * Host routes are also accessible by admins for management purposes.
 */
export async function requireHost(request: Request): Promise<{ payload: TokenPayload } | { error: NextResponse }> {
  const auth = requireAuth(request);
  if ('error' in auth) return auth;
  if (auth.payload.role !== 'host' && auth.payload.role !== 'admin') {
    return { error: NextResponse.json({ success: false, message: 'Host access required' }, { status: 403 }) };
  }
  // SECURITY: Check suspension status from DB to catch tokens issued before suspension
  if (auth.payload.role === 'host') {
    await dbConnect();
    const user = await User.findById(auth.payload.userId).select('isSuspended isBanned').lean();
    if (!user) {
      return { error: NextResponse.json({ success: false, message: 'User not found' }, { status: 401 }) };
    }
    if ((user as any).isSuspended || (user as any).isBanned) {
      return { error: NextResponse.json({ success: false, message: 'Your account has been suspended' }, { status: 403 }) };
    }
  }
  return auth;
}
