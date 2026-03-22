import { User } from '@/types/index';

const JWT_SECRET = 'hostn-secret-key-development-only';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Generate a simple JWT token (for development/seed data only)
 * In production, use a proper library like jose
 */
export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  // Simple base64 encoding (NOT secure for production)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded) as TokenPayload;

    // Check if token is expired
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash password (simple approach - in production use bcrypt)
 */
export function hashPassword(password: string): string {
  // Simple implementation - in production use bcrypt
  return Buffer.from(password).toString('base64');
}

/**
 * Compare password with hash
 */
export function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
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
