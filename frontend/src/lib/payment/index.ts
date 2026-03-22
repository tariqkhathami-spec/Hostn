import { PaymentProvider } from './provider';
import moyasarProvider from './moyasar';

const providers: Record<string, PaymentProvider> = {
  moyasar: moyasarProvider,
};

export function getPaymentProvider(name: string = 'moyasar'): PaymentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown payment provider: ${name}`);
  }
  return provider;
}

export { moyasarProvider };
export type { PaymentProvider, CreatePaymentParams, PaymentVerificationResult } from './provider';
