import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { listingsService } from '../../services/listings.service';
import { listingTitle } from '../../utils/unit';
import type { BookingPricing } from '../../types';
import { bookingsService } from '../../services/bookings.service';
import { useSearchStore } from '../../store/searchStore';
import { useAuthStore } from '../../store/authStore';
import { cityLabel } from '../../constants/cities';
import { formatCurrency, formatDateRange, getNights } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows, BACK_ICON } from '../../constants/theme';
import { useLanguage, type TranslationKey } from '../../i18n';

function calculateDateRangePrice(
  listing: any, checkIn: string, checkOut: string
): { subtotal: number; blocked: boolean; nights: number } {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  // Guard: invalid dates or end <= start
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { subtotal: 0, blocked: false, nights: 0 };
  }

  const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

  const datePricingMap = new Map<string, any>();
  if (listing?.datePricing) {
    for (const dp of listing.datePricing) {
      const key = new Date(dp.date).toISOString().split('T')[0];
      datePricingMap.set(key, dp);
    }
  }

  const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  let subtotal = 0;
  let blocked = false;

  // Build discount rules map (weekday/weekend)
  const discountRulesMap: Record<string, number> = {};
  if (listing?.discountRules) {
    for (const rule of listing.discountRules) {
      discountRulesMap[rule.type] = rule.percent;
    }
  }

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const override = datePricingMap.get(dateStr);

    if (override?.isBlocked) { blocked = true; break; }

    let dayTotal = 0;

    if (override?.price) {
      dayTotal = override.price;
    } else {
      const dayOfWeek = d.getDay(); // 0=sunday
      const dayKey = dayKeys[dayOfWeek];
      const dayPrice = listing?.pricing?.[dayKey];
      dayTotal = (dayPrice && dayPrice > 0) ? dayPrice : (listing?.pricing?.perNight || 0);
    }

    // Apply per-date discount if set
    if (override?.discountPercent && override.discountPercent > 0) {
      dayTotal = dayTotal * (1 - override.discountPercent / 100);
    }
    // Otherwise apply weekday/weekend discount rules
    else {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6; // Thu-Sat
      const ruleKey = isWeekend ? 'weekend' : 'weekday';
      if (discountRulesMap[ruleKey] && discountRulesMap[ruleKey] > 0) {
        dayTotal = dayTotal * (1 - discountRulesMap[ruleKey] / 100);
      }
    }

    subtotal += Math.round(dayTotal);
  }

  return { subtotal, blocked, nights };
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const searchStore = useSearchStore();

  // Local state — initialize from search store
  const [checkIn, setCheckIn] = useState(searchStore.checkIn || '');
  const [checkOut, setCheckOut] = useState(searchStore.checkOut || '');
  const [adults, setAdults] = useState(Math.max(1, searchStore.adults));
  const [children, setChildren] = useState(Math.max(0, searchStore.children));
  const totalGuests = adults + children;

  // R19 workaround: when the user returns from the /search/dates picker
  // (we push to it from the dateSummaryRow below), pull the freshly
  // chosen dates out of searchStore. useFocusEffect re-fires every time
  // this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      const next = useSearchStore.getState();
      if (next.checkIn && next.checkIn !== checkIn) setCheckIn(next.checkIn);
      if (next.checkOut && next.checkOut !== checkOut) setCheckOut(next.checkOut);
    }, [checkIn, checkOut])
  );

  const [specialRequests, setSpecialRequests] = useState('');
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);
  // Price returned by POST /bookings/hold — the amount the booking is made with.
  const [holdPricing, setHoldPricing] = useState<BookingPricing | null>(null);

  // A hold belongs to one set of dates and guests; changing them drops it
  // and the screen goes back to the local estimate.
  React.useEffect(() => {
    setHoldId(null);
    setHoldPricing(null);
  }, [checkIn, checkOut, adults, children]);

  const { data: listing, isLoading, isError, refetch } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      // Try fetching as unit first; fall back to property
      try {
        const unit = await listingsService.getUnit(listingId!);
        if (unit) return unit;
      } catch (err) {
        if (__DEV__) console.debug('[checkout] getUnit failed, falling back to getById:', err);
      }
      return listingsService.getById(listingId!);
    },
    enabled: !!listingId,
  });

  // Units arrive flattened (utils/unit.ts) with their parent property id.
  const isUnit = !!(listing as any)?._isUnit;
  const parentPropertyId: string | undefined = isUnit ? (listing as any).propertyId : undefined;

  const today = format(new Date(), 'yyyy-MM-dd');

  // Price calculations — matching web BookingWidget exactly
  const hasValidDates = checkIn.length > 0 && checkOut.length > 0;
  const { subtotal, blocked: datesBlocked, nights } = hasValidDates
    ? calculateDateRangePrice(listing, checkIn, checkOut)
    : { subtotal: 0, blocked: false, nights: 0 };
  const pricePerNight = listing?.pricing?.perNight ?? 0;
  const cleaningFee = listing?.pricing?.cleaningFee ?? 0;
  // Same formula as the server (bookingController) and the web checkout:
  // service fee is 11% of the post-discount subtotal, VAT is 15% of
  // (discounted subtotal + cleaning + service fee), rounded to halalas once.
  // The old 10%-of-gross integer maths showed guests a different total
  // from the one the booking was created with.
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const discountPercent = listing?.pricing?.discountPercent ?? 0;
  const discount = discountPercent > 0 ? r2(subtotal * (discountPercent / 100)) : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const serviceFeeRaw = discountedSubtotal * 0.11;
  const serviceFee = r2(serviceFeeRaw);
  const taxableRaw = discountedSubtotal + cleaningFee + serviceFeeRaw;
  const vat = r2(taxableRaw * 0.15);
  const total = r2(taxableRaw + taxableRaw * 0.15);

  // Everything above is an estimate. Once the hold exists, the server's
  // pricing is what the guest is shown.
  const shown = {
    isFinal: !!holdPricing,
    perNight: holdPricing?.perNight ?? pricePerNight,
    nights: holdPricing?.nights ?? nights,
    subtotal: holdPricing?.subtotal ?? subtotal,
    cleaningFee: holdPricing?.cleaningFee ?? cleaningFee,
    serviceFee: holdPricing?.serviceFee ?? serviceFee,
    discount: holdPricing?.discount ?? discount,
    vat: holdPricing?.vat ?? vat,
    total: holdPricing?.total ?? total,
  };

  const maxGuests = listing?.capacity?.maxGuests ?? 20;
  const minNights = listing?.rules?.minNights ?? 1;
  const canBook = hasValidDates && nights >= minNights && totalGuests >= 1 && totalGuests <= maxGuests && !datesBlocked;

  // Show alert if dates are blocked by datePricing
  React.useEffect(() => {
    if (datesBlocked) {
      Alert.alert(
        t('common.error'),
        isAr
          ? 'بعض التواريخ المحددة محظورة. يرجى اختيار تواريخ أخرى.'
          : 'Some of the selected dates are blocked. Please choose different dates.'
      );
    }
  }, [datesBlocked]);

  // Error messages matching web's error codes
  const getBookingErrorMessage = (errData: any) => {
    const errorMessages: Record<string, { en: string; ar: string }> = {
      INVALID_DATES: { en: 'Invalid date format', ar: 'صيغة التاريخ غير صالحة' },
      CHECKOUT_BEFORE_CHECKIN: { en: 'Check-out must be after check-in', ar: 'يجب أن يكون تاريخ المغادرة بعد تاريخ الوصول' },
      CHECKIN_IN_PAST: { en: 'Check-in date cannot be in the past', ar: 'لا يمكن أن يكون تاريخ الوصول في الماضي' },
      PROPERTY_NOT_FOUND: { en: 'Property not found', ar: 'العقار غير موجود' },
      OWN_PROPERTY: { en: 'Cannot book your own property', ar: 'لا يمكنك حجز عقارك الخاص' },
      NO_ADULTS: { en: 'At least one adult guest required', ar: 'مطلوب ضيف بالغ واحد على الأقل' },
      MAX_CAPACITY: {
        en: `Exceeds max capacity of ${errData?.params?.max || maxGuests} guests`,
        ar: `يتجاوز الحد الأقصى ${errData?.params?.max || maxGuests} ضيوف`,
      },
      DATES_BLOCKED: { en: 'Property is blocked for selected dates', ar: 'العقار محجوب للتواريخ المحددة' },
      MIN_STAY: {
        en: `Minimum stay is ${errData?.params?.min || minNights} nights`,
        ar: `الحد الأدنى للإقامة ${errData?.params?.min || minNights} ليالٍ`,
      },
      MAX_STAY: {
        en: `Maximum stay is ${errData?.params?.max || ''} nights`,
        ar: `الحد الأقصى للإقامة ${errData?.params?.max || ''} ليالٍ`,
      },
      DATES_UNAVAILABLE: {
        en: 'This property is already booked for your selected dates. Please choose different dates.',
        ar: 'هذا العقار محجوز بالفعل في التواريخ المختارة. يرجى اختيار تواريخ أخرى.',
      },
    };
    const code = errData?.code;
    const unitErrors: Record<string, TranslationKey> = {
      UNIT_REQUIRED: 'checkout.error.unitRequired',
      UNIT_NOT_FOUND: 'checkout.error.unitNotFound',
      UNIT_NOT_BOOKABLE: 'checkout.error.unitNotBookable',
      PROPERTY_UNAVAILABLE: 'checkout.error.propertyUnavailable',
    };
    if (code && unitErrors[code]) return t(unitErrors[code]);
    const mapped = code ? errorMessages[code] : null;
    if (mapped) return isAr ? mapped.ar : mapped.en;
    // The server's own text is shown only when it is in the app's language.
    if (typeof errData?.message === 'string' && /[\u0600-\u06FF]/.test(errData.message) === isAr) return errData.message;
    return isAr ? 'فشل إنشاء الحجز. حاول مرة أخرى.' : 'Failed to create booking. Please try again.';
  };

  const requestHold = async () => {
    const hold = await bookingsService.createHold({
      propertyId: isUnit ? (parentPropertyId || listingId!) : listingId!,
      ...(isUnit ? { unitId: listingId! } : {}),
      checkIn,
      checkOut,
      guests: { adults, children, infants: 0 },
    });
    if (hold?.holdId) setHoldId(hold.holdId);
    if (hold?.pricing && typeof hold.pricing.total === 'number') setHoldPricing(hold.pricing);
    return hold;
  };

  // Step 1: hold the dates and show the server's price. Step 2 (same button,
  // second tap) sends the booking request for exactly that price.
  const reviewPrice = async () => {
    if (!hasValidDates || holdLoading) return;
    setHoldLoading(true);
    try {
      await requestHold();
    } catch (err: any) {
      const errData = err?.response?.data;
      Alert.alert(t('common.error'), getBookingErrorMessage(errData));
      if (errData?.code === 'DATES_UNAVAILABLE') {
        setCheckIn('');
        setCheckOut('');
        router.push({
          pathname: '/search/dates',
          params: { returnTo: 'checkout', listingId: listingId! },
        });
      }
    } finally {
      setHoldLoading(false);
    }
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      // Normally the hold already exists (see reviewPrice); create it if not.
      let currentHoldId = holdId;
      if (!currentHoldId) {
        try {
          const hold = await requestHold();
          currentHoldId = hold?.holdId ?? null;
        } catch (err) {
          if (__DEV__) console.debug('[checkout] createHold failed, proceeding without hold:', err);
        }
      }

      return bookingsService.create({
        propertyId: isUnit ? (parentPropertyId || listingId!) : listingId!,
        ...(isUnit ? { unitId: listingId! } : {}),
        checkIn,
        checkOut,
        guests: { adults, children, infants: 0 },
        specialRequests: specialRequests || undefined,
        holdId: currentHoldId || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert(
        t('checkout.requestSentTitle'),
        t('checkout.requestSentBody'),
        [{ text: t('bookings.title'), onPress: () => router.replace('/(tabs)/bookings') }]
      );
    },
    onError: (error: any) => {
      const errData = error?.response?.data;
      Alert.alert(t('common.error'), getBookingErrorMessage(errData));
    },
  });

  // A booking request needs an account; guests are sent to sign in and
  // brought back here afterwards.
  const handleSubmit = () => {
    if (!canBook) return;
    if (!useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().setReturnTo(`/checkout/${listingId}`);
      router.push('/(auth)/phone');
      return;
    }
    // First tap: hold the dates and show the final price. Second tap: send.
    if (!holdId || !holdPricing) {
      reviewPrice();
      return;
    }
    bookMutation.mutate();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (isError || !listing || !listingId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>{t('common.somethingWrong')}</Text>
          <Text style={styles.errorMessage}>{t('common.unexpectedError')}</Text>
          <View style={styles.errorActions}>
            <Pressable style={styles.errorButtonPrimary} onPress={() => refetch()}>
              <Text style={styles.errorButtonPrimaryText}>{t('common.tryAgain')}</Text>
            </Pressable>
            <Pressable style={styles.errorButtonSecondary} onPress={() => router.back()}>
              <Text style={styles.errorButtonSecondaryText}>{t('common.back')}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={BACK_ICON} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('checkout.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Property Summary */}
        <View style={styles.propertyCard}>
          <Image source={{ uri: typeof listing.images?.[0] === 'string' ? listing.images[0] : listing.images?.[0]?.url }} style={styles.propertyImage} contentFit="cover" />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={2}>{listingTitle(listing, language)}</Text>
            <Text style={styles.propertyLocation}>{cityLabel(listing.location?.city, language)}</Text>
            {hasValidDates && (
              <Text style={styles.propertyDates}>{formatDateRange(checkIn, checkOut)}</Text>
            )}
            <Text style={styles.propertyGuests}>
              {isAr
                ? `${adults} بالغين${children > 0 ? ` و ${children} أطفال` : ''}`
                : `${adults} adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}`}
            </Text>
          </View>
        </View>

        {/* Dates Section with Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.dates')}</Text>

          {/* R19 workaround: the inline / Modal Calendar reliably drops
              taps on every day cell except the bottom-right one. Push to
              the dedicated /search/dates screen, which uses the exact
              same Calendar but renders top-level (no parent ScrollView /
              Modal) where day taps work correctly. The dates flow back
              through searchStore and are picked up via useFocusEffect. */}
          <Pressable
            style={styles.dateSummaryRow}
            onPress={() =>
              router.push({
                pathname: '/search/dates',
                params: { returnTo: 'checkout', listingId: listingId! },
              })
            }
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <View style={styles.dateSummaryText}>
              <Text style={styles.dateSummaryLabel}>{t('booking.dates')}</Text>
              <Text style={[styles.dateSummaryValue, !hasValidDates && styles.datePlaceholder]}>
                {hasValidDates
                  ? formatDateRange(checkIn, checkOut)
                  : (isAr ? 'اختر التواريخ' : 'Select dates')}
              </Text>
            </View>
            <Ionicons
              name={isAr ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={Colors.textTertiary}
            />
          </Pressable>

          {/* Min nights warning */}
          {minNights > 1 && nights > 0 && nights < minNights && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color="#d97706" />
              <Text style={styles.warningText}>
                {isAr
                  ? `الحد الأدنى للإقامة ${minNights} ليالٍ`
                  : `Minimum stay is ${minNights} night${minNights > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </View>

        {/* Guests Section — Adults & Children */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.guests')}</Text>

          {/* Adults */}
          <View style={styles.guestRow}>
            <View>
              <Text style={styles.guestLabel}>{isAr ? 'بالغين' : 'Adults'}</Text>
              <Text style={styles.guestSublabel}>{isAr ? '13 سنة فأكثر' : 'Ages 13+'}</Text>
            </View>
            <View style={styles.guestCounter}>
              <Pressable
                style={[styles.guestButton, adults <= 1 && styles.guestButtonDisabled]}
                onPress={() => setAdults(Math.max(1, adults - 1))}
                disabled={adults <= 1}
              >
                <Ionicons name="remove" size={18} color={adults <= 1 ? Colors.textTertiary : Colors.textPrimary} />
              </Pressable>
              <Text style={styles.guestCount}>{adults}</Text>
              <Pressable
                style={[styles.guestButton, totalGuests >= maxGuests && styles.guestButtonDisabled]}
                onPress={() => setAdults(Math.min(maxGuests - children, adults + 1))}
                disabled={totalGuests >= maxGuests}
              >
                <Ionicons name="add" size={18} color={totalGuests >= maxGuests ? Colors.textTertiary : Colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Children */}
          <View style={[styles.guestRow, styles.guestRowBorder]}>
            <View>
              <Text style={styles.guestLabel}>{isAr ? 'أطفال' : 'Children'}</Text>
              <Text style={styles.guestSublabel}>{isAr ? '0–12 سنة' : 'Ages 0–12'}</Text>
            </View>
            <View style={styles.guestCounter}>
              <Pressable
                style={[styles.guestButton, children <= 0 && styles.guestButtonDisabled]}
                onPress={() => setChildren(Math.max(0, children - 1))}
                disabled={children <= 0}
              >
                <Ionicons name="remove" size={18} color={children <= 0 ? Colors.textTertiary : Colors.textPrimary} />
              </Pressable>
              <Text style={styles.guestCount}>{children}</Text>
              <Pressable
                style={[styles.guestButton, totalGuests >= maxGuests && styles.guestButtonDisabled]}
                onPress={() => setChildren(Math.min(maxGuests - adults, children + 1))}
                disabled={totalGuests >= maxGuests}
              >
                <Ionicons name="add" size={18} color={totalGuests >= maxGuests ? Colors.textTertiary : Colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {totalGuests >= maxGuests && (
            <Text style={styles.capacityNote}>
              {isAr ? `الحد الأقصى ${maxGuests} ضيوف` : `Maximum ${maxGuests} guests`}
            </Text>
          )}
        </View>

        {/* Price Breakdown — local estimate until the hold returns the server's price */}
        {shown.nights > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('checkout.priceBreakdown')}</Text>
            <Text style={styles.priceNote}>
              {shown.isFinal ? t('checkout.priceFinal') : t('checkout.priceEstimate')}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{formatCurrency(shown.perNight)} x {shown.nights} {shown.nights > 1 ? t('booking.nights') : t('booking.night')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(shown.subtotal)}</Text>
            </View>
            {shown.discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: Colors.success }]}>{t('checkout.discount')}</Text>
                <Text style={[styles.priceValue, { color: Colors.success }]}>-{formatCurrency(shown.discount)}</Text>
              </View>
            )}
            {shown.cleaningFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('checkout.cleaningFee')}</Text>
                <Text style={styles.priceValue}>{formatCurrency(shown.cleaningFee)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.serviceFee')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(shown.serviceFee)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.vat')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(shown.vat)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{shown.isFinal ? t('checkout.total') : t('checkout.totalEstimate')}</Text>
              <Text style={styles.totalValue}>{formatCurrency(shown.total)}</Text>
            </View>
          </View>
        )}

        {/* Special Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isAr ? 'طلبات خاصة (اختياري)' : 'Special requests (optional)'}
          </Text>
          <TextInput
            style={styles.specialRequestsInput}
            placeholder={isAr ? 'أي طلبات أو ملاحظات للمضيف؟' : 'Any special requests or notes for the host?'}
            placeholderTextColor={Colors.textTertiary}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{specialRequests.length}/500</Text>
        </View>

        {/* No payment is taken in the app yet — say so plainly. */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>{t('checkout.requestNotice')}</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.payButton, (!canBook || holdLoading) && styles.payButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canBook || bookMutation.isPending || holdLoading}
        >
          {bookMutation.isPending || holdLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.payText}>
              {!hasValidDates
                ? (isAr ? 'اختر التواريخ أولًا' : 'Select dates first')
                : nights < minNights
                  ? (isAr ? `الحد الأدنى ${minNights} ليالٍ` : `Minimum ${minNights} nights`)
                  : shown.isFinal
                    ? t('checkout.sendRequest')
                    : t('checkout.reviewPrice')}
            </Text>
          )}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center' },
  errorMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  errorButtonPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  errorButtonPrimaryText: { ...Typography.bodyBold, color: Colors.white },
  errorButtonSecondary: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  errorButtonSecondaryText: { ...Typography.bodyBold, color: Colors.textPrimary },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { padding: Spacing.xl, paddingBottom: 100 },
  propertyCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.md, overflow: 'hidden', ...Shadows.card },
  propertyImage: { width: 100, height: 100 },
  propertyInfo: { flex: 1, padding: Spacing.md, gap: 2 },
  propertyTitle: { ...Typography.smallBold, color: Colors.textPrimary },
  propertyLocation: { ...Typography.caption, color: Colors.textSecondary },
  propertyDates: { ...Typography.caption, color: Colors.primary },
  propertyGuests: { ...Typography.caption, color: Colors.textSecondary },
  section: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: Spacing.md },

  // Date picker — tappable summary row that pushes to /search/dates
  dateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  dateSummaryText: { flex: 1 },
  dateSummaryLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 2 },
  dateSummaryValue: { ...Typography.smallBold, color: Colors.textPrimary },
  datePlaceholder: { color: Colors.textTertiary },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#fffbeb',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  warningText: { ...Typography.caption, color: '#d97706', fontWeight: '600' },

  // Guests
  guestRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  guestRowBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  guestLabel: { ...Typography.body, color: Colors.textPrimary },
  guestSublabel: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  guestButton: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  guestButtonDisabled: { opacity: 0.3 },
  guestCount: { ...Typography.bodyBold, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  capacityNote: { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.xs },

  // Price breakdown
  priceNote: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  priceLabel: { ...Typography.small, color: Colors.textSecondary },
  priceValue: { ...Typography.small, color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: Spacing.sm, paddingTop: Spacing.md },
  totalLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  totalValue: { ...Typography.bodyBold, color: Colors.primary },

  // Special requests
  specialRequestsInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Typography.small, color: Colors.textPrimary,
    minHeight: 80,
  },
  charCount: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'right', marginTop: 4 },

  // Booking-request notice
  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primary50, borderRadius: Radius.sm,
    padding: Spacing.md, marginTop: Spacing.base,
  },
  noticeText: { ...Typography.small, color: Colors.textPrimary, flex: 1, lineHeight: 20 },

  // Footer
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  payButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
  payButtonDisabled: { opacity: 0.5 },
  payText: { ...Typography.bodyBold, color: Colors.white },
});
