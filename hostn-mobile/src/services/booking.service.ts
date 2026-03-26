import api from './api';
import type { Booking, PaginatedResponse, ApiResponse } from '../types';

export const bookingService = {
  async create(bookingData: {
    property: string;
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children: number };
    specialRequests?: string;
  }) {
    const { data } = await api.post<ApiResponse<Booking>>('/bookings', bookingData);
    return data.data!;
  },

  async getMyBookings() {
    const { data } = await api.get<PaginatedResponse<Booking>>('/bookings/my-bookings');
    return data.data;
  },

  async getById(id: string) {
    const { data } = await api.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return data.data!;
  },

  async cancel(id: string, reason?: string) {
    const { data } = await api.put<ApiResponse<Booking>>(`/bookings/${id}/cancel`, { reason });
    return data.data!;
  },
};
