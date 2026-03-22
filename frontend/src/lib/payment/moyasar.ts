import { PaymentProvider, CreatePaymentParams, PaymentVerificationResult } from './provider';

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;
const MOYASAR_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY;
const MOYASAR_API_URL = 'https://api.moyasar.com/v1';

class MoyasarProvider implements PaymentProvider {
  name = 'moyasar';

  createPaymentConfig(params: CreatePaymentParams) {
    if (!MOYASAR_PUBLISHABLE_KEY) {
      throw new Error('NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY is not configured');
    }
    // Convert SAR to halalas (smallest unit)
    const amountInHalalas = Math.round(params.amount * 100);
    return {
      publishableKey: MOYASAR_PUBLISHABLE_KEY,
      amount: amountInHalalas,
      currency: params.currency || 'SAR',
      description: params.description,
      callbackUrl: params.callbackUrl,
      metadata: params.metadata,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    if (!MOYASAR_SECRET_KEY) {
      throw new Error('MOYASAR_SECRET_KEY is not configured');
    }
    const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64')}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Moyasar verification failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return this.mapResponse(data);
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentVerificationResult> {
    if (!MOYASAR_SECRET_KEY) {
      throw new Error('MOYASAR_SECRET_KEY is not configured');
    }
    const body: Record<string, number> = {};
    if (amount !== undefined) {
      body.amount = Math.round(amount * 100); // Convert SAR to halalas
    }
    const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Moyasar refund failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return this.mapResponse(data);
  }

  private mapResponse(data: any): PaymentVerificationResult {
    return {
      id: data.id,
      status: data.status,
      amount: data.amount,
      amountInSar: data.amount / 100,
      currency: data.currency,
      fee: data.fee || 0,
      source: data.source
        ? {
            type: data.source.type,
            company: data.source.company,
            name: data.source.name,
            number: data.source.number,
            message: data.source.message,
            gatewayId: data.source.gateway_id,
          }
        : undefined,
      description: data.description,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const moyasarProvider = new MoyasarProvider();
export default moyasarProvider;
