import api from './api';
import type { ApiResponse, User } from '../types';

export const authService = {
  async sendOTP(phone: string, countryCode: string = '+966', method: 'sms' | 'whatsapp' = 'sms', lang: string = 'ar') {
    const { data } = await api.post<ApiResponse<null>>('/auth/send-otp', { phone, countryCode, method, lang });
    return data;
  },

  async verifyOTP(phone: string, otp: string, countryCode: string = '+966') {
    const { data } = await api.post<ApiResponse<null> & { token: string; user: User; isNewUser: boolean }>(
      '/auth/verify-otp',
      { phone, countryCode, otp }
    );
    return data;
  },

  async getMe() {
    const { data } = await api.get<ApiResponse<User> & { user: User }>('/auth/me');
    return data.user || data.data;
  },

  async updateProfile(updates: { name?: string; phone?: string; avatar?: string }) {
    const { data } = await api.put<ApiResponse<User> & { user: User }>('/auth/profile', updates);
    return data.user || data.data;
  },

  async toggleWishlist(propertyId: string) {
    const { data } = await api.post<{ success: boolean; wishlist: string[] }>(
      `/auth/wishlist/${propertyId}`
    );
    return data;
  },

  async registerDeviceToken(token: string, platform: 'ios' | 'android') {
    const { data } = await api.post('/notifications/device-token', { token, platform });
    return data;
  },
};
