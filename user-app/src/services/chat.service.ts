import api from './api';
import type { Conversation, Message } from '../types';

// The API returns participants as { user, userType }, messages with a
// populated sender and `content`, and lastMessage as { content, timestamp }.
// The screens read the flat shapes in ../types, so convert here. Without
// this the list showed "deleted user" / "No messages yet" and the thread
// could not tell whose message was whose.
const toMessage = (m: any): Message => ({
  ...m,
  _id: String(m?._id ?? ''),
  conversation: String(m?.conversation ?? ''),
  sender: typeof m?.sender === 'object' && m?.sender ? String(m.sender._id) : String(m?.sender ?? ''),
  text: m?.text ?? m?.content ?? '',
  read: Boolean(m?.read ?? (Array.isArray(m?.readBy) && m.readBy.length > 1)),
  createdAt: m?.createdAt ?? m?.timestamp ?? '',
});

const toConversation = (c: any): Conversation => ({
  ...c,
  participants: (c?.participants ?? []).map((p: any) => (p?.user && typeof p.user === 'object' ? { ...p.user, userType: p.userType } : p)),
  lastMessage: c?.lastMessage && (c.lastMessage.content || c.lastMessage.text)
    ? toMessage({ ...c.lastMessage, _id: c.lastMessage._id ?? `${c._id}-last`, conversation: c._id })
    : undefined,
  unreadCount: c?.unreadCount ?? 0,
});

export const chatService = {
  getConversations() {
    return api.get('/messages/conversations').then((r) => {
      const d = r.data as any;
      return ((d.data ?? d) as any[]).map(toConversation);
    });
  },

  getMessages(conversationId: string, page = 1) {
    return api
      // The thread is served at /messages/conversations/:id (no /messages suffix).
      .get(`/messages/conversations/${conversationId}`, { params: { page, limit: 30 } })
      .then((r) => {
        const d = r.data as any;
        return ((d.data ?? d) as any[]).map(toMessage);
      });
  },

  sendMessage(conversationId: string, text: string) {
    return api
      .post(`/messages/conversations/${conversationId}/messages`, { content: text })
      .then((r) => {
        const d = r.data as any;
        return toMessage(d.data ?? d);
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
        return toConversation(d.data ?? d);
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
