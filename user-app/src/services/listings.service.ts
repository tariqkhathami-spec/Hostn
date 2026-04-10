import api from './api';
import type { Listing, PaginatedResponse, SearchParams } from '../types';

export const listingsService = {
  search(params: SearchParams) {
    return api
      .get<PaginatedResponse<Listing>>('/properties', { params })
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
    return api.get('/units/search', { params }).then((r) => r.data);
  },

  getUnit(id: string) {
    return api.get(`/units/${id}`).then((r) => {
      const d = r.data as any;
      return d.data ?? d;
    });
  },
};
