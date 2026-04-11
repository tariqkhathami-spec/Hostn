import api from './api';
import type { Property, Unit, Booking, Review, Transfer, WeeklyReport, Conversation, Message } from '../types';

export const hostService = {
  // Dashboard
  getStats: () => api.get('/host/dashboard/stats').then(r => r.data),
  getWeeklyReports: () => api.get<{ data: WeeklyReport[] }>('/host/reports/weekly').then(r => r.data),
  getWeeklyReportDetail: (id: string) => api.get<{ data: WeeklyReport }>(`/host/reports/weekly/${id}`).then(r => r.data),

  // Properties
  getProperties: () => api.get<{ data: Property[] }>('/host/properties').then(r => r.data),
  getProperty: (id: string) => api.get<{ data: Property }>(`/host/properties/${id}`).then(r => r.data),
  /** @deprecated Use getUnit instead — kept for screens still using /host/units/:id */
  getUnitLegacy: (id: string) => api.get<{ data: Unit }>(`/host/units/${id}`).then(r => r.data),
  /** @deprecated Use updateUnit instead — kept for screens still using PATCH /host/units/:id */
  updateUnitLegacy: (id: string, data: Partial<Unit>) => api.patch(`/host/units/${id}`, data).then(r => r.data),
  toggleUnitStatus: (id: string, status: 'listed' | 'unlisted') => api.patch(`/host/units/${id}/status`, { status }).then(r => r.data),

  // ── Units ───────────────────────────────────────────────────
  getUnitsForProperty: (propertyId: string) =>
    api.get(`/properties/${propertyId}/units/manage`).then((r: any) => r.data),
  getUnit: (id: string) =>
    api.get(`/units/${id}`).then((r: any) => r.data),
  createUnit: (propertyId: string, data: Record<string, unknown>) =>
    api.post(`/properties/${propertyId}/units`, data).then((r: any) => r.data),
  updateUnit: (id: string, data: Record<string, unknown>) =>
    api.put(`/units/${id}`, data).then((r: any) => r.data),
  deleteUnit: (id: string) =>
    api.delete(`/units/${id}`).then((r: any) => r.data),
  duplicateUnit: (id: string) =>
    api.post(`/units/${id}/duplicate`).then((r: any) => r.data),
  toggleUnit: (id: string) =>
    api.patch(`/units/${id}/toggle`).then((r: any) => r.data),

  // Earnings
  getEarnings: (params?: { year?: number }) => api.get('/host/earnings', { params }).then(r => r.data),

  // Bookings
  getBookings: (params?: { status?: string; page?: number }) => api.get<{ data: Booking[] }>('/host/bookings', { params }).then(r => r.data),
  getUpcomingGuests: () => api.get<{ data: Booking[] }>('/host/bookings/upcoming').then(r => r.data),
  getUnitBookedDates: (unitId: string) => api.get(`/bookings/unit/${unitId}/dates`).then(r => r.data),
  getBookingDetail: (id: string) => api.get<{ data: Booking }>(`/bookings/${id}`).then(r => r.data),
  updateBookingStatus: (id: string, status: string) => api.put(`/bookings/${id}/status`, { status }).then(r => r.data),

  // Reviews
  getReviews: (params?: { page?: number }) => api.get<{ data: Review[] }>('/host/reviews', { params }).then(r => r.data),
  getReviewsSummary: () => api.get('/host/reviews/summary').then(r => r.data),
  replyToReview: (reviewId: string, reply: string) => api.post(`/host/reviews/${reviewId}/reply`, { reply }).then(r => r.data),

  // Financial
  getTransfers: (params?: { page?: number; search?: string }) => api.get<{ data: Transfer[] }>('/host/transfers', { params }).then(r => r.data),
  getPaymentMethod: () => api.get('/host/payment-method').then(r => r.data),
  updatePaymentMethod: (data: any) => api.put('/host/payment-method', data).then(r => r.data),
  getTransferDuration: () => api.get('/host/transfer-duration').then(r => r.data),
  updateTransferDuration: (data: Record<string, unknown>) => api.put('/host/transfer-duration', data).then(r => r.data),
  updateBankDetails: (data: Record<string, unknown>) => api.put('/host/payment-method/bank', data).then(r => r.data),
  getTransferDetail: (id: string) => api.get(`/host/transfers/${id}`).then(r => r.data),

  // Calendar
  getCalendarData: (year: number, month: number) =>
    api.get(`/host/calendar`, { params: { year, month: month + 1 } }).then(r => r.data),
  blockDates: (propertyId: string, dates: { start: string; end: string }) =>
    api.put(`/host/calendar/${propertyId}/block`, dates).then(r => r.data),
  unblockDates: (propertyId: string, dates: { start: string; end: string }) =>
    api.put(`/host/calendar/${propertyId}/unblock`, dates).then(r => r.data),

  // Notifications
  getNotifications: (params?: { filter?: string; page?: number }) => api.get('/host/notifications', { params }).then(r => r.data),
  markNotificationRead: (id: string) => api.patch(`/host/notifications/${id}/read`).then(r => r.data),
  getUnreadCount: () => api.get<{ data: { count: number } }>('/host/notifications/unread-count').then(r => r.data),

  // Ambassador Program
  getAmbassadorStatus: () => api.get('/host/program/status').then(r => r.data),
  getAmbassadorTiers: () => api.get('/host/program/tiers').then(r => r.data),
  getAmbassadorIndicators: (quarter?: string) => api.get('/host/ambassador/indicators', { params: { quarter } }).then(r => r.data),
  getAmbassadorComparison: () => api.get('/host/ambassador/comparison').then(r => r.data),
  getAmbassadorFaq: () => api.get('/host/ambassador/faq').then(r => r.data),
  getAmbassadorTerms: () => api.get('/host/ambassador/terms').then(r => r.data),

  // Profile
  getProfile: () => api.get('/host/profile').then(r => r.data),
  updateProfile: (data: any) => api.patch('/host/profile', data).then(r => r.data),
  updateEmail: (email: string) => api.put('/host/profile/email', { email }).then(r => r.data),
  deleteAccount: () => api.delete('/host/account').then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),

  // NPS
  shouldShowNps: () => api.get('/host/nps/should-show').then(r => r.data),
  submitNps: (rating: number, comment?: string) => api.post('/host/nps', { rating, comment }).then(r => r.data),

  // Conversations / Messages
  getConversations: (params?: { status?: string; search?: string }) =>
    api.get<{ data: Conversation[] }>('/host/conversations', { params }).then(r => r.data),
  getConversationMessages: (id: string, params?: { page?: number }) =>
    api.get<{ data: Message[] }>(`/host/conversations/${id}/messages`, { params }).then(r => r.data),
  sendMessage: (conversationId: string, text: string) =>
    api.post<{ data: Message }>(`/host/conversations/${conversationId}/messages`, { text }).then(r => r.data),
  markConversationRead: (id: string) =>
    api.post(`/host/conversations/${id}/read`).then(r => r.data),
  blockConversation: (conversationId: string) =>
    api.put(`/messages/conversations/${conversationId}/block`).then(r => r.data),
  reportUser: (data: { reportedUser: string; reason: string; details?: string }) =>
    api.post('/reports', data).then(r => r.data),
  getSupportChat: () =>
    api.get<{ data: Message[] }>('/host/support/chat').then(r => r.data),
  sendSupportMessage: (text: string) =>
    api.post<{ data: Message }>('/host/support/chat/messages', { text }).then(r => r.data),

  // Pricing & Offers
  getUnitPricing: (unitId: string) => api.get(`/host/units/${unitId}/pricing`).then(r => r.data),
  /** @deprecated Use updateUnitPricing instead — kept for screens still using /host/units/:id/pricing */
  updateUnitPricingLegacy: (unitId: string, data: Record<string, unknown>) => api.put(`/host/units/${unitId}/pricing`, data).then(r => r.data),
  updateUnitPricing: (id: string, data: Record<string, unknown>) =>
    api.put(`/units/${id}/pricing`, data).then((r: any) => r.data),
  getUnitDiscounts: (unitId: string) => api.get(`/host/units/${unitId}/discounts`).then(r => r.data),
  updateDiscount: (unitId: string, type: string, data: Record<string, unknown>) => api.post(`/host/units/${unitId}/discounts/${type}`, data).then(r => r.data),
  toggleDiscount: (unitId: string, type: string) => api.patch(`/host/units/${unitId}/discounts/${type}/toggle`).then(r => r.data),
  getUnitOffers: (unitId: string) => api.get(`/host/units/${unitId}/offers`).then(r => r.data),
  createOffer: (unitId: string, data: Record<string, unknown>) => api.post(`/host/units/${unitId}/offers`, data).then(r => r.data),
  deleteOffer: (unitId: string, offerId: string) => api.delete(`/host/units/${unitId}/offers/${offerId}`).then(r => r.data),

  // Invoices & Statements
  getInvoices: (params?: { page?: number }) => api.get('/host/invoices', { params }).then(r => r.data),
  getInvoiceDetail: (id: string) => api.get(`/host/invoices/${id}`).then(r => r.data),
  getStatements: () => api.get('/host/statements').then(r => r.data),
  getStatementDetail: (month: string) => api.get(`/host/statements/${month}`).then(r => r.data),
  getAccountSummary: (params: { month?: string; year?: number; propertyId?: string; unitId?: string }) => api.get('/host/account-summary', { params }).then(r => r.data),

  // Settings - Managers
  getManagers: () => api.get('/host/managers').then(r => r.data),
  addManager: (data: Record<string, unknown>) => api.post('/host/managers', data).then(r => r.data),
  updateManager: (id: string, data: Record<string, unknown>) => api.put(`/host/managers/${id}`, data).then(r => r.data),
  deleteManager: (id: string) => api.delete(`/host/managers/${id}`).then(r => r.data),

  // Settings - Booking Rules
  getBookingRules: () => api.get('/host/booking-settings').then(r => r.data),
  addBookingRule: (data: Record<string, unknown>) => api.post('/host/booking-settings', data).then(r => r.data),
  deleteBookingRule: (id: string) => api.delete(`/host/booking-settings/${id}`).then(r => r.data),

  // Settings - VAT
  getVatEntries: () => api.get('/host/vat').then(r => r.data),
  addVatEntry: (data: Record<string, unknown>) => api.post('/host/vat', data).then(r => r.data),

  // Permits
  getPermits: () => api.get('/host/properties/permits').then(r => r.data),
  uploadPermit: (unitId: string, data: FormData) => api.post(`/host/units/${unitId}/permit`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  deletePermit: (unitId: string) => api.delete(`/host/units/${unitId}/permit`).then(r => r.data),

  // Protection Program
  getProtectionProgram: () => api.get('/host/protection-program').then(r => r.data),
  getClaims: () => api.get('/host/claims').then(r => r.data),
  submitClaim: (data: Record<string, unknown>) => api.post('/host/claims', data).then(r => r.data),

  // Suggestions
  getSuggestions: () => api.get('/host/suggestions').then(r => r.data),
  addSuggestion: (text: string) => api.post('/host/suggestions', { text }).then(r => r.data),
  voteSuggestion: (id: string, vote: string) => api.post(`/host/suggestions/${id}/vote`, { vote }).then(r => r.data),

  // Property CRUD
  createProperty: (data: Record<string, unknown>) =>
    api.post('/properties', data).then((r: any) => r.data),
  updateProperty: (id: string, data: Record<string, unknown>) =>
    api.put(`/properties/${id}`, data).then((r: any) => r.data),
  uploadImage: (formData: FormData) =>
    api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r: any) => r.data),

  // Legal & Support
  getTerms: () => api.get('/host/terms').then(r => r.data),
  signTerms: () => api.post('/host/terms/sign').then(r => r.data),
  getSupportInfo: () => api.get('/host/support/info').then(r => r.data),

  // Content - Articles, Change Requests, Referrals, Discount Codes, Complaints
  getArticles: (params?: { category?: string; search?: string }) => api.get('/articles', { params }).then(r => r.data),
  getChangeRequests: () => api.get('/host/change-requests').then(r => r.data),
  getReferralLinks: () => api.get('/host/referral-links').then(r => r.data),
  createReferralLink: () => api.post('/host/referral-links').then(r => r.data),
  getDiscountCodes: () => api.get('/host/discount-codes').then(r => r.data),
  createDiscountCode: (data: Record<string, unknown>) => api.post('/host/discount-codes', data).then(r => r.data),
  toggleDiscountCode: (id: string) => api.put(`/host/discount-codes/${id}/toggle`).then(r => r.data),
  getComplaints: () => api.get('/host/complaints').then(r => r.data),
  submitComplaint: (data: Record<string, unknown>) => api.post('/host/complaints', data).then(r => r.data),
};
