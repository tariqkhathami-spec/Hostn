import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addDays } from 'date-fns';
import { listingsService } from '../../services/listings.service';
import { bookingsService } from '../../services/bookings.service';
import { couponsService } from '../../services/coupons.service';
import { useSearchStore } from '../../store/searchStore';
import { formatCurrency, formatDateRange, getNights } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';

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

  const [showCalendar, setShowCalendar] = useState(!checkIn);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);

  const PAYMENT_METHODS = [
    { id: 'card', label: isAr ? 'بطاقة ائتمان / مدى' : 'Credit Card / mada', icon: 'card-outline' },
    { id: 'tabby', label: 'Tabby', icon: 'pricetag-outline' },
    { id: 'tamara', label: 'Tamara', icon: 'pricetags-outline' },
  ] as const;
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      // Try fetching as unit first; fall back to property
      try {
        const unit = await listingsService.getUnit(listingId!);
        if (unit) return unit;
      } catch (err) {
        console.debug('[checkout] getUnit failed, falling back to getById:', err);
      }
      return listingsService.getById(listingId!);
    },
    enabled: !!listingId,
  });

  // Detect if the listing is a unit (has a parent property reference)
  const isUnit = !!(listing as any)?.property;
  const parentPropertyId = isUnit
    ? (typeof (listing as any).property === 'string'
        ? (listing as any).property
        : (listing as any).property?._id || (listing as any).property?.id)
    : undefined;

  // Calendar date selection — matches web MiniCalendar logic
  const handleDayPress = useCallback((day: DateData) => {
    if (!selectingCheckOut || !checkIn) {
      setCheckIn(day.dateString);
      setCheckOut('');
      setSelectingCheckOut(true);
    } else {
      if (day.dateString > checkIn) {
        setCheckOut(day.dateString);
        setSelectingCheckOut(false);
        setShowCalendar(false);
      } else {
        setCheckIn(day.dateString);
        setCheckOut('');
      }
    }
  }, [checkIn, selectingCheckOut]);

  const getMarkedDates = useCallback(() => {
    const marked: Record<string, any> = {};

    // Mark unavailable/booked dates
    const unavailable = [
      ...((listing as any)?.unavailableDates || []).map((d: string | Date) =>
        typeof d === 'string' ? d : format(new Date(d), 'yyyy-MM-dd')
      ),
      ...((listing as any)?.bookedDates || []).flatMap((range: { start: string; end: string }) => {
        const dates: string[] = [];
        const start = new Date(range.start);
        const end = new Date(range.end);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          dates.push(format(new Date(d), 'yyyy-MM-dd'));
        }
        return dates;
      }),
    ];
    for (const d of unavailable) {
      marked[d] = { disabled: true, disableTouchEvent: true, textColor: Colors.textTertiary };
    }

    // Mark selected range
    if (checkIn) {
      marked[checkIn] = {
        ...(marked[checkIn] || {}),
        startingDay: true,
        color: Colors.primary,
        textColor: Colors.white,
      };
    }
    if (checkIn && checkOut) {
      marked[checkOut] = {
        ...(marked[checkOut] || {}),
        endingDay: true,
        color: Colors.primary,
        textColor: Colors.white,
      };
      let current = addDays(new Date(checkIn), 1);
      const end = new Date(checkOut);
      while (current < end) {
        const key = format(current, 'yyyy-MM-dd');
        if (!marked[key]?.disabled) {
          marked[key] = { color: Colors.primary + '20', textColor: Colors.primary };
        }
        current = addDays(current, 1);
      }
    }
    return marked;
  }, [checkIn, checkOut, listing]);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Price calculations — matching web BookingWidget exactly
  const hasValidDates = checkIn.length > 0 && checkOut.length > 0;
  const { subtotal, blocked: datesBlocked, nights } = hasValidDates
    ? calculateDateRangePrice(listing, checkIn, checkOut)
    : { subtotal: 0, blocked: false, nights: 0 };
  const pricePerNight = listing?.pricing?.perNight ?? 0;
  const cleaningFee = listing?.pricing?.cleaningFee ?? 0;
  const serviceFee = Math.round(subtotal * 0.1);
  const discountPercent = listing?.pricing?.discountPercent ?? 0;
  const discount = discountPercent > 0 ? Math.round(subtotal * (discountPercent / 100)) : 0;
  const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
  const vat = Math.round(taxableAmount * 0.15);
  const total = taxableAmount + vat - couponDiscount;

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
    const mapped = code ? errorMessages[code] : null;
    if (mapped) return isAr ? mapped.ar : mapped.en;
    if (errData?.message) return errData.message;
    return isAr ? 'فشل إنشاء الحجز. حاول مرة أخرى.' : 'Failed to create booking. Please try again.';
  };

  // Create hold (matches web BookingWidget behavior)
  const createHold = async () => {
    if (!hasValidDates || holdLoading) return;
    setHoldLoading(true);
    try {
      const res = await bookingsService.createHold({
        propertyId: isUnit ? (parentPropertyId || listingId!) : listingId!,
        ...(isUnit ? { unitId: listingId! } : {}),
        checkIn,
        checkOut,
        guests: { adults, children, infants: 0 },
      });
      if (res?.data?.holdId) {
        setHoldId(res.data.holdId);
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'DATES_UNAVAILABLE') {
        Alert.alert(
          t('common.error'),
          isAr
            ? 'هذه التواريخ محجوزة حالياً. يرجى اختيار تواريخ أخرى.'
            : 'These dates are currently taken. Please choose different dates.'
        );
        setCheckIn('');
        setCheckOut('');
        setShowCalendar(true);
      }
    } finally {
      setHoldLoading(false);
    }
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      // Create hold first if we don't have one
      let currentHoldId = holdId;
      if (!currentHoldId) {
        try {
          const holdRes = await bookingsService.createHold({
            propertyId: isUnit ? (parentPropertyId || listingId!) : listingId!,
            ...(isUnit ? { unitId: listingId! } : {}),
            checkIn,
            checkOut,
            guests: { adults, children, infants: 0 },
          });
          currentHoldId = holdRes?.data?.holdId ?? null;
        } catch (err) {
          console.debug('[checkout] createHold failed, proceeding without hold:', err);
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
        paymentMethod,
        couponCode: couponCode || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert(
        t('common.success'),
        isAr ? 'تم إنشاء حجزك بنجاح.' : 'Your reservation has been created.',
        [{ text: t('bookings.title'), onPress: () => router.replace('/(tabs)/bookings') }]
      );
    },
    onError: (error: any) => {
      const errData = error?.response?.data;
      Alert.alert(t('common.error'), getBookingErrorMessage(errData));
    },
  });

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const result = await couponsService.validate(couponCode, subtotal);
      if (result.valid) {
        setCouponDiscount(result.discount);
      } else {
        Alert.alert(t('common.error'), isAr ? 'كود الخصم غير صالح.' : 'This coupon code is not valid.');
      }
    } catch {
      Alert.alert(t('common.error'), isAr ? 'فشل التحقق من الكوبون.' : 'Failed to validate coupon.');
    }
  };

  if (isLoading || !listing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const displayPrice = discountPercent > 0
    ? Math.round(pricePerNight * (1 - discountPercent / 100))
    : pricePerNight;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('checkout.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Property Summary */}
        <View style={styles.propertyCard}>
          <Image source={{ uri: typeof listing.images?.[0] === 'string' ? listing.images[0] : listing.images?.[0]?.url }} style={styles.propertyImage} contentFit="cover" />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={2}>{listing.title}</Text>
            <Text style={styles.propertyLocation}>{listing.location?.city ?? ''}</Text>
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

          {/* Date display / toggle */}
          <View style={styles.dateRow}>
            <Pressable
              style={[styles.dateField, !selectingCheckOut && showCalendar && styles.dateFieldActive]}
              onPress={() => { setSelectingCheckOut(false); setShowCalendar(true); }}
            >
              <Text style={styles.dateLabel}>{t('search.checkIn')}</Text>
              <View style={styles.dateValueRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                <Text style={[styles.dateValue, !checkIn && styles.datePlaceholder]}>
                  {checkIn ? format(new Date(checkIn), 'MMM d, yyyy') : t('search.checkIn')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.dateField, selectingCheckOut && showCalendar && styles.dateFieldActive]}
              onPress={() => { setSelectingCheckOut(true); setShowCalendar(true); }}
            >
              <Text style={styles.dateLabel}>{t('search.checkOut')}</Text>
              <View style={styles.dateValueRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                <Text style={[styles.dateValue, !checkOut && styles.datePlaceholder]}>
                  {checkOut ? format(new Date(checkOut), 'MMM d, yyyy') : t('search.checkOut')}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Calendar */}
          {showCalendar && (
            <View style={styles.calendarContainer}>
              <Text style={styles.calendarHint}>
                {selectingCheckOut
                  ? (isAr ? 'اختر تاريخ المغادرة' : 'Select check-out date')
                  : (isAr ? 'اختر تاريخ الوصول' : 'Select check-in date')}
              </Text>
              <Calendar
                minDate={today}
                markingType="period"
                markedDates={getMarkedDates()}
                onDayPress={handleDayPress}
                theme={{
                  todayTextColor: Colors.primary,
                  arrowColor: Colors.primary,
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textMonthFontWeight: '600',
                  textDayHeaderFontSize: 12,
                }}
              />
            </View>
          )}

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

        {/* Price Breakdown */}
        {nights > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('checkout.priceBreakdown')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{formatCurrency(pricePerNight)} x {nights} {nights > 1 ? t('booking.nights') : t('booking.night')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {cleaningFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{isAr ? 'رسوم التنظيف' : 'Cleaning fee'}</Text>
                <Text style={styles.priceValue}>{formatCurrency(cleaningFee)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.serviceFee')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(serviceFee)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: Colors.success }]}>
                  {isAr ? `خصم (${discountPercent}%)` : `Discount (${discountPercent}%)`}
                </Text>
                <Text style={[styles.priceValue, { color: Colors.success }]}>-{formatCurrency(discount)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.vat')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(vat)}</Text>
            </View>
            {couponDiscount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: Colors.success }]}>{t('checkout.couponDiscount')}</Text>
                <Text style={[styles.priceValue, { color: Colors.success }]}>-{formatCurrency(couponDiscount)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('checkout.total')}</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        )}

        {/* Coupon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.discountCode')}</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder={t('checkout.enterCode')}
              placeholderTextColor={Colors.textTertiary}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <Pressable style={styles.couponButton} onPress={handleApplyCoupon}>
              <Text style={styles.couponButtonText}>{t('checkout.apply')}</Text>
            </Pressable>
          </View>
        </View>

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

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
          {PAYMENT_METHODS.map((method) => {
            // Only show BNPL if total is within range
            if ((method.id === 'tabby' || method.id === 'tamara') && total > 5000) return null;
            return (
              <Pressable
                key={method.id}
                style={[styles.methodRow, paymentMethod === method.id && styles.methodRowActive]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Ionicons name={method.icon as any} size={22} color={Colors.textPrimary} />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  {(method.id === 'tabby' || method.id === 'tamara') && total > 0 && (
                    <Text style={styles.methodSublabel}>
                      {isAr ? `4 دفعات × ${formatCurrency(Math.ceil(total / 4))} بدون فوائد` : `4 × ${formatCurrency(Math.ceil(total / 4))} interest-free`}
                    </Text>
                  )}
                </View>
                <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.payButton, (!canBook || holdLoading) && styles.payButtonDisabled]}
          onPress={() => canBook && bookMutation.mutate()}
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
                  : `${t('checkout.pay')} ${formatCurrency(total)}`}
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

  // Date picker
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateField: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  dateFieldActive: { borderColor: Colors.primary, borderWidth: 2 },
  dateLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  dateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateValue: { ...Typography.small, color: Colors.textPrimary },
  datePlaceholder: { color: Colors.textTertiary },
  calendarContainer: {
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  calendarHint: {
    ...Typography.caption,
    color: Colors.primary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    fontWeight: '600',
  },
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
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  priceLabel: { ...Typography.small, color: Colors.textSecondary },
  priceValue: { ...Typography.small, color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: Spacing.sm, paddingTop: Spacing.md },
  totalLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  totalValue: { ...Typography.bodyBold, color: Colors.primary },

  // Coupon
  couponRow: { flexDirection: 'row', gap: Spacing.sm },
  couponInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.small,
  },
  couponButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.base, borderRadius: Radius.sm, justifyContent: 'center' },
  couponButtonText: { ...Typography.smallBold, color: Colors.white },

  // Special requests
  specialRequestsInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Typography.small, color: Colors.textPrimary,
    minHeight: 80,
  },
  charCount: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'right', marginTop: 4 },

  // Payment method
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: Spacing.sm,
  },
  methodRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  methodInfo: { flex: 1 },
  methodLabel: { ...Typography.body, color: Colors.textPrimary },
  methodSublabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },

  // Footer
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  payButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
  payButtonDisabled: { opacity: 0.5 },
  payText: { ...Typography.bodyBold, color: Colors.white },
});
