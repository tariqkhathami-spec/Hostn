import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/host', '/dashboard'];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/auth/login', '/auth/register'];

/**
 * Decode the payload of a JWT token without verification.
 * Middleware uses this for routing decisions only — actual token
 * verification happens in API route handlers via auth-helpers.ts.
 *
 * Edge Runtime cannot use the Node.js `jsonwebtoken` library,
 * so we manually decode the base64url-encoded payload segment.
 */
function decodeJwtPayload(token: string): { userId: string; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);

    if (!payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawToken = request.cookies.get('hostn_token')?.value;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  // Check route types
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes to login
  if ((isProtectedRoute || isAdminRoute) && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin routes, verify the token contains admin role
  if (isAdminRoute && token) {
    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // For host routes, verify the user has host or admin role
  if (isProtectedRoute && pathname.startsWith('/host') && token) {
    const payload = decodeJwtPayload(token);
    if (payload && payload.role !== 'host' && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect authenticated users from auth pages to appropriate dashboard
  if (isAuthRoute && token) {
    const payload = decodeJwtPayload(token);
    if (payload) {
      if (payload.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (payload.role === 'host') {
        return NextResponse.redirect(new URL('/host', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/host/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ],
};
