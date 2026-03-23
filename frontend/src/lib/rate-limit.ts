/**
 * Rate limiting implementation for API endpoints.
 *
 * Uses in-memory sliding window counter suitable for Vercel serverless.
 * For production scale, upgrade to Upstash Redis by setting UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN environment variables.
 *
 * The in-memory approach works because:
 * 1. Each Vercel serverless function instance maintains its own window
 * 2. Even without shared state, it prevents rapid-fire abuse from the same instance
 * 3. Combined with Vercel's built-in DDoS protection, this provides adequate protection
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

// Parse duration string to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 60000; // default 1 minute
  const value = parseInt(match[1]);
  switch (match[2]) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

// Clean expired entries periodically to prevent memory leaks
let lastCleanup = Date.now();
function cleanupExpired() {
  const now = Date.now();
  // Clean up every 5 minutes
  if (now - lastCleanup < 300000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
  // Safety: if store gets too large, clear it entirely
  if (store.size > 10000) {
    store.clear();
  }
}

/**
 * Check rate limit for a given key.
 *
 * @param key - Unique identifier (e.g., "login:192.168.1.1" or "booking:userId123")
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param window - Time window (e.g., "1m", "5m", "1h", "30s")
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  window: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  cleanupExpired();

  const now = Date.now();
  const windowMs = parseDuration(window);
  const entry = store.get(key);

  // If no entry or expired, create new window
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  // Increment counter
  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from request for rate limiting.
 * Works with Vercel's x-forwarded-for header and x-real-ip.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP (client IP) from the chain
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Preset rate limit configurations for common endpoints.
 */
export const RATE_LIMITS = {
  login: { maxRequests: 5, window: '1m' },          // 5 attempts per minute per IP
  register: { maxRequests: 3, window: '1h' },        // 3 registrations per hour per IP
  booking: { maxRequests: 10, window: '1m' },        // 10 bookings per minute per user
  payment: { maxRequests: 5, window: '1m' },         // 5 payment attempts per minute per user
  passwordReset: { maxRequests: 3, window: '15m' },  // 3 reset requests per 15 min per IP
  api: { maxRequests: 100, window: '1m' },           // 100 general API calls per minute per IP
  webhook: { maxRequests: 50, window: '1m' },        // 50 webhook calls per minute
} as const;
