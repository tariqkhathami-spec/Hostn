import api from './api';
import type { PaymentMethod } from '../types';

export const paymentsService = {
  initiate(data: { bookingId: string; amount: number; method: string }) {
    return api.post('/payments/initiate', data).then((r) => r.data);
  },

  // paymentId = our Payment record, moyasarPaymentId = the id Moyasar
  // returns to the callback. The server needs both.
  verify(paymentId: string, moyasarPaymentId: string) {
    return api.post('/payments/verify', { paymentId, moyasarPaymentId }).then((r) => r.data);
  },

  getSavedMethods() {
    return api.get<PaymentMethod[]>('/payment-methods').then((r) => r.data);
  },

  addMethod(data: {
    provider: string;
    tokenId: string;
    cardBrand: string;
    cardLast4: string;
    expiryMonth: number;
    expiryYear: number;
    nickname?: string;
  }) {
    return api.post<PaymentMethod>('/payment-methods', data).then((r) => r.data);
  },

  deleteMethod(id: string) {
    return api.delete(`/payment-methods/${id}`).then((r) => r.data);
  },

  setDefault(id: string) {
    return api.put(`/payment-methods/${id}/default`).then((r) => r.data);
  },

  simulate(paymentId: string, outcome: 'approved' | 'declined' | 'insufficient_funds' | 'fraud' | 'cancelled' | 'timeout') {
    return api.post('/payments/simulate', { paymentId, outcome }).then((r) => r.data);
  },

  getStatus(paymentId: string) {
    return api.get(`/payments/${paymentId}/status`).then((r) => r.data);
  },
};

export const bnplService = {
  createTabbySession(data: { bookingId: string; amount: number }) {
    return api.post('/bnpl/tabby/create', data).then((r) => r.data);
  },

  createTamaraSession(data: { bookingId: string; amount: number }) {
    return api.post('/bnpl/tamara/create', data).then((r) => r.data);
  },

  verifyTabby(paymentId: string, tabbyPaymentId: string) {
    return api.post('/bnpl/tabby/verify', { paymentId, tabbyPaymentId }).then((r) => r.data);
  },

  verifyTamara(paymentId: string, orderId: string) {
    return api.post('/bnpl/tamara/verify', { paymentId, orderId }).then((r) => r.data);
  },
};
