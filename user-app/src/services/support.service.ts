import api from './api';
import type { SupportTicket } from '../types';

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
      return Array.isArray(d) ? d : (d?.data ?? []);
    });
  },

  getTicket(id: string) {
    return api.get<SupportTicket>(`/support/${id}`).then((r) => r.data);
  },

  createTicket(data: {
    subject: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    message: string;
  }) {
    return api.post<SupportTicket>('/support', data).then((r) => r.data);
  },

  replyToTicket(id: string, message: string) {
    return api.post<SupportTicket>(`/support/${id}/reply`, { message }).then((r) => r.data);
  },
};
