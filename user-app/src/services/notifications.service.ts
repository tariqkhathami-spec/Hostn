import api from './api';
import type { Notification } from '../types';

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
    return api.post('/notifications/device-token', { pushToken: token }).then((r) => r.data);
  },
};
