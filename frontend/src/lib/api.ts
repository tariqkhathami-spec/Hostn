import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hostn_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hostn_token');
        localStorage.removeItem('hostn_user');
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string; role?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  toggleWishlist: (propertyId: string) =>
    api.post(`/auth/wishlist/${propertyId}`),
};

// ─── Properties ───────────────────────────────────────────────────────────────
export const propertiesApi = {
  getAll: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/properties', { params }),
  getOne: (id: string) => api.get(`/properties/${id}`),
  create: (data: unknown) => api.post('/properties', data),
  update: (id: string, data: unknown) => api.put(`/properties/${id}`, data),
  delete: (id: string) => api.delete(`/properties/${id}`),
  getMyProperties: () => api.get('/properties/my-properties'),
  checkAvailability: (id: string, checkIn: string, checkOut: string) =>
    api.get(`/properties/${id}/availability`, { params: { checkIn, checkOut } }),
  getCities: () => api.get('/properties/cities'),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  create: (data: unknown) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getHostBookings: () => api.get('/bookings/host-bookings'),
  getOne: (id: string) => api.get(`/bookings/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/bookings/${id}/status`, { status }),
  cancel: (id: string, reason?: string) =>
    api.put(`/bookings/${id}/cancel`, { reason }),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getPropertyReviews: (propertyId: string, params?: Record<string, number>) =>
    api.get(`/reviews/property/${propertyId}`, { params }),
  create: (data: unknown) => api.post('/reviews', data),
  update: (id: string, data: unknown) => api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  respond: (id: string, comment: string) =>
    api.post(`/reviews/${id}/respond`, { comment }),
};

// ─── Host Dashboard ──────────────────────────────────────────────────────────
export const hostApi = {
  getStats: () => api.get('/host/stats'),
  getRecentBookings: (limit?: number) =>
    api.get('/host/recent-bookings', { params: { limit } }),
  getNotifications: () => api.get('/host/notifications'),
  getEarnings: (year?: number) =>
    api.get('/host/earnings', { params: { year } }),
  getCalendar: (propertyId: string, startDate?: string, endDate?: string) =>
    api.get(`/host/calendar/${propertyId}`, { params: { startDate, endDate } }),
  blockDates: (propertyId: string, data: { startDate: string; endDate: string; action: 'block' | 'unblock' }) =>
    api.put(`/host/calendar/${propertyId}/block`, data),
  getHostReviews: (params?: Record<string, string | number>) =>
    api.get('/host/reviews', { params }),
  togglePropertyStatus: (id: string) =>
    api.put(`/host/properties/${id}/toggle`),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (data: { bookingId: string }) =>
    api.post('/payments/initiate', data),
  verify: (data: { paymentId: string; moyasarPaymentId: string }) =>
    api.post('/payments/verify', data),
  getOne: (id: string) => api.get(`/payments/${id}`),
  getMyPayments: () => api.get('/payments/my-payments'),
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export const adminApi = {
  // Stats & Dashboard
  getStats: () => api.get('/admin/stats'),

  // Users Management
  getUsers: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/users', { params }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, action: string) =>
    api.patch(`/admin/users/${id}`, { action }),

  // Hosts Management
  getHosts: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/users', { params }),
  getHostDetail: (id: string) => api.get(`/admin/hosts/${id}`),
  updateHost: (id: string, action: string) =>
    api.patch(`/admin/hosts/${id}`, { action }),

  // Properties Management
  getProperties: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/properties', { params }),
  moderateProperty: (id: string, action: 'approve' | 'reject', reason?: string) =>
    api.post(`/admin/properties/${id}/moderate`, { action, reason }),

  // Bookings Management
  getBookings: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/bookings', { params }),
  updateBooking: (id: string, action: string) =>
    api.patch(`/admin/bookings/${id}`, { action }),

  // Payments (new real payment records)
  getPayments: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/payments', { params }),

  // Activity Logs
  getLogs: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/logs', { params }),
};

export default api;
