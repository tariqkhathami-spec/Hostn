'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { paymentsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

function PaymentCallbackContent() {
  const { id: bookingId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    verifyPayment();
  }, [isAuthenticated]);

  const verifyPayment = async () => {
    const moyasarPaymentId = searchParams.get('id');
    const moyasarStatus = searchParams.get('status');

    // Get our internal payment ID from localStorage (stored during initiation)
    const storedPaymentId = localStorage.getItem(`hostn_payment_${bookingId}`);

    if (!moyasarPaymentId || !storedPaymentId) {
      setStatus('failed');
      setMessage('Payment information is missing. Please contact support.');
      return;
    }

    try {
      const res = await paymentsApi.verify({
        paymentId: storedPaymentId,
        moyasarPaymentId,
      });

      if (res.data.success && res.data.payment?.status === 'paid') {
        setStatus('success');
        setMessage('Your booking has been confirmed!');
        localStorage.removeItem(`hostn_payment_${bookingId}`);
      } else {
        setStatus('failed');
        setMessage(res.data.message || 'Payment could not be verified. Please try again.');
      }
    } catch (error: any) {
      setStatus('failed');
      setMessage(error?.response?.data?.message || 'Payment verification failed. Please contact support.');
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl p-8 shadow-card text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="w-16 h-16 text-primary-500 mx-auto mb-4 animate-spin" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
                <p className="text-gray-500">Please wait while we confirm your payment...</p>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                <p className="text-gray-500 mb-6">{message}</p>
                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button size="lg" className="w-full">View My Bookings</Button>
                  </Link>
                  <Link href="/listings">
                    <Button variant="outline" size="lg" className="w-full">Browse More Properties</Button>
                  </Link>
                </div>
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                <p className="text-gray-500 mb-6">{message}</p>
                <div className="space-y-3">
                  <Button onClick={() => router.back()} size="lg" className="w-full">Try Again</Button>
                  <Link href="/dashboard">
                    <Button variant="outline" size="lg" className="w-full">Go to Dashboard</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
