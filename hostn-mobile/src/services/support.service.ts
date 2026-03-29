import api from './api';

export const supportService = {
  async createTicket(subject: string, message: string, category: string = 'technical') {
    const { data } = await api.post('/support', {
      subject,
      category,
      priority: 'medium',
      messages: [{ content: message }],
    });
    return data;
  },

  async getMyTickets() {
    const { data } = await api.get('/support/my-tickets');
    return data;
  },

  async getTicket(id: string) {
    const { data } = await api.get(`/support/${id}`);
    return data;
  },

  async replyToTicket(id: string, content: string) {
    const { data } = await api.post(`/support/${id}/reply`, { content });
    return data;
  },
};
