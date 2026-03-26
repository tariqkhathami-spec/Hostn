import api from './api';
import type { Conversation, Message, PaginatedResponse, ApiResponse } from '../types';

export const messageService = {
  async getConversations(page: number = 1) {
    const { data } = await api.get<PaginatedResponse<Conversation>>('/messages/conversations', {
      params: { page },
    });
    return data;
  },

  async createConversation(recipientId: string, propertyId?: string, bookingId?: string) {
    const { data } = await api.post<ApiResponse<Conversation>>('/messages/conversations', {
      recipientId,
      propertyId,
      bookingId,
    });
    return data.data!;
  },

  async getMessages(conversationId: string, page: number = 1) {
    const { data } = await api.get<PaginatedResponse<Message>>(
      `/messages/conversations/${conversationId}`,
      { params: { page } }
    );
    return data;
  },

  async sendMessage(conversationId: string, content: string) {
    const { data } = await api.post<ApiResponse<Message>>(
      `/messages/conversations/${conversationId}/messages`,
      { content }
    );
    return data.data!;
  },

  async getUnreadCount() {
    const { data } = await api.get<{ success: boolean; unreadCount: number }>('/messages/unread-count');
    return data.unreadCount;
  },

  async blockConversation(conversationId: string) {
    const { data } = await api.put(`/messages/conversations/${conversationId}/block`);
    return data;
  },
};
