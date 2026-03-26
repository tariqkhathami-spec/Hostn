import api from './api';
import type { Property, PaginatedResponse, ApiResponse, SearchParams, HomeFeedData } from '../types';

export const propertyService = {
  async search(params: SearchParams) {
    const { data } = await api.get<PaginatedResponse<Property>>('/properties', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get<ApiResponse<Property>>(`/properties/${id}`);
    return data.data!;
  },

  async getCities() {
    const { data } = await api.get<ApiResponse<string[]>>('/properties/cities');
    return data.data!;
  },

  async getHomeFeed() {
    const { data } = await api.get<ApiResponse<HomeFeedData>>('/properties/home-feed');
    return data.data!;
  },

  async checkAvailability(id: string, checkIn: string, checkOut: string) {
    const { data } = await api.get<{ success: boolean; available: boolean }>(
      `/properties/${id}/availability`,
      { params: { checkIn, checkOut } }
    );
    return data.available;
  },
};
