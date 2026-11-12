import api from './api';
import type { Listing, PaginatedResponse, SearchParams } from '../types';
import { normalizeCity } from '../constants/cities';

// The backend matches `city` against the stored value, so always send the
// canonical spelling (e.g. "Madinah", "Al Ula", "Jazan").
function withCanonicalCity<T extends { city?: unknown }>(params: T): T {
  if (typeof params.city !== 'string' || !params.city) return params;
  return { ...params, city: normalizeCity(params.city) || params.city };
}

export const listingsService = {
  search(params: SearchParams) {
    return api
      .get<PaginatedResponse<Listing>>('/properties', { params: withCanonicalCity(params) })
      .then((r) => r.data);
  },

  getById(id: string) {
    return api.get<{ data: Listing } | Listing>(`/properties/${id}`).then((r) => {
      // API may wrap in { success, data } or return directly
      const d = r.data as any;
      return d.data ?? d;
    });
  },

  getHomeFeed() {
    return api
      .get<PaginatedResponse<Listing>>('/properties', {
        params: { limit: 20 },
      })
      .then((r) => r.data);
  },

  getReviews(propertyId: string, page = 1) {
    return api
      .get(`/reviews`, { params: { property: propertyId, page, limit: 10 } })
      .then((r) => r.data);
  },

  // ── Units ───────────────────────────────────────────────────
  searchUnits(params: Record<string, string | number>) {
    return api.get('/units/search', { params: withCanonicalCity(params) }).then((r) => r.data);
  },

  getUnit(id: string) {
    return api.get(`/units/${id}`).then((r) => {
      const d = r.data as any;
      return d.data ?? d;
    });
  },
};
