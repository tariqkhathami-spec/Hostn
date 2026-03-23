import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

// SECURITY: JWT_SECRET is REQUIRED in ALL environments.
// The application will NOT start without it. No fallback secrets.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'This is REQUIRED for the application to function securely. ' +
    'Set JWT_SECRET to a strong random value (minimum 32 characters). ' +
    'Generate with: openssl rand -base64 32'
  );
}

if (JWT_SECRET.length < 32) {
  console.warn(
    '[SECURITY WARNING] JWT_SECRET is shorter than 32 characters. ' +
    'Use a longer secret for production security.'
  );
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as TokenPayload;
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
 * Require host or admin role
 */
export function requireHost(request: Request): { payload: TokenPayload } | { error: NextResponse } {
  const auth = requireAuth(request);
  if ('error' in auth) return auth;
  if (auth.payload.role !== 'host' && auth.payload.role !== 'admin') {
    return { error: NextResponse.json({ success: false, message: 'Host access required' }, { status: 403 }) };
  }
  return auth;
}
