import api from './api';
import type { User } from '../types';

interface SendOtpOptions {
  countryCode?: string;
  method?: 'sms' | 'whatsapp';
}

export const authService = {
  sendOtp(phone: string, options?: SendOtpOptions) {
    return api
      .post<{ message: string }>('/auth/send-otp', {
        phone,
        countryCode: options?.countryCode ?? '+966',
        method: options?.method ?? 'sms',
      })
      .then((r) => r.data);
  },

  verifyOtp(phone: string, code: string) {
    return api
      .post<{ token: string; refreshToken: string; user: User }>('/auth/verify-otp', {
        phone,
        otp: code,
      })
      .then((r) => r.data);
  },

  getMe() {
    return api.get<User>('/auth/me').then((r) => r.data);
  },

  updateProfile(data: Partial<User>) {
    return api.put<User>('/auth/profile', data).then((r) => r.data);
  },

  toggleWishlist(propertyId: string) {
    return api.post<{ wishlist: string[] }>(`/auth/wishlist/${propertyId}`).then((r) => r.data);
  },

  upgradeToHost() {
    return api.put<User>('/auth/upgrade-to-host').then((r) => r.data);
  },

  deleteAccount() {
    return api.delete<{ message: string }>('/auth/account').then((r) => r.data);
  },
};
