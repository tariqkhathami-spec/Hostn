import { Platform } from 'react-native';
import api from './api';
import type { Notification } from '../types';

// The Expo push token this install last registered, kept so sign-out can
// remove it from the account (see unregisterPushToken).
let lastPushToken: string | null = null;

export const notificationsService = {
  getAll(): Promise<Notification[]> {
    // The /notifications endpoint is paginated, so the api response
    // interceptor preserves the {data, pagination} wrapper instead of
    // unwrapping to the array. Tolerate both shapes here so the screen
    // always sees Notification[].
    return api.get('/notifications').then((r) => {
      const d = r.data as any;
      return Array.isArray(d) ? d : (d?.data ?? []);
    });
  },

  markAsRead(id: string) {
    return api.put(`/notifications/${id}/read`).then((r) => r.data);
  },

  registerPushToken(token: string) {
    return api.post('/notifications/device-token', { token, platform: Platform.OS }).then((r) => {
      lastPushToken = token;
      return r.data;
    });
  },

  // Called on sign-out, while the session is still valid, so this phone stops
  // receiving the account's notifications. Never throws: signing out must not
  // depend on it (offline, expired session).
  async unregisterPushToken(): Promise<void> {
    const token = lastPushToken;
    if (!token) return;
    lastPushToken = null;
    try {
      await api.delete('/notifications/device-token', { data: { token }, timeout: 5000 });
    } catch {
      // Ignored on purpose.
    }
  },
};
