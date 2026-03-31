import api from './api';
import type { Notification } from '../types';

export const notificationsService = {
  getAll() {
    return api.get<Notification[]>('/notifications').then((r) => r.data);
  },

  markAsRead(id: string) {
    return api.put(`/notifications/${id}/read`).then((r) => r.data);
  },

  registerPushToken(token: string) {
    return api.post('/notifications/register-token', { pushToken: token }).then((r) => r.data);
  },
};
