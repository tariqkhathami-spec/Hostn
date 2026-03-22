export interface CreatePaymentParams {
  amount: number; // in SAR
  currency: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentVerificationResult {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded' | 'voided';
  amount: number; // in smallest unit (halalas)
  amountInSar: number; // converted back
  currency: string;
  fee: number;
  source?: {
    type: string;
    company?: string; // visa, mastercard, mada
    name?: string;
    number?: string; // masked card number
    message?: string;
    gatewayId?: string;
  };
  description: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProvider {
  name: string;
  createPaymentConfig(params: CreatePaymentParams): {
    publishableKey: string;
    amount: number;
    currency: string;
    description: string;
    callbackUrl: string;
    metadata?: Record<string, string>;
  };
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  refundPayment(paymentId: string, amount?: number): Promise<PaymentVerificationResult>;
}
