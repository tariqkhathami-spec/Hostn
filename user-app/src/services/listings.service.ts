import api from './api';
import type { Listing, PaginatedResponse, Review, SearchParams } from '../types';
import { flattenUnit } from '../utils/unit';
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

  getReviews(propertyId: string, page = 1) {
    return api
      .get(`/reviews/property/${propertyId}`, { params: { page, limit: 10 } })
      .then((r) => {
        const d = r.data as any;
        return (Array.isArray(d) ? d : d?.data ?? []) as Review[];
      });
  },

  // ── Units ───────────────────────────────────────────────────
  // Every unit is returned flattened (see utils/unit.ts): location, host,
  // type, rules, ratings and the title are copied up from its property.
  searchUnits(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<Listing>> {
    return api.get('/units/search', { params: withCanonicalCity(params) }).then((r) => {
      const d = r.data as any;
      const rows: any[] = Array.isArray(d) ? d : d?.data ?? [];
      return {
        data: rows.map((u) => flattenUnit(u)) as Listing[],
        pagination: d?.pagination ?? { total: rows.length, page: 1, pages: 1, limit: rows.length },
      };
    });
  },

  getUnit(id: string): Promise<Listing> {
    return api.get(`/units/${id}`).then((r) => {
      const d = r.data as any;
      return flattenUnit(d.data ?? d) as Listing;
    });
  },
};
