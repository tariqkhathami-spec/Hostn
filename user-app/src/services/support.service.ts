import api from './api';
import type { SupportTicket } from '../types';

export const supportService = {
  getTickets() {
    return api.get<SupportTicket[]>('/support').then((r) => r.data);
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
