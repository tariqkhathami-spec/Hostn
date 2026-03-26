import api from './api';
import type { SavedPaymentMethod, CouponValidation, ApiResponse } from '../types';

export const paymentService = {
  async initiatePayment(bookingId: string, paymentMethod: string, cardDetails?: any) {
    const { data } = await api.post('/payments/initiate', {
      bookingId,
      paymentMethod,
      ...cardDetails,
    });
    return data;
  },

  async verifyPayment(paymentId: string) {
    const { data } = await api.post('/payments/verify', { paymentId });
    return data;
  },

  // Saved payment methods
  async getSavedMethods() {
    const { data } = await api.get<ApiResponse<SavedPaymentMethod[]>>('/payment-methods');
    return data.data!;
  },

  async addMethod(methodData: {
    provider: string;
    tokenId: string;
    cardBrand: string;
    cardLast4: string;
    expiryMonth: number;
    expiryYear: number;
    nickname?: string;
  }) {
    const { data } = await api.post<ApiResponse<SavedPaymentMethod>>('/payment-methods', methodData);
    return data.data!;
  },

  async deleteMethod(id: string) {
    await api.delete(`/payment-methods/${id}`);
  },

  async setDefaultMethod(id: string) {
    const { data } = await api.put<ApiResponse<SavedPaymentMethod>>(`/payment-methods/${id}/default`);
    return data.data!;
  },

  // Coupons
  async validateCoupon(code: string, bookingAmount: number) {
    const { data } = await api.post<ApiResponse<CouponValidation>>('/coupons/validate', {
      code,
      bookingAmount,
    });
    return data.data!;
  },
};
