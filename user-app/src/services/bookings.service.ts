import api from './api';
import type { Booking } from '../types';

export const bookingsService = {
  getMyBookings(status?: 'upcoming' | 'previous') {
    return api
      .get<Booking[]>('/bookings/my-bookings', { params: { status } })
      .then((r) => r.data);
  },

  getById(id: string) {
    return api.get<Booking>(`/bookings/${id}`).then((r) => r.data);
  },

  createHold(data: {
    propertyId: string;
    unitId?: string;
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children: number; infants: number };
  }) {
    return api.post('/bookings/hold', data).then((r) => r.data);
  },

  create(data: {
    propertyId: string;
    unitId?: string;
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children: number; infants: number };
    specialRequests?: string;
    holdId?: string;
    paymentMethod?: string;
    couponCode?: string;
  }) {
    return api.post<Booking>('/bookings', data).then((r) => r.data);
  },

  cancel(id: string) {
    return api.put<Booking>(`/bookings/${id}/cancel`).then((r) => r.data);
  },

  getUnitBookedDates(unitId: string) {
    return api.get(`/bookings/unit/${unitId}/dates`).then((r) => r.data);
  },
};
