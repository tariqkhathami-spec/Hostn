import api from './api';
import type { Booking } from '../types';

export const bookingsService = {
  getMyBookings(status?: 'upcoming' | 'previous') {
    return api
      .get<Booking[]>('/bookings', { params: { status } })
      .then((r) => r.data);
  },

  getById(id: string) {
    return api.get<Booking>(`/bookings/${id}`).then((r) => r.data);
  },

  create(data: {
    property: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    paymentMethod?: string;
    couponCode?: string;
  }) {
    return api.post<Booking>('/bookings', data).then((r) => r.data);
  },

  cancel(id: string) {
    return api.patch<Booking>(`/bookings/${id}/cancel`).then((r) => r.data);
  },
};
