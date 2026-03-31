import api from './api';

export const couponsService = {
  validate(code: string, bookingAmount: number) {
    return api
      .post<{ valid: boolean; discount: number; type: string }>('/coupons/validate', {
        code,
        amount: bookingAmount,
      })
      .then((r) => r.data);
  },
};
