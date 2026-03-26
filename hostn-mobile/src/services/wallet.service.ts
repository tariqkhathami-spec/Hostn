import api from './api';
import type { WalletBalance, WalletTransaction, PaginatedResponse, ApiResponse } from '../types';

export const walletService = {
  async getBalance() {
    const { data } = await api.get<ApiResponse<WalletBalance>>('/wallet/balance');
    return data.data!;
  },

  async getTransactions(page: number = 1) {
    const { data } = await api.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', {
      params: { page },
    });
    return data;
  },
};
