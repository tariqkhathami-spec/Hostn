import api from './api';
import type { HostInfo, Listing, Review } from '../types';

export interface HostProfile {
  host: HostInfo;
  stats: {
    totalProperties: number;
    averageRating: number;
    totalReviews: number;
  };
  properties: Listing[];
  reviews: Review[];
}

export const hostsService = {
  getProfile(id: string) {
    return api.get<HostProfile>(`/hosts/${id}`).then((r) => r.data);
  },
};
