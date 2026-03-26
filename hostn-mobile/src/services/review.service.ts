import api from './api';
import type { Review, PaginatedResponse } from '../types';

export const reviewService = {
  async getPropertyReviews(propertyId: string, page: number = 1, limit: number = 10) {
    const { data } = await api.get<PaginatedResponse<Review>>(`/reviews/property/${propertyId}`, {
      params: { page, limit },
    });
    return data;
  },
};
