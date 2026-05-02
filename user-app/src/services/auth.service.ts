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

  getMe(): Promise<User> {
    // GET /auth/me returns {success, user} — not the standard
    // {success, data} envelope, so the api.ts response interceptor
    // doesn't unwrap it. Without this explicit `.user` extract, the
    // auth store ended up holding the wrapper after cold-boot
    // bootstrap (DD3 / FU2): role-gated UI like the Become Host CTA
    // would break because `user.role` reads undefined on the wrapper.
    // After verify-otp, `login()` already passes the inner user, so
    // this getMe() path was the only DD3 source.
    return api.get('/auth/me').then((r) => {
      const d = r.data as any;
      return (d?.user ?? d) as User;
    });
  },

  updateProfile(data: Partial<User>) {
    return api.put<User>('/auth/profile', data).then((r) => r.data);
  },

  // Route still uses /auth/wishlist/:id but the id is now a unit ID (wishlist is unit-based).
  toggleWishlist(unitId: string) {
    return api.post<{ wishlist: string[] }>(`/auth/wishlist/${unitId}`).then((r) => r.data);
  },

  deleteAccount() {
    return api.delete<{ message: string }>('/auth/account').then((r) => r.data);
  },
};
