import api from './api';
import type { Listing, PaginatedResponse, SearchParams } from '../types';

export const listingsService = {
  search(params: SearchParams) {
    return api
      .get<PaginatedResponse<Listing>>('/properties', { params })
      .then((r) => r.data);
  },

  getById(id: string) {
    return api.get<Listing>(`/properties/${id}`).then((r) => r.data);
  },

  getHomeFeed() {
    return api
      .get<{ featured: Listing[]; popular: Listing[]; deals: Listing[] }>('/properties', {
        params: { featured: true, limit: 10 },
      })
      .then((r) => r.data);
  },

  getReviews(propertyId: string, page = 1) {
    return api
      .get(`/reviews`, { params: { property: propertyId, page, limit: 10 } })
      .then((r) => r.data);
  },
};
