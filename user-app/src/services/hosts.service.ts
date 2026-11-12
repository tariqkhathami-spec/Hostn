import api from './api';
import type { HostInfo, Listing, Review } from '../types';

export interface HostProfile {
  host: HostInfo;
  stats: {
    propertyCount: number;
    /** Average of review `ratings.overall`, on a 1–10 scale. */
    averageRating: number;
    totalReviews: number;
    memberSince?: number;
  };
  properties: Listing[];
  reviews: Review[];
}

export const hostsService = {
  getProfile(id: string) {
    return api.get<HostProfile>(`/hosts/${id}`).then((r) => r.data);
  },
};
