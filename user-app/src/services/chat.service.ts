import api from './api';
import type { Conversation, Message } from '../types';

export const chatService = {
  getConversations() {
    return api.get<Conversation[]>('/messages/conversations').then((r) => r.data);
  },

  getMessages(conversationId: string, page = 1) {
    return api
      .get<Message[]>(`/messages/${conversationId}`, { params: { page, limit: 30 } })
      .then((r) => r.data);
  },

  sendMessage(conversationId: string, text: string) {
    return api
      .post<Message>('/messages', { conversation: conversationId, text })
      .then((r) => r.data);
  },

  createConversation(hostId: string, propertyId?: string) {
    return api
      .post<Conversation>('/messages/conversations', {
        participantId: hostId,
        property: propertyId,
      })
      .then((r) => r.data);
  },
};
