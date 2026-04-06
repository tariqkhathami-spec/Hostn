'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Property } from '@/types';
import { propertiesApi, bookingsApi, paymentsApi, bnplApi } from '@/lib/api';
import { formatPrice, formatPriceNumber, formatDate, calculateNights, getNightLabel } from '@/lib/utils';
import SarSymbol from '@/components/ui/SarSymbol';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CalendarDays, Users, CreditCard, Shield, ChevronRight, Lock, CheckCircle, Loader2, Clock, Banknote } from 'lucide-react';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getSearchCookies } from '@/lib/searchCookies';

declare global {
  interface Window {
    Moyasar?: {
      init: (config: any) => void;
    };
  }
}

function BookingContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'tabby' | 'tamara'>('card');

  const isAr = language === 'ar';

  // Read booking details from cookies
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const guestsCount = adultsCount + childrenCount;

  useEffect(() => {
    const saved = getSearchCookies();
    if (saved) {
      if (saved.checkIn) setCheckIn(saved.checkIn);
      if (saved.checkOut) setCheckOut(saved.checkOut);
      if (saved.adults) setAdultsCount(saved.adults);
      if (saved.children) setChildrenCount(saved.children);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/booking/${id}`);
      return;
    }
    fetchProperty();
  }, [id, isAuthenticated]);

  // Load Moyasar form when moving to step 2
  useEffect(() => {
    if (step === 2 && paymentConfig) {
      loadMoyasarForm();
    }
  }, [step, paymentConfig]);

  const fetchProperty = async () => {
    try {
      const res = await propertiesApi.getOne(id);
      setProperty(res.data.data);
    } catch {
      router.push('/listings');
    } finally {
      setLoading(false);
    }
  };

  const loadMoyasarForm = () => {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
    script.async = true;
    script.onload = () => {
      if (window.Moyasar) {
        window.Moyasar.init({
          element: '.mysr-form',
          amount: paymentConfig.amount,
          currency: paymentConfig.currency,
          description: paymentConfig.description,
          publishable_api_key: paymentConfig.publishableKey,
          callback_url: paymentConfig.callbackUrl,
          methods: ['creditcard'],
          supported_networks: ['visa', 'mastercard', 'mada'],
          metadata: paymentConfig.metadata,
          on_completed: function(payment: any) {
            console.log('Payment completed:', payment.id);
          },
        });
      }
    };
    document.head.appendChild(script);
  };

  const handleContinueToPayment = async () => {
    if (!checkIn || !checkOut) {
      toast.error(isAr ? 'يرجى تحديد التواريخ' : 'Missing dates');
      return;
    }

    setProcessing(true);
    try {
      // Step 1: Create booking
      const bookingRes = await bookingsApi.create({
        propertyId: id,
        checkIn,
        checkOut,
        guests: { adults: adultsCount, children: childrenCount, infants: 0 },
        specialRequests,
      });

      const newBookingId = bookingRes.data.data._id;
      setBookingId(newBookingId);

      if (paymentMethod === 'tabby' || paymentMethod === 'tamara') {
        // BNPL flow — redirect to Tabby/Tamara checkout
        const bnplRes = paymentMethod === 'tabby'
          ? await bnplApi.createTabbyCheckout({ bookingId: newBookingId })
          : await bnplApi.createTamaraCheckout({ bookingId: newBookingId });

        const data = bnplRes.data.data;
        const redirectUrl = data.redirectUrl || data.checkoutUrl;

        // Store payment ID for verification after callback
        localStorage.setItem(`hostn_bnpl_payment_${newBookingId}`, data.paymentId);
        localStorage.setItem(`hostn_bnpl_provider_${newBookingId}`, paymentMethod);

        toast.success(isAr ? 'جاري التحويل للدفع بالأقساط...' : 'Redirecting to installment payment...');

        // Redirect to provider checkout
        window.location.href = redirectUrl;
      } else {
        // Card flow — Moyasar
        const paymentRes = await paymentsApi.initiate({
          bookingId: newBookingId,
        });

        const config = paymentRes.data.paymentConfig;
        setPaymentConfig(config);

        // Store payment ID in localStorage for verification later
        localStorage.setItem(`hostn_payment_${newBookingId}`, paymentRes.data.paymentId);

        // Move to payment step
        setStep(2);
        toast.success(isAr ? 'تم إنشاء الحجز. يرجى إتمام الدفع.' : 'Booking created. Please complete payment.');
      }
    } catch (error: unknown) {
      const errData = (error as { response?: { data?: { code?: string; message?: string; params?: Record<string, number> } } })?.response?.data;
      const errorMessages: Record<string, { en: string; ar: string }> = {
        INVALID_DATES: { en: 'Invalid date format', ar: 'صيغة التاريخ غير صالحة' },
        CHECKOUT_BEFORE_CHECKIN: { en: 'Check-out must be after check-in', ar: 'يجب أن يكون تاريخ المغادرة بعد تاريخ الوصول' },
        CHECKIN_IN_PAST: { en: 'Check-in date cannot be in the past', ar: 'لا يمكن أن يكون تاريخ الوصول في الماضي' },
        PROPERTY_NOT_FOUND: { en: 'Property not found', ar: 'العقار غير موجود' },
        OWN_PROPERTY: { en: 'Cannot book your own property', ar: 'لا يمكنك حجز عقارك الخاص' },
        NO_ADULTS: { en: 'At least one adult guest required', ar: 'مطلوب ضيف بالغ واحد على الأقل' },
        MAX_CAPACITY: { en: `Exceeds max capacity of ${errData?.params?.max || ''} guests`, ar: `يتجاوز الحد الأقصى ${errData?.params?.max || ''} ضيوف` },
        DATES_BLOCKED: { en: 'Property is blocked for selected dates', ar: 'العقار محجوب للتواريخ المحددة' },
        MIN_STAY: { en: `Minimum stay is ${errData?.params?.min || ''} nights`, ar: `الحد الأدنى للإقامة ${errData?.params?.min || ''} ليالي` },
        MAX_STAY: { en: `Maximum stay is ${errData?.params?.max || ''} nights`, ar: `الحد الأقصى للإقامة ${errData?.params?.max || ''} ليالي` },
        DATES_UNAVAILABLE: { en: 'Property not available for selected dates', ar: 'العقار غير متاح للتواريخ المحددة' },
      };
      const mapped = errData?.code ? errorMessages[errData.code] : null;
      if (mapped) {
        toast.error(isAr ? mapped.ar : mapped.en);
      } else if (errData?.message) {
        toast.error(isAr ? 'فشل إنشاء الحجز. حاول مرة أخرى.' : errData.message);
      } else {
        toast.error(isAr ? 'فشل إنشاء الحجز. حاول مرة أخرى.' : 'Failed to create booking. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !property) {
    return (
      <>
        <Header />
        <main className="container-custom py-12">
          <div className="max-w-2xl mx-auto animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded-2xl" />
            <div className="h-60 bg-gray-100 rounded-2xl" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  // Always use original perNight; discount is a separate line item
  const pricePerNight = property.pricing.perNight;
  const subtotal = nights * pricePerNight;
  const cleaningFee = property.pricing.cleaningFee || 0;
  const serviceFee = Math.round(subtotal * 0.1);
  const discount = property.pricing.discountPercent > 0
    ? Math.round(subtotal * (property.pricing.discountPercent / 100))
    : 0;
  // Saudi Arabia 15% VAT — applied on taxable amount (after discount)
  const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
  const vat = Math.round(taxableAmount * 0.15);
  const total = taxableAmount + vat;

  const primaryImage = property.images.find((i) => i.isPrimary)?.url || property.images[0]?.url;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="container-custom py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back to property link */}
            {step === 1 && (
              <Link href={`/listings/${id}?${new URLSearchParams({ ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}), ...(adultsCount > 0 ? { adults: String(adultsCount) } : {}), ...(childrenCount > 0 ? { children: String(childrenCount) } : {}) }).toString()}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
                <ChevronRight className="w-4 h-4 ltr:rotate-180" />
                {isAr ? 'العودة للعقار' : 'Back to property'}
              </Link>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {step === 1 && (isAr ? 'مراجعة الحجز' : 'Review your booking')}
              {step === 2 && (isAr ? 'إتمام الدفع' : 'Complete payment')}
              {step === 3 && (isAr ? 'جاري المعالجة' : 'Processing')}
            </h1>

            {/* Steps */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step > s ? 'bg-green-500 text-white' : step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-sm font-medium ${step >= s ? step > s ? 'text-green-600' : 'text-primary-600' : 'text-gray-400'}`}>
                    {s === 1 ? (isAr ? 'المراجعة' : 'Review') : s === 2 ? (isAr ? 'الدفع' : 'Payment') : (isAr ? 'التأكيد' : 'Confirmation')}
                  </span>
                  {s < 3 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left: Step Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Step 1: Review */}
                {step === 1 && (
                  <>
                    {/* Trip details */}
                    <div className="bg-white rounded-2xl p-6 shadow-card">
                      <h2 className="font-bold text-gray-900 text-lg mb-4">
                        {isAr ? 'تفاصيل الرحلة' : 'Trip details'}
                      </h2>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <CalendarDays className="w-5 h-5 text-primary-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{isAr ? 'التواريخ' : 'Dates'}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(checkIn)} – {formatDate(checkOut)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">
                              {getNightLabel(nights, isAr ? 'ar' : 'en')}
                            </span>
                            <Link
                              href={`/listings/${id}?${new URLSearchParams({ ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}), ...(adultsCount > 0 ? { adults: String(adultsCount) } : {}), ...(childrenCount > 0 ? { children: String(childrenCount) } : {}) }).toString()}`}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 underline"
                            >
                              {isAr ? 'تعديل' : 'Edit'}
                            </Link>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-primary-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{isAr ? 'الضيوف' : 'Guests'}</p>
                              <p className="text-xs text-gray-500">
                                {isAr ? `حتى ${property.capacity.maxGuests} ضيف مسموح` : `Up to ${property.capacity.maxGuests} allowed`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">
                              {isAr
                                ? `${adultsCount} ${adultsCount === 1 ? 'بالغ' : 'بالغين'}${childrenCount > 0 ? `، ${childrenCount} ${childrenCount === 1 ? 'طفل' : 'أطفال'}` : ''}`
                                : `${adultsCount} ${adultsCount === 1 ? 'adult' : 'adults'}${childrenCount > 0 ? `, ${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}` : ''}`}
                            </span>
                            <Link
                              href={`/listings/${id}?${new URLSearchParams({ ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}), ...(adultsCount > 0 ? { adults: String(adultsCount) } : {}), ...(childrenCount > 0 ? { children: String(childrenCount) } : {}) }).toString()}`}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 underline"
                            >
                              {isAr ? 'تعديل' : 'Edit'}
                            </Link>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-3">
                          <Shield className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {isAr ? 'إلغاء مجاني' : 'Free cancellation'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isAr ? 'ألغِ قبل تاريخ الوصول واسترد المبلغ كاملاً' : 'Cancel before check-in for a full refund'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special requests */}
                    <div className="bg-white rounded-2xl p-6 shadow-card">
                      <h2 className="font-bold text-gray-900 text-lg mb-3">
                        {isAr ? 'طلبات خاصة (اختياري)' : 'Special requests (optional)'}
                      </h2>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder={isAr ? 'أي طلبات أو ملاحظات للمضيف؟' : 'Any special requests or notes for the host?'}
                        rows={3}
                        className="input-base resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-400 mt-1.5 ltr:text-right rtl:text-left">{specialRequests.length}/500</p>
                    </div>

                    {/* Guest info */}
                    <div className="bg-white rounded-2xl p-6 shadow-card">
                      <h2 className="font-bold text-gray-900 text-lg mb-4">
                        {isAr ? 'معلومات الضيف' : 'Guest information'}
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-bold text-lg">
                            {user?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user?.name}</p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment method selection */}
                    <div className="bg-white rounded-2xl p-6 shadow-card">
                      <h2 className="font-bold text-gray-900 text-lg mb-4">
                        {isAr ? 'طريقة الدفع' : 'Payment method'}
                      </h2>
                      <div className="space-y-3">
                        {/* Credit/Debit Card */}
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === 'card'
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === 'card' ? 'border-primary-500' : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'card' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                            )}
                          </div>
                          <CreditCard className="w-5 h-5 text-gray-600" />
                          <div className="flex-1 text-left rtl:text-right">
                            <p className="text-sm font-semibold text-gray-800">
                              {isAr ? 'بطاقة ائتمان / مدى' : 'Credit Card / mada'}
                            </p>
                            <p className="text-xs text-gray-500">Visa, Mastercard, mada</p>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">VISA</span>
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded">MC</span>
                            <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded">mada</span>
                          </div>
                        </button>

                        {/* Tabby — 4 installments */}
                        {total > 0 && total <= 5000 && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('tabby')}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                              paymentMethod === 'tabby'
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              paymentMethod === 'tabby' ? 'border-purple-500' : 'border-gray-300'
                            }`}>
                              {paymentMethod === 'tabby' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                              )}
                            </div>
                            <Banknote className="w-5 h-5 text-purple-600" />
                            <div className="flex-1 text-left rtl:text-right">
                              <p className="text-sm font-semibold text-gray-800">
                                {isAr ? 'تابي — قسّمها على 4' : 'Tabby — Split in 4'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isAr
                                  ? `4 دفعات × ${formatPrice(Math.ceil((total / 4) * 100) / 100)} بدون فوائد`
                                  : `4 × ${formatPrice(Math.ceil((total / 4) * 100) / 100)} interest-free`
                                }
                              </p>
                            </div>
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-lg">tabby</span>
                          </button>
                        )}

                        {/* Tamara — 4 installments */}
                        {total > 0 && total <= 5000 && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('tamara')}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                              paymentMethod === 'tamara'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              paymentMethod === 'tamara' ? 'border-blue-500' : 'border-gray-300'
                            }`}>
                              {paymentMethod === 'tamara' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div className="flex-1 text-left rtl:text-right">
                              <p className="text-sm font-semibold text-gray-800">
                                {isAr ? 'تمارا — قسّمها على 4' : 'Tamara — Split in 4'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isAr
                                  ? `4 دفعات × ${formatPrice(Math.ceil((total / 4) * 100) / 100)} بدون رسوم تأخير`
                                  : `4 × ${formatPrice(Math.ceil((total / 4) * 100) / 100)} no late fees`
                                }
                              </p>
                            </div>
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg">tamara</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2: Payment Form */}
                {step === 2 && paymentConfig && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                      <Lock className="w-5 h-5 text-green-500" />
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg">
                          {isAr ? 'دفع آمن' : 'Secure Payment'}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {isAr ? 'بيانات بطاقتك محمية ومشفرة' : 'Your card information is secure and encrypted'}
                        </p>
                      </div>
                    </div>

                    {/* Payment logos */}
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 mb-3">{isAr ? 'نقبل' : 'We accept'}</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-blue-50 rounded flex items-center justify-center text-xs font-bold text-blue-600">VISA</div>
                        <div className="w-12 h-8 bg-red-50 rounded flex items-center justify-center text-xs font-bold text-red-600">MC</div>
                        <div className="w-12 h-8 bg-yellow-50 rounded flex items-center justify-center text-xs font-bold text-yellow-600">mada</div>
                      </div>
                    </div>

                    {/* Moyasar Form */}
                    <div className="mysr-form" />
                  </div>
                )}

                {/* Step 3: Processing */}
                {step === 3 && (
                  <div className="bg-white rounded-2xl p-8 shadow-card text-center">
                    <Loader2 className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" />
                    <h2 className="font-bold text-gray-900 text-lg mb-2">
                      {isAr ? 'جاري معالجة الدفع' : 'Processing Payment'}
                    </h2>
                    <p className="text-gray-500">
                      {isAr ? 'يرجى الانتظار حتى نتحقق من عملية الدفع...' : 'Please wait while we verify your payment...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-card sticky top-24">
                  {/* Property thumbnail */}
                  <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                    {primaryImage && (
                      <div className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={primaryImage}
                          alt={property.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2">{property.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{property.location.city}</p>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-3 text-sm mb-6">
                    <h3 className="font-bold text-gray-900">{isAr ? 'تفاصيل السعر' : 'Price details'}</h3>
                    <div className="flex justify-between text-gray-600">
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(pricePerNight)} &times; {getNightLabel(nights, isAr ? 'ar' : 'en')}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(subtotal)}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{isAr ? '\u0631\u0633\u0648\u0645 \u0627\u0644\u062A\u0646\u0638\u064A\u0641' : 'Cleaning fee'}</span>
                        <span dir="ltr"><SarSymbol /> {formatPriceNumber(cleaningFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>{isAr ? '\u0631\u0633\u0648\u0645 \u0627\u0644\u062E\u062F\u0645\u0629' : 'Service fee'}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(serviceFee)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{isAr ? `\u062E\u0635\u0645 (${property.pricing.discountPercent}%)` : `Discount (${property.pricing.discountPercent}%)`}</span>
                        <span dir="ltr"><SarSymbol /> -{formatPriceNumber(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>{isAr ? '\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 (15%)' : 'VAT (15%)'}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(vat)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200 text-base">
                      <span>{isAr ? '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0634\u0627\u0645\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u0629' : 'Total (incl. VAT)'}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(total)}</span>
                    </div>
                  </div>

                  {/* Action button */}
                  {step === 1 && (
                    <Button
                      onClick={handleContinueToPayment}
                      isLoading={processing}
                      size="lg"
                      className="w-full"
                      leftIcon={<CreditCard className="w-4 h-4" />}
                    >
                      {isAr ? 'متابعة للدفع' : 'Continue to Payment'}
                    </Button>
                  )}

                  {step === 2 && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setStep(1)}
                        className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                      >
                        {isAr ? '← العودة للمراجعة' : '← Back to review'}
                      </button>
                      <div className="text-xs text-gray-500 text-center">
                        <p>{isAr ? 'سيتم تحويلك بعد إتمام الدفع' : 'You will be redirected after payment'}</p>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      <p>{isAr ? 'يرجى عدم إغلاق هذه النافذة' : 'Please do not close this window'}</p>
                    </div>
                  )}

                  <p className="text-xs text-center text-gray-500 mt-3">
                    {isAr ? 'بتأكيد الحجز، أنت توافق على ' : 'By confirming, you agree to our '}
                    <Link href="/terms-of-use" className="text-primary-600 hover:underline">
                      {isAr ? 'الشروط والأحكام' : 'Terms of Service'}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <BookingContent />
    </Suspense>
  );
}
