/**
 * Canonical subdomain URLs.
 *
 * Each subdomain is a separate origin, so cross-subdomain links must use
 * absolute URLs. Use these helpers instead of hard-coding domains.
 *
 * Environment variables (falls back to production URLs if unset):
 *   NEXT_PUBLIC_MAIN_URL      — guest site (hostn.co)
 *   NEXT_PUBLIC_BUSINESS_URL  — host dashboard (business.hostn.co)
 *   NEXT_PUBLIC_ADMIN_URL     — admin dashboard (admin.hostn.co)
 */

export const URLS = {
  main: process.env.NEXT_PUBLIC_MAIN_URL || 'https://hostn.co',
  business: process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://business.hostn.co',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.hostn.co',
};

/**
 * Client-side subdomain detection based on window.location.hostname.
 * Server-side: pass the host header from a request instead.
 */
export function detectSubdomain(hostname?: string): 'main' | 'business' | 'admin' {
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('business.')) return 'business';
  return 'main';
}

/**
 * Return the URL to navigate to after a successful login.
 * Each subdomain lands the user at its own root (which middleware rewrites
 * to /host or /admin internally).
 */
export function getPostLoginUrl(): string {
  if (typeof window === 'undefined') return '/';
  const sub = detectSubdomain();
  if (sub === 'business') return '/'; // root → rewrites to /host
  if (sub === 'admin') return '/';    // root → rewrites to /admin
  return '/dashboard';                // guest dashboard on main domain
}

/**
 * Cross-subdomain sign-in URLs.
 */
export const AUTH_URLS = {
  guestLogin: () => `${URLS.main}/auth`,
  hostLogin: () => `${URLS.business}/auth`,
  adminLogin: () => `${URLS.admin}/auth`,
  hostSignup: () => `${URLS.business}/auth/signup`,
  guestSignup: () => `${URLS.main}/auth/signup`,
};
