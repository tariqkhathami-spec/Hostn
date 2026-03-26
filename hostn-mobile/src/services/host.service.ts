import api from './api';

export const hostService = {
  async getStats() {
    const { data } = await api.get('/host/stats');
    return data;
  },

  async getRecentBookings(params?: Record<string, unknown>) {
    const { data } = await api.get('/host/recent-bookings', { params });
    return data;
  },

  async getEarnings(params?: { year?: number }) {
    const { data } = await api.get('/host/earnings', { params });
    return data;
  },

  async getCalendar(propertyId: string) {
    const { data } = await api.get(`/host/calendar/${propertyId}`);
    return data;
  },

  async getReviews(params?: Record<string, unknown>) {
    const { data } = await api.get('/host/reviews', { params });
    return data;
  },

  async getMyProperties() {
    const { data } = await api.get('/properties/my-properties');
    return data;
  },

  async togglePropertyStatus(id: string) {
    const { data } = await api.put(`/host/properties/${id}/toggle`);
    return data;
  },

  async upgradeToHost() {
    const { data } = await api.put('/auth/upgrade-to-host');
    return data;
  },
};
