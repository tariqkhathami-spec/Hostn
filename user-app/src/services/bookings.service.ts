import api from './api';
import type { Booking, BookingPricing } from '../types';

export interface BookingHold {
  holdId: string;
  holdExpiresAt?: string;
  /** The server's price for these dates — authoritative. */
  pricing?: BookingPricing;
}

export const bookingsService = {
  getMyBookings(status?: 'upcoming' | 'previous') {
    // Filtered by the server: upcoming = active and not checked out yet.
    return api
      .get('/bookings/my-bookings', { params: { status } })
      .then((r) => {
        const d = r.data as any;
        return (Array.isArray(d) ? d : d?.data ?? []) as Booking[];
      });
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
    return api.post('/bookings/hold', data).then((r) => {
      const d = r.data as any;
      return (d?.data ?? d) as BookingHold;
    });
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
