/**
 * Unit tests for auth-helpers.ts
 *
 * Covers:
 * - JWT generation includes userId, email, role
 * - Token verification returns payload or null
 * - extractToken parses Bearer header
 * - requireAuth rejects missing/invalid tokens
 * - requireAdmin rejects non-admin roles
 * - requireHost rejects non-host/non-admin roles
 */

// Mock jsonwebtoken before importing the module under test
jest.mock('jsonwebtoken', () => {
  const FAKE_SECRET = 'a]3.kR9$vT!mNp@wLzXcQ7yBfH2dE5gU';
  return {
    sign: jest.fn((payload: any, _secret: string, opts: any) => {
      // Return a deterministic fake token
      return `fake.${Buffer.from(JSON.stringify({ ...payload, exp: 999 })).toString('base64')}.sig`;
    }),
    verify: jest.fn((token: string, _secret: string) => {
      if (token === 'valid-token') {
        return { userId: 'u1', email: 'host@test.com', role: 'host', iat: 1, exp: 999 };
      }
      if (token === 'admin-token') {
        return { userId: 'a1', email: 'admin@test.com', role: 'admin', iat: 1, exp: 999 };
      }
      if (token === 'guest-token') {
        return { userId: 'g1', email: 'guest@test.com', role: 'guest', iat: 1, exp: 999 };
      }
      throw new Error('invalid token');
    }),
  };
});

// Mock db and User model (requireHost does DB lookup)
jest.mock('@/lib/db', () => jest.fn());
jest.mock('@/lib/models/User', () => ({
  findById: jest.fn(),
}));

// Set env before importing
process.env.JWT_SECRET = 'a]3.kR9$vT!mNp@wLzXcQ7yBfH2dE5gU';

import {
  generateToken,
  verifyToken,
  extractToken,
  requireAuth,
  requireAdmin,
  requireHost,
} from '@/lib/auth-helpers';
import User from '@/lib/models/User';

// Helper to create a mock Request with Authorization header
function mockRequest(token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { headers } as unknown as Request;
}

describe('auth-helpers', () => {
  describe('generateToken', () => {
    it('returns a string token', () => {
      const token = generateToken({ _id: 'abc', email: 'a@b.com', role: 'host' });
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('includes userId, email, role in the signed payload', () => {
      const jwt = require('jsonwebtoken');
      generateToken({ _id: 'u123', email: 'test@x.com', role: 'admin' });
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u123', email: 'test@x.com', role: 'admin' }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('verifyToken', () => {
    it('returns payload for a valid token', () => {
      const result = verifyToken('valid-token');
      expect(result).toBeTruthy();
      expect(result!.userId).toBe('u1');
      expect(result!.role).toBe('host');
    });

    it('returns null for an invalid token', () => {
      expect(verifyToken('garbage')).toBeNull();
    });
  });

  describe('extractToken', () => {
    it('extracts token from Bearer header', () => {
      expect(extractToken('Bearer abc123')).toBe('abc123');
    });

    it('returns null for missing header', () => {
      expect(extractToken(null)).toBeNull();
    });

    it('returns null for non-Bearer header', () => {
      expect(extractToken('Basic abc')).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('returns error for missing token', () => {
      const result = requireAuth(mockRequest());
      expect('error' in result).toBe(true);
    });

    it('returns error for invalid token', () => {
      const result = requireAuth(mockRequest('garbage'));
      expect('error' in result).toBe(true);
    });

    it('returns payload for valid token', () => {
      const result = requireAuth(mockRequest('valid-token'));
      expect('payload' in result).toBe(true);
      if ('payload' in result) {
        expect(result.payload.userId).toBe('u1');
      }
    });
  });

  describe('requireAdmin', () => {
    it('rejects non-admin role', () => {
      const result = requireAdmin(mockRequest('valid-token'));
      expect('error' in result).toBe(true);
    });

    it('accepts admin role', () => {
      const result = requireAdmin(mockRequest('admin-token'));
      expect('payload' in result).toBe(true);
    });
  });

  describe('requireHost', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('rejects guest role', async () => {
      const result = await requireHost(mockRequest('guest-token'));
      expect('error' in result).toBe(true);
    });

    it('accepts admin role without DB check', async () => {
      const result = await requireHost(mockRequest('admin-token'));
      expect('payload' in result).toBe(true);
      // Admin should NOT trigger a DB lookup
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('accepts host role and checks DB for suspension', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ isSuspended: false, isBanned: false }),
        }),
      });

      const result = await requireHost(mockRequest('valid-token'));
      expect('payload' in result).toBe(true);
      expect(User.findById).toHaveBeenCalledWith('u1');
    });

    it('rejects suspended host', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ isSuspended: true, isBanned: false }),
        }),
      });

      const result = await requireHost(mockRequest('valid-token'));
      expect('error' in result).toBe(true);
    });

    it('rejects banned host', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ isSuspended: false, isBanned: true }),
        }),
      });

      const result = await requireHost(mockRequest('valid-token'));
      expect('error' in result).toBe(true);
    });
  });
});
