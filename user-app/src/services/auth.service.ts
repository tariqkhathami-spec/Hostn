import api from './api';
import type { User } from '../types';
import { getCurrentLanguage } from '../i18n/current';

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
        // Language of the SMS / WhatsApp text.
        lang: getCurrentLanguage(),
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

  // PUT /auth/profile reads { name, phone, avatar, email } and answers
  // { success, user } (no `data` key, so it is not unwrapped). When `email` is
  // sent the server only starts the email-change flow and answers
  // { success, message } with NO user: `user` is then undefined.
  updateProfile(data: { name?: string; avatar?: string; email?: string; emailVerificationCode?: string }) {
    return api.put('/auth/profile', data).then((r) => {
      const d = r.data as any;
      const user = (d?.user ?? (d?._id ? d : undefined)) as User | undefined;
      return { user, verificationRequired: !user };
    });
  },

  // Route still uses /auth/wishlist/:id but the id is now a unit ID (wishlist is unit-based).
  toggleWishlist(unitId: string) {
    // Answers { success, wishlist } — the unit ids of the default list.
    return api
      .post<{ wishlist: string[] }>(`/auth/wishlist/${unitId}`)
      .then((r) => ({ wishlist: ((r.data as any)?.wishlist ?? []).map(String) as string[] }));
  },

  // The server asks for a one-time code (or the password) before deleting.
  deleteAccount(confirm?: { otp?: string; password?: string }) {
    return api.delete<{ message: string }>('/auth/account', { data: confirm ?? {} }).then((r) => r.data);
  },
};
