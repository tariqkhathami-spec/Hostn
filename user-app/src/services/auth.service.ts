import api from './api';
import type { User } from '../types';

export const authService = {
  sendOtp(phone: string) {
    return api.post<{ message: string }>('/otp/send-otp', { phone }).then((r) => r.data);
  },

  verifyOtp(phone: string, code: string) {
    return api
      .post<{ token: string; refreshToken: string; user: User }>('/otp/verify-otp', {
        phone,
        code,
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
};
