import api from './api';
import type { Notification, PaginatedResponse } from '../types';

export const notificationService = {
  async getAll(page: number = 1) {
    const { data } = await api.get<PaginatedResponse<Notification>>('/notifications', {
      params: { page },
    });
    return data;
  },

  async markAsRead(id: string) {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead() {
    await api.put('/notifications/read-all');
  },

  async getUnreadCount() {
    const { data } = await api.get<{ success: boolean; unreadCount: number }>('/notifications/unread-count');
    return data.unreadCount;
  },
};
