import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'guest' | 'host' | 'admin';

/**
 * Production:     hostn.co, business.hostn.co, admin.hostn.co
 * Development:    localhost:3000, business.localhost:3000, admin.localhost:3000
 * Vercel preview: any *.vercel.app
 */
function detectSubdomain(host: string): 'main' | 'business' | 'admin' {
  const h = host.toLowerCase();
  if (h.startsWith('admin.')) return 'admin';
  if (h.startsWith('business.')) return 'business';
  return 'main';
}

function getRoleRedirect(role: Role): string {
  switch (role) {
    case 'host': return '/host';
    case 'admin': return '/admin';
    default: return '/dashboard';
  }
}

function decodeTokenPayload(token: string): { userType?: Role; role?: Role } | null {
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
  const host = request.headers.get('host') || '';
  const subdomain = detectSubdomain(host);

  const token = request.cookies.get('hostn_token')?.value;
  const payload = token ? decodeTokenPayload(token) : null;
  const role = (payload?.userType || payload?.role) as Role | undefined;
  const isAuthenticated = !!role;

  // ── 1. Legacy path 404s on main domain ──────────────────────────────
  // After subdomain migration, /host/* and /admin/* are served only via
  // business.hostn.co and admin.hostn.co respectively.
  //
  // PR G: use exact-equals OR prefix-with-slash so the public `/hosts/[id]`
  // route (guest-side host profile) isn't caught. The old check
  // `startsWith('/host')` was 404ing every `/hosts/abc` path.
  if (subdomain === 'main') {
    const isHostDashboard = pathname === '/host' || pathname.startsWith('/host/');
    const isAdminDashboard = pathname === '/admin' || pathname.startsWith('/admin/');
    if (isHostDashboard || isAdminDashboard) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // ── 2. Redirect legacy-prefixed paths to clean URLs on subdomains ───
  // business.hostn.co/host → business.hostn.co/ (308 permanent)
  // business.hostn.co/host/bookings → business.hostn.co/bookings
  // admin.hostn.co/admin/users → admin.hostn.co/users
  // Users who type the prefixed URL get bounced to the clean version.
  if (subdomain === 'business' && (pathname === '/host' || pathname.startsWith('/host/'))) {
    const cleanPath = pathname.replace(/^\/host/, '') || '/';
    const url = new URL(cleanPath + (request.nextUrl.search || ''), request.url);
    return NextResponse.redirect(url, 308);
  }
  if (subdomain === 'admin' && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    const cleanPath = pathname.replace(/^\/admin/, '') || '/';
    const url = new URL(cleanPath + (request.nextUrl.search || ''), request.url);
    return NextResponse.redirect(url, 308);
  }

  // ── 3. Subdomain rewrites ───────────────────────────────────────────
  // business.hostn.co/bookings → /host/bookings (internally)
  // admin.hostn.co/users       → /admin/users  (internally)
  // URL stays clean (business.hostn.co/bookings); the /host prefix is hidden.
  if (subdomain === 'business') {
    // Don't rewrite auth pages (they're shared) or _next internals
    const skipRewrite =
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname === '/favicon.ico';

    if (!skipRewrite && !pathname.startsWith('/host')) {
      const url = request.nextUrl.clone();
      url.pathname = `/host${pathname === '/' ? '' : pathname}`;
      // Apply auth protection after rewrite via a recursive middleware pass
      // (Next.js middleware doesn't recurse, so protection is enforced below
      // on the rewritten pathname)
      return applyAuthProtection(url.pathname, role, isAuthenticated, request, url);
    }
  }

  if (subdomain === 'admin') {
    const skipRewrite =
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname === '/favicon.ico';

    if (!skipRewrite && !pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return applyAuthProtection(url.pathname, role, isAuthenticated, request, url);
    }
  }

  // ── 3. Legacy redirects (still apply on main domain) ────────────────
  if (pathname === '/listings' || pathname.startsWith('/listings/')) {
    const newPath = pathname.replace(/^\/listings/, '/search');
    const url = new URL(newPath + (request.nextUrl.search || ''), request.url);
    return NextResponse.redirect(url, 308);
  }

  const pricingMatch = pathname.match(/^(\/host\/listings\/[^/]+\/units\/[^/]+)\/pricing(\/.*)?$/);
  if (pricingMatch) {
    const newPath = pricingMatch[1] + '/calendar' + (pricingMatch[2] || '');
    const url = new URL(newPath + (request.nextUrl.search || ''), request.url);
    return NextResponse.redirect(url, 308);
  }

  // ── 4. Auth pages: redirect authenticated users to their dashboard ──
  if (pathname.startsWith('/auth')) {
    if (isAuthenticated) {
      // Redirect within the current subdomain
      if (subdomain === 'business') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      if (subdomain === 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.redirect(new URL(getRoleRedirect(role!), request.url));
    }
    return NextResponse.next();
  }

  // ── 5. Main domain protected routes ─────────────────────────────────
  return applyAuthProtection(pathname, role, isAuthenticated, request);
}

/**
 * Apply role-based route protection. If rewriteUrl is provided, the
 * response rewrites to that URL on success.
 */
function applyAuthProtection(
  pathname: string,
  role: Role | undefined,
  isAuthenticated: boolean,
  request: NextRequest,
  rewriteUrl?: URL
) {
  // /dashboard/* — any authenticated user
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) return redirectToAuth(pathname, request);
    return rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next();
  }

  // /host/* — host or admin (admin can be on admin subdomain only though).
  // PR G: `/hosts/*` (plural, public host profile) must NOT be caught here.
  if (pathname === '/host' || pathname.startsWith('/host/')) {
    if (!isAuthenticated) return redirectToAuth(pathname, request);
    if (role !== 'host' && role !== 'admin') {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    return rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next();
  }

  // /admin/* — admin only
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAuthenticated) return redirectToAuth(pathname, request);
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    return rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next();
  }

  return rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next();
}

function redirectToAuth(pathname: string, request: NextRequest) {
  const redirectUrl = new URL('/auth', request.url);
  redirectUrl.searchParams.set('redirect', pathname + (request.nextUrl.search || ''));
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  // Match everything except static assets — needed so subdomain rewrites
  // cover business.hostn.co/anything and admin.hostn.co/anything
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)).*)',
  ],
};
