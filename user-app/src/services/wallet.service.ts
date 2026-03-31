import api from './api';
import type { WalletInfo, WalletTransaction } from '../types';

export const walletService = {
  getBalance() {
    return api.get<WalletInfo>('/wallet').then((r) => r.data);
  },

  getTransactions(page = 1) {
    return api
      .get<WalletTransaction[]>('/wallet/transactions', { params: { page, limit: 20 } })
      .then((r) => r.data);
  },
};
