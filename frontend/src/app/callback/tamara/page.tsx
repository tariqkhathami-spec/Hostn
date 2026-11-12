'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { bnplApi } from '@/lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

function TamaraCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'cancelled'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const bookingId = searchParams.get('booking');
  const callbackStatus = searchParams.get('status');

  useEffect(() => {
    if (callbackStatus === 'cancel') {
      setStatus('cancelled');
      return;
    }

    if (callbackStatus === 'failure') {
      setStatus('failed');
      setErrorMessage(isAr ? 'لم تتم الموافقة على الدفع عبر تمارا' : 'Tamara payment was not approved');
      return;
    }

    if (callbackStatus === 'success' && bookingId) {
      verifyPayment();
    } else {
      setStatus('failed');
      setErrorMessage(isAr ? 'بيانات غير صالحة' : 'Invalid callback data');
    }
  }, [callbackStatus, bookingId]);

  const verifyPayment = async () => {
    try {
      const paymentId = localStorage.getItem(`hostn_bnpl_payment_${bookingId}`);
      if (!paymentId) {
        setStatus('failed');
        setErrorMessage(isAr ? 'لم يتم العثور على بيانات الدفع' : 'Payment data not found');
        return;
      }

      const res = await bnplApi.verifyTamaraPayment({ paymentId });
      if (res.data.success) {
        setStatus('success');
        localStorage.removeItem(`hostn_bnpl_payment_${bookingId}`);
        localStorage.removeItem(`hostn_bnpl_provider_${bookingId}`);
      } else {
        setStatus('failed');
        setErrorMessage(res.data.message || (isAr ? 'فشل التحقق من الدفع' : 'Payment verification failed'));
      }
    } catch (error: unknown) {
      setStatus('failed');
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorMessage(msg || (isAr ? 'فشل التحقق من الدفع' : 'Payment verification failed'));
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-2xl p-8 shadow-card text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {isAr ? 'جاري التحقق من الدفع...' : 'Verifying payment...'}
                </h1>
                <p className="text-gray-500">
                  {isAr ? 'يرجى الانتظار بينما نتحقق من دفعتك عبر تمارا' : 'Please wait while we verify your Tamara payment'}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {isAr ? 'تم تأكيد الدفع!' : 'Payment Confirmed!'}
                </h1>
                <p className="text-gray-500 mb-2">
                  {isAr ? 'تمت الموافقة على دفعتك عبر تمارا بنجاح' : 'Your Tamara installment payment has been approved'}
                </p>
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium mb-6">
                  <span>tamara</span>
                  <span>{isAr ? '4 أقساط بدون رسوم تأخير' : '4 installments, no late fees'}</span>
                </div>
                <Button onClick={() => router.push('/dashboard/bookings')} size="lg" className="w-full">
                  {isAr ? 'عرض حجوزاتي' : 'View My Bookings'}
                </Button>
              </>
            )}

            {status === 'failed' && (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {isAr ? 'فشل الدفع' : 'Payment Failed'}
                </h1>
                <p className="text-gray-500 mb-6">{errorMessage}</p>
                <div className="space-y-3">
                  <Button onClick={() => router.push(`/booking/${bookingId}`)} size="lg" className="w-full">
                    {isAr ? 'حاول مرة أخرى' : 'Try Again'}
                  </Button>
                  <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-700">
                    {isAr ? 'العودة للرئيسية' : 'Back to Home'}
                  </button>
                </div>
              </>
            )}

            {status === 'cancelled' && (
              <>
                <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {isAr ? 'تم إلغاء الدفع' : 'Payment Cancelled'}
                </h1>
                <p className="text-gray-500 mb-6">
                  {isAr ? 'تم إلغاء عملية الدفع. يمكنك المحاولة مرة أخرى.' : 'Payment was cancelled. You can try again.'}
                </p>
                <Button onClick={() => router.push(`/booking/${bookingId}`)} size="lg" className="w-full">
                  {isAr ? 'العودة للحجز' : 'Back to Booking'}
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function TamaraCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <TamaraCallbackContent />
    </Suspense>
  );
}
