import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'guest' | 'host' | 'admin';

function getRoleRedirect(role: Role): string {
  switch (role) {
    case 'host': return '/host';
    case 'admin': return '/admin';
    default: return '/dashboard';
  }
}

function decodeTokenPayload(token: string): { role?: Role } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hostn_token')?.value;
  const payload = token ? decodeTokenPayload(token) : null;
  const role = payload?.role as Role | undefined;
  const isAuthenticated = !!role;

  // Auth pages: redirect authenticated users to their dashboard
  if (pathname.startsWith('/auth')) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(getRoleRedirect(role!), request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: require authentication — pass original path as redirect
  if (!isAuthenticated) {
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('redirect', pathname + (request.nextUrl.search || ''));
    return NextResponse.redirect(redirectUrl);
  }

  // /dashboard/* — accessible by any authenticated user (primarily guest)
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // /host/* — requires host or admin role
  if (pathname.startsWith('/host')) {
    if (role !== 'host' && role !== 'admin') {
      return NextResponse.redirect(new URL(getRoleRedirect(role!), request.url));
    }
    return NextResponse.next();
  }

  // /admin/* — requires admin role
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL(getRoleRedirect(role!), request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/:path*', '/dashboard/:path*', '/host/:path*', '/admin/:path*'],
};
