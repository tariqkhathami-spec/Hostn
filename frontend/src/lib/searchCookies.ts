/**
 * Persist search parameters in a cookie so they survive navigation.
 * Cleared automatically after a booking is confirmed.
 */

const COOKIE_NAME = 'hostn_search';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export interface SearchCookieParams {
  city?: string;
  type?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  guests?: string;
}

export function saveSearchCookies(params: SearchCookieParams) {
  // Merge with existing cookie so partial saves don't wipe other fields
  const existing = getSearchCookies() || {};
  const merged = { ...existing, ...params };

  // Strip empty values
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== '' && v !== 0) clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return;
  const value = encodeURIComponent(JSON.stringify(clean));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getSearchCookies(): SearchCookieParams | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function clearSearchCookies() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
