import api from './api';
import type { Conversation, Message } from '../types';

export const chatService = {
  getConversations() {
    return api.get('/messages/conversations').then((r) => {
      const d = r.data as any;
      return (d.data ?? d) as Conversation[];
    });
  },

  getMessages(conversationId: string, page = 1) {
    return api
      .get(`/messages/conversations/${conversationId}/messages`, { params: { page, limit: 30 } })
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as Message[];
      });
  },

  sendMessage(conversationId: string, text: string) {
    return api
      .post(`/messages/conversations/${conversationId}/messages`, { content: text })
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as Message;
      });
  },

  createConversation(recipientId: string, propertyId?: string) {
    return api
      .post('/messages/conversations', {
        recipientId,
        propertyId,
      })
      .then((r) => {
        const d = r.data as any;
        return (d.data ?? d) as Conversation;
      });
  },

  blockConversation(conversationId: string) {
    return api
      .put(`/messages/conversations/${conversationId}/block`)
      .then((r) => r.data);
  },

  reportUser(data: { reportedUser: string; reason: string; details?: string }) {
    return api.post('/reports', data).then((r) => r.data);
  },
};
