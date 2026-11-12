import api from './api';
import type { SupportTicket } from '../types';

// The API stores each message as { content, senderRole: 'user' | 'admin' };
// the screens read { text, sender }. Without this mapping every bubble was
// empty and every message was labelled as coming from the support team.
function toMessage(raw: any) {
  const role = raw?.senderRole || (typeof raw?.sender === 'string' ? raw.sender : undefined);
  const staff = role === 'admin' || raw?.senderType === 'Admin';
  return {
    _id: String(raw?._id ?? ''),
    sender: staff ? 'admin' : 'user',
    text: String(raw?.content ?? raw?.text ?? raw?.message ?? ''),
    createdAt: raw?.createdAt,
  } as SupportTicket['messages'][number];
}

function toTicket(raw: any): SupportTicket {
  return { ...raw, messages: Array.isArray(raw?.messages) ? raw.messages.map(toMessage) : [] } as SupportTicket;
}

export const supportService = {
  getTickets(): Promise<SupportTicket[]> {
    // /support is paginated. The api.ts response interceptor preserves
    // the {data, pagination} wrapper for paginated responses, so this
    // service has to unwrap explicitly. Without this, the consumer
    // calling tickets.filter(...) would crash with "filter is not a
    // function" on the wrapper object as soon as the user has any
    // tickets (or interacts with the filter chips).
    return api.get('/support').then((r) => {
      const d = r.data as any;
      const list = Array.isArray(d) ? d : (d?.data ?? []);
      return list.map(toTicket);
    });
  },

  getTicket(id: string) {
    return api.get<SupportTicket>(`/support/${id}`).then((r) => toTicket(r.data));
  },

  createTicket(data: {
    subject: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    message: string;
  }) {
    return api.post<SupportTicket>('/support', data).then((r) => toTicket(r.data));
  },

  replyToTicket(id: string, message: string) {
    return api.post<SupportTicket>(`/support/${id}/reply`, { message }).then((r) => toTicket(r.data));
  },
};
