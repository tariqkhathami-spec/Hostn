import api from './api';

export interface CouponValidation {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
}

export const couponsService = {
  validate(code: string, bookingAmount: number) {
    return api
      .post<CouponValidation>('/coupons/validate', { code, bookingAmount })
      .then((r) => r.data);
  },
};
