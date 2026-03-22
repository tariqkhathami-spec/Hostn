import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/host', '/dashboard'];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/auth/login', '/auth/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hostn_token')?.value;

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
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      if (payload.role !== 'admin') {
        // Non-admin user trying to access admin routes
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // For host routes, verify the user has host or admin role
  if (isProtectedRoute && pathname.startsWith('/host') && token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      if (payload.role !== 'host' && payload.role !== 'admin') {
        // Regular guest trying to access host routes
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      // Invalid token, let it through - the page will handle the error
    }
  }

  // Redirect authenticated users from auth pages to appropriate dashboard
  if (isAuthRoute && token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      if (payload.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (payload.role === 'host') {
        return NextResponse.redirect(new URL('/host', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
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
