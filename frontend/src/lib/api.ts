import axios from 'axios';

// All API calls go to the Express backend — never to Next.js API routes
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send HttpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Auto-refresh: on 401 with TOKEN_EXPIRED, try refreshing before redirecting
let isRefreshing = false;
let failedQueue: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(undefined)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we haven't retried yet, try refresh
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — force logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('hostn_user');
          window.location.href = '/auth';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Non-refreshable 401 — redirect to login
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/auth/')) {
        localStorage.removeItem('hostn_user');
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; phone?: string; role?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) =>
    api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  toggleWishlist: (propertyId: string) =>
    api.post(`/auth/wishlist/${propertyId}`),
  upgradeToHost: () => api.put('/auth/upgrade-to-host'),
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),
  sendOtp: (data: { phone: string; countryCode?: string; method?: 'sms' | 'whatsapp'; lang?: string }) =>
    api.post('/auth/send-otp', data),
  verifyOtp: (data: { phone: string; otp: string; countryCode?: string }) =>
    api.post('/auth/verify-otp', data),
  deleteAccount: () => api.delete('/auth/account'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════
export const propertiesApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/properties', { params }),
  getOne: (id: string) => api.get(`/properties/${id}`),
  create: (data: Record<string, unknown>) => api.post('/properties', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/properties/${id}`, data),
  getMyProperties: () => api.get('/properties/my-properties'),
  getCities: () => api.get('/properties/cities'),
  getSuggestions: (q: string) => api.get('/properties/suggestions', { params: { q } }),
  getPublicStats: () => api.get('/properties/stats/public'),
  getHomeFeed: () => api.get('/properties/home-feed'),
  getNearby: (params: { lat: number; lng: number; radius?: number; limit?: number }) =>
    api.get('/properties/nearby', { params }),
  reverseGeocode: (lat: number, lng: number) =>
    api.get('/properties/geocode/reverse', { params: { lat, lng } }),
  getAvailability: (id: string, params?: Record<string, unknown>) =>
    api.get(`/properties/${id}/availability`, { params }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// UNITS (property sub-units)
// ═══════════════════════════════════════════════════════════════════════════════
export const unitsApi = {
  /** Public unit search (for /search page) */
  search: (params?: Record<string, string>) =>
    api.get('/units/search', { params }),
  /** List active units for a property (public) */
  getForProperty: (propertyId: string, params?: Record<string, unknown>) =>
    api.get(`/properties/${propertyId}/units`, { params }),
  /** List ALL units for a property including inactive (host dashboard) */
  getManage: (propertyId: string, params?: Record<string, unknown>) =>
    api.get(`/properties/${propertyId}/units/manage`, { params }),
  /** Get single unit with populated property + host */
  getOne: (id: string) => api.get(`/units/${id}`),
  /** Create a new unit under a property */
  create: (propertyId: string, data: Record<string, unknown>) =>
    api.post(`/properties/${propertyId}/units`, data),
  /** Update a unit */
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/units/${id}`, data),
  /** Soft-delete a unit */
  remove: (id: string) => api.delete(`/units/${id}`),
  /** Duplicate a unit with optional field exclusions */
  duplicate: (id: string, exclude?: string[]) =>
    api.post(`/units/${id}/duplicate`, { exclude }),
  /** Update unit pricing (day-of-week + date overrides) */
  updatePricing: (id: string, data: Record<string, unknown>) =>
    api.put(`/units/${id}/pricing`, data),
  /** Toggle unit active status (host-facing) */
  toggle: (id: string) => api.patch(`/units/${id}/toggle`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKINGS
// ═══════════════════════════════════════════════════════════════════════════════
export const bookingsApi = {
  createHold: (data: Record<string, unknown>) => api.post('/bookings/hold', data),
  create: (data: Record<string, unknown>) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getHostBookings: () => api.get('/bookings/host-bookings'),
  getOne: (id: string) => api.get(`/bookings/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/bookings/${id}/status`, { status }),
  cancel: (id: string) => api.put(`/bookings/${id}/status`, { status: 'cancelled' }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOST
// ═══════════════════════════════════════════════════════════════════════════════
export const hostApi = {
  getStats: () => api.get('/host/stats'),
  getRecentBookings: (params?: Record<string, unknown>) =>
    api.get('/host/recent-bookings', { params }),
  getNotifications: () => api.get('/host/notifications'),
  getEarnings: (params?: { year?: number }) =>
    api.get('/host/earnings', { params }),
  getCalendar: (propertyId: string, params?: Record<string, string>) => api.get(`/host/calendar/${propertyId}`, { params }),
  blockDates: (propertyId: string, data: { startDate: string; endDate: string; action: string; unitId?: string }) =>
    api.put(`/host/calendar/${propertyId}/block`, data),
  getReviews: (params?: Record<string, unknown>) =>
    api.get('/host/reviews', { params }),
  togglePropertyStatus: (id: string) => api.put(`/host/properties/${id}/toggle`),
  addPropertyImage: (id: string, formData: FormData) =>
    api.post(`/host/properties/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  removePropertyImage: (id: string, imageUrl: string) =>
    api.delete(`/host/properties/${id}/images`, { data: { imageUrl } }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════════
export const reviewsApi = {
  getPropertyReviews: (propertyId: string, params?: Record<string, unknown>) =>
    api.get(`/reviews/property/${propertyId}`, { params }),
  create: (data: Record<string, unknown>) => api.post('/reviews', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  respond: (id: string, comment: string) =>
    api.post(`/reviews/${id}/respond`, { comment }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════
export const paymentsApi = {
  initiate: (data: { bookingId: string }) => api.post('/payments/initiate', data),
  verify: (data: { paymentId: string; moyasarPaymentId: string }) =>
    api.post('/payments/verify', data),
  getOne: (id: string) => api.get(`/payments/${id}`),
  getMyPayments: () => api.get('/payments/my-payments'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const notificationsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getUnreadSummary: () => api.get<{ success: boolean; data: { bookings: number; support: number; messages: number } }>('/notifications/unread-summary'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════
export const messagesApi = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (data: { recipientId: string; propertyId?: string; bookingId?: string }) =>
    api.post('/messages/conversations', data),
  getMessages: (conversationId: string, params?: Record<string, unknown>) =>
    api.get(`/messages/conversations/${conversationId}`, { params }),
  sendMessage: (conversationId: string, data: { content: string }) =>
    api.post(`/messages/conversations/${conversationId}/messages`, data),
  toggleBlock: (conversationId: string) =>
    api.put(`/messages/conversations/${conversationId}/block`),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// WISHLISTS (multi-list)
// ═══════════════════════════════════════════════════════════════════════════════
export const wishlistsApi = {
  getLists: () => api.get('/wishlists'),
  getList: (id: string) => api.get(`/wishlists/${id}`),
  createList: (name: string) => api.post('/wishlists', { name }),
  updateList: (id: string, name: string) => api.put(`/wishlists/${id}`, { name }),
  deleteList: (id: string) => api.delete(`/wishlists/${id}`),
  toggleProperty: (listId: string, propertyId: string) =>
    api.post(`/wishlists/${listId}/properties/${propertyId}`),
  moveProperty: (data: { propertyId: string; fromListId: string; toListId: string }) =>
    api.put('/wishlists/move', data),
  getPropertyMembership: (propertyId: string) =>
    api.get(`/wishlists/property/${propertyId}/membership`),
};

export const supportApi = {
  getMyTickets: () => api.get('/support'),
  createTicket: (data: { subject: string; category: string; priority: string; message: string }) =>
    api.post('/support', data),
  getTicket: (id: string) => api.get(`/support/${id}`),
  replyToTicket: (id: string, data: { content: string }) =>
    api.post(`/support/${id}/reply`, data),
  updateTicketStatus: (id: string, status: string) =>
    api.put(`/support/${id}/status`, { status }),
  // Admin
  getAllTickets: () => api.get('/support'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
export const reportsApi = {
  createReport: (data: { targetType: string; targetId: string; reason: string; description: string; relatedBooking?: string }) =>
    api.post('/reports', data),
  // Admin
  getAllReports: () => api.get('/reports'),
  getReport: (id: string) => api.get(`/reports/${id}`),
  takeAction: (id: string, data: { status: string; actionTaken: string; adminNotes?: string }) =>
    api.put(`/reports/${id}/action`, data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  // Users
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  // Properties
  getProperties: (params?: Record<string, unknown>) => api.get('/admin/properties', { params }),
  moderateProperty: (id: string, data: Record<string, unknown>) =>
    api.post(`/admin/properties/${id}/moderate`, data),
  // Bookings
  getBookings: (params?: Record<string, unknown>) => api.get('/admin/bookings', { params }),
  updateBooking: (id: string, data: Record<string, unknown>) => api.patch(`/admin/bookings/${id}`, data),
  deleteBooking: (id: string) => api.delete(`/admin/bookings/${id}`),
  // Payments
  getPayments: (params?: Record<string, unknown>) => api.get('/admin/payments', { params }),
  refundPayment: (id: string, data: { reason: string }) => api.post(`/admin/payments/${id}/refund`, data),
  // Units
  getPropertyUnits: (propertyId: string, params?: Record<string, unknown>) =>
    api.get(`/admin/properties/${propertyId}/units`, { params }),
  toggleUnit: (id: string) => api.patch(`/admin/units/${id}/toggle`),
  // Logs
  getLogs: (params?: Record<string, unknown>) => api.get('/admin/logs', { params }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
export const uploadApi = {
  single: (formData: FormData) =>
    api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  multiple: (formData: FormData) =>
    api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════════════════════════════
export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params?: Record<string, unknown>) =>
    api.get('/wallet/transactions', { params }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════════════════════════════════════════
export const couponsApi = {
  validate: (code: string) => api.post('/coupons/validate', { code }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BNPL (Buy Now Pay Later) — Tabby & Tamara
// ═══════════════════════════════════════════════════════════════════════════════
export const bnplApi = {
  // Check availability for a given amount
  checkAvailability: (amount: number) =>
    api.get('/bnpl/availability', { params: { amount } }),
  // Tabby
  createTabbyCheckout: (data: { bookingId: string }) =>
    api.post('/bnpl/tabby/create', data),
  verifyTabbyPayment: (data: { paymentId: string; tabbyPaymentId?: string }) =>
    api.post('/bnpl/tabby/verify', data),
  // Tamara
  createTamaraCheckout: (data: { bookingId: string }) =>
    api.post('/bnpl/tamara/create', data),
  verifyTamaraPayment: (data: { paymentId: string; orderId?: string }) =>
    api.post('/bnpl/tamara/verify', data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BLOG
// ═══════════════════════════════════════════════════════════════════════════════
export const publicHostApi = {
  getProfile: (id: string, params?: Record<string, unknown>) =>
    api.get(`/hosts/${id}`, { params }),
};

export const blogApi = {
  // Public
  getPosts: (params?: Record<string, unknown>) =>
    api.get('/blog/posts', { params }),
  getPost: (slug: string) =>
    api.get(`/blog/posts/${slug}`),
  getCategories: () =>
    api.get('/blog/categories'),
  // Admin
  createPost: (data: Record<string, unknown>) =>
    api.post('/blog/posts', data),
  updatePost: (id: string, data: Record<string, unknown>) =>
    api.put(`/blog/posts/${id}`, data),
  deletePost: (id: string) =>
    api.delete(`/blog/posts/${id}`),
  createCategory: (data: Record<string, unknown>) =>
    api.post('/blog/categories', data),
  deleteCategory: (id: string) =>
    api.delete(`/blog/categories/${id}`),
};

export default api;
