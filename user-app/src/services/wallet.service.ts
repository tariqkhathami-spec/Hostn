import api from './api';
import type { WalletInfo, WalletTransaction } from '../types';

export const walletService = {
  getBalance() {
    return api.get<WalletInfo>('/wallet/balance').then((r) => r.data);
  },

  getTransactions(page = 1): Promise<WalletTransaction[]> {
    // /wallet/transactions is paginated. The api.ts response interceptor
    // preserves the {data, pagination} wrapper for paginated responses,
    // so this service has to unwrap explicitly. Without this, real
    // transactions are silently hidden — `transactions.length` is
    // undefined on the wrapper, the screen renders the empty state, and
    // no transaction history is ever shown to the user.
    return api
      .get('/wallet/transactions', { params: { page, limit: 20 } })
      .then((r) => {
        const d = r.data as any;
        return Array.isArray(d) ? d : (d?.data ?? []);
      });
  },
};
