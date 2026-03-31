import api from './api';
import type { PaymentMethod } from '../types';

export const paymentsService = {
  initiate(data: { bookingId: string; amount: number; method: string }) {
    return api.post('/payments/initiate', data).then((r) => r.data);
  },

  verify(paymentId: string) {
    return api.post('/payments/verify', { paymentId }).then((r) => r.data);
  },

  getSavedMethods() {
    return api.get<PaymentMethod[]>('/paymentMethods').then((r) => r.data);
  },

  addMethod(data: { token: string; brand: string; last4: string; expiryMonth: number; expiryYear: number }) {
    return api.post<PaymentMethod>('/paymentMethods', data).then((r) => r.data);
  },

  deleteMethod(id: string) {
    return api.delete(`/paymentMethods/${id}`).then((r) => r.data);
  },

  setDefault(id: string) {
    return api.put(`/paymentMethods/${id}/default`).then((r) => r.data);
  },
};

export const bnplService = {
  createTabbySession(data: { bookingId: string; amount: number }) {
    return api.post('/bnpl/tabby/create', data).then((r) => r.data);
  },

  createTamaraSession(data: { bookingId: string; amount: number }) {
    return api.post('/bnpl/tamara/create', data).then((r) => r.data);
  },

  verifyTabby(sessionId: string) {
    return api.post('/bnpl/tabby/verify', { sessionId }).then((r) => r.data);
  },

  verifyTamara(orderId: string) {
    return api.post('/bnpl/tamara/verify', { orderId }).then((r) => r.data);
  },
};
