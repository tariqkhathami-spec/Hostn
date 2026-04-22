'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Property } from '@/types';
import { propertiesApi, unitsApi, bookingsApi, paymentsApi, type SimulatedOutcome } from '@/lib/api';
import {
  calculateStayPricing,
  DISCOUNT_LABELS_EN,
  DISCOUNT_LABELS_AR,
  type PricingUnit,
  type DiscountBreakdownLine,
} from '@/lib/pricing';
import { formatPrice, formatPriceNumber, formatDate, calculateNights, getNightLabel, getGuestLabel, getAdultLabel, getChildLabel } from '@/lib/utils';
import { CITIES } from '@/lib/constants';
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
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'tabby' | 'tamara'>('card');
  // PR K: payment simulator state — picks the outcome the back-end applies
  // when the Pay button is clicked at step 2.
  const [simulatedOutcome, setSimulatedOutcome] = useState<SimulatedOutcome>('approved');
  const [simulating, setSimulating] = useState(false);
  // PR M: full mock payment form fields. These don't validate or go
  // anywhere — the simulator endpoint applies the chosen outcome — but
  // they let the demo feel like a real gateway interaction.
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);

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
    // PR K: real Moyasar form is disabled while the simulator owns step 2.
    // Re-enable by setting `NEXT_PUBLIC_PAYMENT_SIMULATOR=0` and restoring
    // the `loadMoyasarForm()` call below when the real integration ships.
    if (false && step === 2 && paymentConfig) {
      loadMoyasarForm();
    }
  }, [step, paymentConfig]);

  const fetchProperty = async () => {
    try {
      // Try as unit first (id may be a unit ID after Property→Unit migration)
      let foundUnit = false;
      try {
        const unitRes = await unitsApi.getOne(id);
        const unitData = unitRes.data.data;
        setUnit(unitData);
        foundUnit = true;
        if (unitData?.property && typeof unitData.property === 'object') {
          setProperty(unitData.property);
        } else if (unitData?.property && typeof unitData.property === 'string') {
          const propRes = await propertiesApi.getOne(unitData.property);
          setProperty(propRes.data.data);
        } else {
          const res = await propertiesApi.getOne(id);
          setProperty(res.data.data);
        }
      } catch {
        // ID is a property ID — fetch property + its units
        const res = await propertiesApi.getOne(id);
        setProperty(res.data.data);

        // Try to load the selected unit from localStorage, or fetch the property's first unit
        try {
          const savedUnitId = typeof window !== 'undefined' ? localStorage.getItem(`hostn_unit_${id}`) : null;
          if (savedUnitId) {
            const unitRes = await unitsApi.getOne(savedUnitId);
            setUnit(unitRes.data.data);
            foundUnit = true;
          } else {
            // Fetch units for this property and use the first active one
            const unitsRes = await unitsApi.getForProperty(id);
            const units = unitsRes.data.data;
            if (units && units.length > 0) {
              setUnit(units[0]);
              foundUnit = true;
            }
          }
        } catch {
          // No units available — proceed with property-only data
        }
      }
    } catch {
      router.push('/search');
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
      // Use holdId and unitId if available from BookingWidget
      const holdId = typeof window !== 'undefined' ? localStorage.getItem(`hostn_hold_${id}`) : null;
      const unitId = typeof window !== 'undefined' ? localStorage.getItem(`hostn_unit_${id}`) : null;

      // Step 1: Create booking (converts hold if valid, otherwise creates fresh)
      const bookingRes = await bookingsApi.create({
        propertyId: id,
        checkIn,
        checkOut,
        guests: { adults: adultsCount, children: childrenCount, infants: 0 },
        specialRequests,
        ...(holdId ? { holdId } : {}),
        ...(unitId ? { unitId } : {}),
      });

      // Clean up holdId and unitId from localStorage
      if (holdId) localStorage.removeItem(`hostn_hold_${id}`);
      if (unitId) localStorage.removeItem(`hostn_unit_${id}`);

      const newBookingId = bookingRes.data.data._id;
      setBookingId(newBookingId);

      // PR K: every payment method now routes through the in-app simulator
      // (demo mode). We still call `paymentsApi.initiate` to create a Payment
      // record — the simulator picks an outcome against that record on step 2.
      // The BNPL off-site redirects and Moyasar card form are deferred to the
      // real payment milestone; the UX is the same for all three methods.
      const paymentRes = await paymentsApi.initiate({
        bookingId: newBookingId,
      });

      // Backend returns `{ success: true, data: { paymentId, amount, ... } }`.
      // The previous code read `paymentRes.data.paymentConfig` /
      // `paymentRes.data.paymentId` — both undefined — which left
      // `paymentConfig` null and prevented step 2 from rendering.
      const payload = paymentRes.data.data;
      setPaymentConfig(payload);
      localStorage.setItem(`hostn_payment_${newBookingId}`, payload.paymentId);

      setStep(2);
      toast.success(isAr ? 'تم إنشاء الحجز. يرجى إتمام الدفع.' : 'Booking created. Please complete payment.');
    } catch (error: unknown) {
      const errData = (error as { response?: { data?: { code?: string; message?: string; params?: Record<string, number> } } })?.response?.data;
      const errorMessages: Record<string, { en: string; ar: string }> = {
        INVALID_DATES: { en: 'Invalid date format', ar: 'صيغة التاريخ غير صالحة' },
        CHECKOUT_BEFORE_CHECKIN: { en: 'Check-out must be after check-in', ar: 'يجب أن يكون تاريخ المغادرة بعد تاريخ الوصول' },
        CHECKIN_IN_PAST: { en: 'Check-in date cannot be in the past', ar: 'لا يمكن أن يكون تاريخ الوصول في الماضي' },
        PROPERTY_NOT_FOUND: { en: 'Property not found', ar: 'العقار غير موجود' },
        OWN_PROPERTY: { en: 'Cannot book your own property', ar: 'لا يمكنك حجز عقارك الخاص' },
        NO_ADULTS: { en: 'At least one adult guest required', ar: 'مطلوب ضيف بالغ واحد على الأقل' },
        MAX_CAPACITY: { en: `Exceeds max capacity of ${errData?.params?.max || ''} guests`, ar: `يتجاوز الحد الأقصى ${getGuestLabel(errData?.params?.max || 0, 'ar')}` },
        DATES_BLOCKED: { en: 'Property is blocked for selected dates', ar: 'العقار محجوب للتواريخ المحددة' },
        MIN_STAY: { en: `Minimum stay is ${getNightLabel(errData?.params?.min || 0, 'en')}`, ar: `الحد الأدنى للإقامة${getNightLabel(errData?.params?.min || 0, 'ar')}` },
        MAX_STAY: { en: `Maximum stay is ${getNightLabel(errData?.params?.max || 0, 'en')}`, ar: `الحد الأقصى للإقامة${getNightLabel(errData?.params?.max || 0, 'ar')}` },
        DATES_UNAVAILABLE: { en: 'This property is already booked for one or more of your selected dates. Please choose different dates.', ar: 'هذا العقار محجوز بالفعل في أحد التواريخ التي اخترتها. يرجى اختيار تواريخ أخرى.' },
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

  // PR M: format helpers for the mock card form
  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  /**
   * PR K: Payment simulator handler. Sends the chosen outcome to the backend
   * which updates the Payment + Booking records, then redirects to the
   * existing payment-callback page with `?simulated=1` so that page reads
   * the final state from `/payments/:id/status` instead of calling Moyasar.
   */
  const handleSimulatePayment = async () => {
    if (!bookingId) return;
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem(`hostn_payment_${bookingId}`)
      : null;
    // Guard against stale "undefined" string stored by an older frontend
    // build — if the stored value doesn't look like a valid Mongo ObjectId
    // we re-initiate the payment before simulating.
    const isValidId = !!stored && /^[a-f0-9]{24}$/i.test(stored);
    let paymentId = stored && isValidId ? stored : null;
    if (!paymentId && bookingId) {
      try {
        const fresh = await paymentsApi.initiate({ bookingId });
        paymentId = fresh.data.data.paymentId;
        if (paymentId) localStorage.setItem(`hostn_payment_${bookingId}`, paymentId);
      } catch {
        toast.error(isAr ? 'تعذّر إنشاء سجل الدفع' : 'Could not initialize payment');
        return;
      }
    }
    if (!paymentId) {
      toast.error(isAr ? 'لم يتم العثور على معرف الدفع' : 'Payment ID not found');
      return;
    }
    setSimulating(true);
    setStep(3);
    try {
      await paymentsApi.simulate({ paymentId, outcome: simulatedOutcome });
      // Timeout outcome stays on the "processing" page indefinitely — this
      // simulates a slow 3DS challenge the guest abandons. For every other
      // outcome we hop to the callback page which renders success/failure UI.
      if (simulatedOutcome !== 'timeout') {
        router.push(`/booking/${bookingId}/payment-callback?simulated=1&paymentId=${paymentId}`);
      }
    } catch {
      toast.error(isAr ? 'فشل تشغيل المحاكاة' : 'Simulation failed');
      setStep(2);
    } finally {
      setSimulating(false);
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

  // Pricing — PR M: single source of truth via `calculateStayPricing`, the
  // same helper `/search/[id]` uses. Guarantees per-type discount lines,
  // stacking rules, and VAT math stay in lockstep between the two pages.
  // Falls back to a simple property-level calc when a unit isn't present.
  let pricePerNight = 0;
  let subtotal = 0;
  let cleaningFee = 0;
  let discount = 0;
  let serviceFee = 0;
  let vat = 0;
  let total = 0;
  let discountBreakdown: DiscountBreakdownLine[] = [];

  if (unit?.pricing && checkIn && checkOut) {
    const bd = calculateStayPricing(unit as PricingUnit, new Date(checkIn), new Date(checkOut));
    pricePerNight = bd.perNight;
    subtotal = bd.subtotal;
    cleaningFee = bd.cleaningFee;
    discount = bd.discount;
    serviceFee = bd.serviceFee;
    vat = bd.vat;
    total = bd.total;
    discountBreakdown = bd.discountBreakdown;
  } else {
    // Legacy property-level path (no unit configured).
    pricePerNight = property.pricing?.perNight ?? 0;
    subtotal = nights * pricePerNight;
    cleaningFee = property.pricing?.cleaningFee ?? 0;
    discount = (property.pricing?.discountPercent ?? 0) > 0
      ? Math.round(subtotal * ((property.pricing?.discountPercent ?? 0) / 100) * 100) / 100
      : 0;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const serviceFeeRaw = discountedSubtotal * 0.11;
    serviceFee = r2(serviceFeeRaw);
    const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
    const vatRaw = taxableRaw * 0.15;
    vat = r2(vatRaw);
    total = r2(taxableRaw + vatRaw);
  }

  // PR I: if any selected date is blocked on the unit (host marked it
  // unavailable, or a confirmed booking claimed it after this hold was
  // issued), hide the breakdown + disable Continue + show the red banner —
  // same pattern as BookingWidget on /search/[id].
  const hasBlockedDates = (() => {
    if (!unit?.datePricing || !checkIn || !checkOut || nights <= 0) return false;
    const overrides = new Map<string, { isBlocked?: boolean }>();
    for (const dp of unit.datePricing as { date: string; isBlocked?: boolean }[]) {
      overrides.set(new Date(dp.date).toISOString().slice(0, 10), dp);
    }
    const s = new Date(checkIn);
    for (let i = 0; i < nights; i++) {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      if (overrides.get(d.toISOString().slice(0, 10))?.isBlocked) return true;
    }
    return false;
  })();

  const primaryImage = unit?.images?.find((i: any) => i.isPrimary)?.url
    || unit?.images?.[0]?.url
    || property.images?.find((i: any) => i.isPrimary)?.url
    || property.images?.[0]?.url;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="container-custom py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back to property link */}
            {step === 1 && (
              <Link href={`/search/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
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
                                {isAr
                                  ? `${new Date(checkIn).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(checkOut).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                  : `${formatDate(checkIn)} – ${formatDate(checkOut)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">
                              {getNightLabel(nights, isAr ? 'ar' : 'en')}
                            </span>
                            <Link
                              href={`/search/${id}`}
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
                                {isAr ? `حتى ${getGuestLabel(unit?.capacity?.maxGuests ?? property.capacity?.maxGuests ?? 0, 'ar')} مسموح` : `Up to ${unit?.capacity?.maxGuests ?? property.capacity?.maxGuests ?? 0} allowed`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">
                              {isAr
                                ? `${getAdultLabel(adultsCount, 'ar')}${childrenCount > 0 ? ` و ${getChildLabel(childrenCount, 'ar')}` : ''}`
                                : `${getAdultLabel(adultsCount, 'en')}${childrenCount > 0 ? `, ${getChildLabel(childrenCount, 'en')}` : ''}`}
                            </span>
                            <Link
                              href={`/search/${id}`}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 underline"
                            >
                              {isAr ? 'تعديل' : 'Edit'}
                            </Link>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-3">
                          <Shield className="w-5 h-5 text-green-500" />
                          <div>
                            {(() => {
                              // PR G: policy-specific labels AND descriptions.
                              // Previously the fallback description always said
                              // "full refund" which is wrong for normal/restricted.
                              const policy = (unit?.cancellationPolicy as 'free' | 'flexible' | 'normal' | 'restricted' | undefined) || 'free';
                              const labels: Record<string, { en: string; ar: string }> = {
                                free: { en: 'Free cancellation', ar: 'إلغاء مجاني' },
                                flexible: { en: 'Flexible cancellation', ar: 'إلغاء مرن' },
                                normal: { en: 'Normal cancellation', ar: 'إلغاء عادي' },
                                restricted: { en: 'Restricted cancellation', ar: 'إلغاء مقيد' },
                              };
                              const fallbackDescriptions: Record<string, { en: string; ar: string }> = {
                                free:       { en: 'Cancel anytime for a full refund',              ar: 'إلغاء في أي وقت مع استرداد كامل' },
                                flexible:   { en: 'Cancel before check-in for a full refund',      ar: 'ألغِ قبل الوصول واسترد المبلغ كاملاً' },
                                normal:     { en: 'Partial refund if you cancel before check-in',  ar: 'استرداد جزئي عند الإلغاء قبل الوصول' },
                                restricted: { en: 'Non-refundable after booking',                   ar: 'لا يمكن استرداد المبلغ بعد الحجز' },
                              };
                              const labelText = isAr ? labels[policy]?.ar : labels[policy]?.en;
                              const descText = unit?.cancellationDescription
                                ? unit.cancellationDescription
                                : (isAr ? fallbackDescriptions[policy]?.ar : fallbackDescriptions[policy]?.en);
                              return (
                                <>
                                  <p className="text-sm font-medium text-gray-800">{labelText}</p>
                                  <p className="text-xs text-gray-500">{descText}</p>
                                </>
                              );
                            })()}
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
                            <p className="text-xs text-gray-500">{isAr ? 'فيزا، ماستركارد، مدى' : 'Visa, Mastercard, mada'}</p>
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
                                {isAr ? '4 دفعات × ' : '4 × '}<span dir="ltr"><SarSymbol /> {formatPriceNumber(Math.ceil((total / 4) * 100) / 100)}</span>{isAr ? ' بدون فوائد' : ' interest-free'}
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
                                {isAr ? '4 دفعات × ' : '4 × '}<span dir="ltr"><SarSymbol /> {formatPriceNumber(Math.ceil((total / 4) * 100) / 100)}</span>{isAr ? ' بدون رسوم تأخير' : ' no late fees'}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg">tamara</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2: Payment Simulator (PR K) */}
                {/* Step 2 (PR M): realistic payment UI. Tabs mimic Visa/
                    Mastercard/Mada card entry + Tamara + Tabby. Fields
                    don't validate or ship anywhere — the simulator
                    endpoint decides the outcome — but the UX mirrors a
                    production gateway. Demo "outcome" selector sits in
                    its own clearly-marked section at the bottom. */}
                {step === 2 && paymentConfig && (
                  <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                    {/* Secure header */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg leading-tight">
                          {isAr ? 'دفع آمن' : 'Secure Payment'}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {isAr ? 'بياناتك محمية ومشفرة' : 'Your information is encrypted'}
                        </p>
                      </div>
                      <div className="ms-auto text-sm font-semibold text-gray-900" dir="ltr">
                        <SarSymbol /> {formatPriceNumber(total)}
                      </div>
                    </div>

                    {/* Method tabs */}
                    <div className="px-6 pt-5">
                      <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-1">
                        {([
                          { id: 'card', label: isAr ? 'بطاقة' : 'Card', brands: 'VISA · MC · mada' },
                          { id: 'tamara', label: 'Tamara', brands: isAr ? 'قسّم على 4' : 'Split in 4' },
                          { id: 'tabby', label: 'Tabby', brands: isAr ? 'قسّم على 4' : 'Split in 4' },
                        ] as const).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id as 'card' | 'tabby' | 'tamara')}
                            className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                              paymentMethod === m.id
                                ? 'bg-white text-primary-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <div>{m.label}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{m.brands}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card form */}
                    {paymentMethod === 'card' && (
                      <div className="px-6 py-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-7 bg-blue-50 rounded flex items-center justify-center text-[10px] font-bold text-blue-700">VISA</div>
                          <div className="w-11 h-7 bg-red-50 rounded flex items-center justify-center text-[10px] font-bold text-red-600">MC</div>
                          <div className="w-11 h-7 bg-amber-50 rounded flex items-center justify-center text-[10px] font-bold text-amber-700">mada</div>
                          <div className="w-11 h-7 bg-indigo-50 rounded flex items-center justify-center text-[10px] font-bold text-indigo-600">AMEX</div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {isAr ? 'رقم البطاقة' : 'Card number'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono tracking-wider"
                            dir="ltr"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {isAr ? 'تاريخ الانتهاء' : 'Expiry'}
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/YY"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="•••"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {isAr ? 'اسم حامل البطاقة' : 'Cardholder name'}
                          </label>
                          <input
                            type="text"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder={isAr ? 'الاسم كما يظهر على البطاقة' : 'Name as shown on card'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={saveCard}
                            onChange={(e) => setSaveCard(e.target.checked)}
                            className="w-4 h-4 accent-primary-600 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">
                            {isAr ? 'احفظ البطاقة للمدفوعات القادمة' : 'Save card for future payments'}
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Tamara preview */}
                    {paymentMethod === 'tamara' && (
                      <div className="px-6 py-5 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                          <div className="w-11 h-11 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            Ta
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-orange-900">Tamara</p>
                            <p className="text-xs text-orange-800">
                              {isAr ? 'قسّم دفعتك على 4 بدون فوائد' : 'Split into 4 interest-free payments'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 1, 2, 3].map((i) => {
                            const instalment = total / 4;
                            const d = new Date();
                            d.setMonth(d.getMonth() + i);
                            return (
                              <div key={i} className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="text-[10px] text-gray-500 mb-1">
                                  {i === 0 ? (isAr ? 'الآن' : 'Today') : d.toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-xs font-semibold text-gray-900" dir="ltr">
                                  <SarSymbol size={9} /> {formatPriceNumber(instalment)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500">
                          {isAr ? 'سيتم تحويلك لبوابة Tamara لإكمال الدفع.' : 'You\'ll be redirected to Tamara to complete payment.'}
                        </p>
                      </div>
                    )}

                    {/* Tabby preview */}
                    {paymentMethod === 'tabby' && (
                      <div className="px-6 py-5 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                          <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            Tb
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-emerald-900">Tabby</p>
                            <p className="text-xs text-emerald-800">
                              {isAr ? 'ادفع 4 مرات. بدون فوائد.' : 'Pay in 4. 0% fees.'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 1, 2, 3].map((i) => {
                            const instalment = total / 4;
                            const d = new Date();
                            d.setMonth(d.getMonth() + i);
                            return (
                              <div key={i} className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="text-[10px] text-gray-500 mb-1">
                                  {i === 0 ? (isAr ? 'الآن' : 'Today') : d.toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-xs font-semibold text-gray-900" dir="ltr">
                                  <SarSymbol size={9} /> {formatPriceNumber(instalment)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500">
                          {isAr ? 'سيتم تحويلك لبوابة Tabby لإكمال الدفع.' : 'You\'ll be redirected to Tabby to complete payment.'}
                        </p>
                      </div>
                    )}

                    {/* Demo simulator section (clearly marked) */}
                    <div className="mx-6 mb-5 p-4 border border-dashed border-amber-300 bg-amber-50/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                          {isAr ? 'وضع تجريبي' : 'Demo mode'}
                        </span>
                        <span className="text-xs text-amber-900">
                          {isAr ? 'اختر نتيجة الدفع المحاكاة' : 'Choose the simulated outcome'}
                        </span>
                      </div>
                      <select
                        value={simulatedOutcome}
                        onChange={(e) => setSimulatedOutcome(e.target.value as SimulatedOutcome)}
                        disabled={simulating}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-sm disabled:opacity-50"
                      >
                        <option value="approved">{isAr ? '✓ موافق — تم الدفع' : '✓ Approved — payment succeeds'}</option>
                        <option value="declined">{isAr ? '✗ رفض البطاقة' : '✗ Declined by issuer'}</option>
                        <option value="insufficient_funds">{isAr ? '✗ رصيد غير كافٍ' : '✗ Insufficient funds'}</option>
                        <option value="fraud">{isAr ? '✗ حُجب لأسباب أمنية' : '✗ Blocked by fraud check'}</option>
                        <option value="cancelled">{isAr ? '✗ ألغى الضيف الدفع' : '✗ User cancelled'}</option>
                        <option value="timeout">{isAr ? '⏳ مهلة 3DS' : '⏳ 3DS timeout'}</option>
                      </select>
                    </div>

                    {/* Pay button */}
                    <div className="px-6 pb-6">
                      <Button
                        onClick={handleSimulatePayment}
                        isLoading={simulating}
                        size="lg"
                        className="w-full"
                        leftIcon={<Lock className="w-4 h-4" />}
                      >
                        {isAr
                          ? `ادفع ${formatPriceNumber(total)} ر.س`
                          : `Pay SAR ${formatPriceNumber(total)}`}
                      </Button>
                      <p className="text-[11px] text-gray-400 text-center mt-3">
                        {isAr
                          ? 'بالدفع فإنك توافق على شروط الحجز. المبلغ لن يُخصم فعلياً — وضع تجريبي.'
                          : 'By paying you agree to the booking terms. No real charge — demo mode.'}
                      </p>
                    </div>
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
                          alt={isAr && property.titleAr ? property.titleAr : property.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                        {unit ? (isAr && unit.nameAr ? unit.nameAr : unit.nameEn || property.title) : (isAr && property.titleAr ? property.titleAr : property.title)}
                      </p>
                      {unit && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                          {isAr && property.titleAr ? property.titleAr : property.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{isAr ? (CITIES.find(c => c.value === property.location.city)?.ar || property.location.city) : property.location.city}</p>
                    </div>
                  </div>

                  {/* PR I: unavailable-dates banner — shown when one or more
                      of the selected nights have been blocked since this
                      booking hold was issued. Matches the BookingWidget
                      pattern on /search/[id]. */}
                  {hasBlockedDates && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4">
                      {isAr
                        ? 'هذه التواريخ محجوزة حالياً. يرجى اختيار تواريخ أخرى.'
                        : 'These dates are currently taken. Please choose different dates.'}
                    </div>
                  )}

                  {/* Price breakdown — hidden when dates are unavailable.
                      PR H order: price → discounts → cleaning → service → vat → total */}
                  {!hasBlockedDates && (
                  <div className="space-y-3 text-sm mb-6">
                    <h3 className="font-bold text-gray-900">{isAr ? 'تفاصيل السعر' : 'Price details'}</h3>
                    <div className="flex justify-between text-gray-600">
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(pricePerNight)} &times; {getNightLabel(nights, isAr ? 'ar' : 'en')}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(subtotal)}</span>
                    </div>
                    {/* PR M: per-type discount lines — matches /search/[id].
                        Falls back to a single aggregate line when there's no
                        breakdown (legacy property-only path). */}
                    {discountBreakdown.length > 1 ? (
                      discountBreakdown.map((d) => (
                        <div key={d.type} className="flex justify-between text-green-600">
                          <span>{(isAr ? DISCOUNT_LABELS_AR : DISCOUNT_LABELS_EN)[d.type]} {d.percent}%</span>
                          <span dir="ltr"><SarSymbol /> -{formatPriceNumber(d.amount)}</span>
                        </div>
                      ))
                    ) : discount > 0 ? (
                      <div className="flex justify-between text-green-600">
                        <span>
                          {discountBreakdown[0]
                            ? `${(isAr ? DISCOUNT_LABELS_AR : DISCOUNT_LABELS_EN)[discountBreakdown[0].type]} ${discountBreakdown[0].percent}%`
                            : (isAr ? 'خصم' : 'Discount')}
                        </span>
                        <span dir="ltr"><SarSymbol /> -{formatPriceNumber(discount)}</span>
                      </div>
                    ) : null}
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
                    <div className="flex justify-between text-gray-600">
                      <span>{isAr ? '\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 (15%)' : 'VAT (15%)'}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(vat)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200 text-base">
                      <span>{isAr ? '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0634\u0627\u0645\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u0629' : 'Total (incl. VAT)'}</span>
                      <span dir="ltr"><SarSymbol /> {formatPriceNumber(total)}</span>
                    </div>
                  </div>
                  )}

                  {/* Action button — disabled when dates unavailable */}
                  {step === 1 && (
                    <Button
                      onClick={handleContinueToPayment}
                      isLoading={processing}
                      disabled={hasBlockedDates}
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
                        {isAr ? 'العودة للمراجعة →' : '← Back to review'}
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
