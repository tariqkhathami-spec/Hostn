import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { bookingsService } from '../../services/bookings.service';
import { couponsService } from '../../services/coupons.service';
import { useSearchStore } from '../../store/searchStore';
import { formatCurrency, formatDateRange, getNights } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';

export default function CheckoutScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const searchStore = useSearchStore();

  // Local state for dates/guests — initialize from search store
  const [checkIn, setCheckIn] = useState(searchStore.checkIn || '');
  const [checkOut, setCheckOut] = useState(searchStore.checkOut || '');
  const [guestCount, setGuestCount] = useState(Math.max(1, searchStore.guests));

  const PAYMENT_METHODS = [
    { id: 'card', label: t('checkout.bankCard'), icon: 'card-outline' },
    { id: 'tabby', label: 'Tabby', icon: 'pricetag-outline' },
    { id: 'tamara', label: 'Tamara', icon: 'pricetags-outline' },
  ] as const;
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsService.getById(listingId!),
    enabled: !!listingId,
  });

  const hasValidDates = checkIn.length > 0 && checkOut.length > 0;
  const nights = hasValidDates ? getNights(checkIn, checkOut) : 1;
  const nightlyRate = listing?.discountedPrice ?? listing?.pricing?.perNight ?? 0;
  const subtotal = nightlyRate * (hasValidDates ? nights : 1);
  const serviceFee = Math.round(subtotal * 0.1);
  const vat = Math.round((subtotal + serviceFee) * 0.15);
  const total = subtotal + serviceFee + vat - couponDiscount;

  const canBook = hasValidDates && guestCount >= 1 && nights > 0;

  const bookMutation = useMutation({
    mutationFn: () =>
      bookingsService.create({
        propertyId: listingId!,
        checkIn,
        checkOut,
        guests: guestCount,
        paymentMethod,
        couponCode: couponCode || undefined,
      }),
    onSuccess: () => {
      Alert.alert(
        t('common.success'),
        language === 'ar' ? 'تم إنشاء حجزك بنجاح.' : 'Your reservation has been created.',
        [{ text: t('bookings.title'), onPress: () => router.replace('/(tabs)/bookings') }]
      );
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || 'Failed to create booking.');
    },
  });

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const result = await couponsService.validate(couponCode, subtotal);
      if (result.valid) {
        setCouponDiscount(result.discount);
      } else {
        Alert.alert(t('common.error'), language === 'ar' ? 'كود الخصم غير صالح.' : 'This coupon code is not valid.');
      }
    } catch {
      Alert.alert(t('common.error'), language === 'ar' ? 'فشل التحقق من الكوبون.' : 'Failed to validate coupon.');
    }
  };

  // Generate tomorrow and day after as defaults
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const defaultCheckIn = tomorrow.toISOString().split('T')[0];
  const defaultCheckOut = dayAfter.toISOString().split('T')[0];

  if (isLoading || !listing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

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
            <Text style={styles.propertyGuests}>{guestCount} {guestCount > 1 ? t('listing.guests') : t('booking.guest')}</Text>
          </View>
        </View>

        {/* Dates & Guests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.dates')} & {t('booking.guests')}</Text>

          {/* Date inputs */}
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{t('search.checkIn')}</Text>
              <TextInput
                style={styles.dateInput}
                placeholder={defaultCheckIn}
                placeholderTextColor={Colors.textTertiary}
                value={checkIn}
                onChangeText={setCheckIn}
                keyboardType="default"
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{t('search.checkOut')}</Text>
              <TextInput
                style={styles.dateInput}
                placeholder={defaultCheckOut}
                placeholderTextColor={Colors.textTertiary}
                value={checkOut}
                onChangeText={setCheckOut}
                keyboardType="default"
              />
            </View>
          </View>

          {!hasValidDates && (
            <Pressable
              style={styles.quickDateButton}
              onPress={() => { setCheckIn(defaultCheckIn); setCheckOut(defaultCheckOut); }}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.quickDateText}>
                {language === 'ar' ? 'حجز ليلة واحدة (غدًا)' : 'Book 1 night (tomorrow)'}
              </Text>
            </Pressable>
          )}

          {/* Guest counter */}
          <View style={styles.guestRow}>
            <Text style={styles.guestLabel}>{t('booking.guests')}</Text>
            <View style={styles.guestCounter}>
              <Pressable
                style={styles.guestButton}
                onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
              >
                <Ionicons name="remove" size={18} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.guestCount}>{guestCount}</Text>
              <Pressable
                style={styles.guestButton}
                onPress={() => setGuestCount(Math.min(listing.capacity?.maxGuests ?? 20, guestCount + 1))}
              >
                <Ionicons name="add" size={18} color={Colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.priceBreakdown')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{formatCurrency(nightlyRate)} x {hasValidDates ? nights : 1} {(hasValidDates ? nights : 1) > 1 ? t('booking.nights') : t('booking.night')}</Text>
            <Text style={styles.priceValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('checkout.serviceFee')}</Text>
            <Text style={styles.priceValue}>{formatCurrency(serviceFee)}</Text>
          </View>
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

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
          {PAYMENT_METHODS.map((method) => (
            <Pressable
              key={method.id}
              style={[styles.methodRow, paymentMethod === method.id && styles.methodRowActive]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Ionicons name={method.icon as any} size={22} color={Colors.textPrimary} />
              <Text style={styles.methodLabel}>{method.label}</Text>
              <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.payButton, !canBook && styles.payButtonDisabled]}
          onPress={() => canBook && bookMutation.mutate()}
          disabled={!canBook || bookMutation.isPending}
        >
          {bookMutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.payText}>
              {canBook
                ? `${t('checkout.pay')} ${formatCurrency(total)}`
                : language === 'ar' ? 'اختر التواريخ أولًا' : 'Select dates first'}
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
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateField: { flex: 1 },
  dateLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  dateInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.small,
    color: Colors.textPrimary,
  },
  quickDateButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, marginTop: Spacing.sm,
  },
  quickDateText: { ...Typography.small, color: Colors.primary },
  guestRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  guestLabel: { ...Typography.body, color: Colors.textPrimary },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  guestButton: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  guestCount: { ...Typography.bodyBold, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  priceLabel: { ...Typography.small, color: Colors.textSecondary },
  priceValue: { ...Typography.small, color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: Spacing.sm, paddingTop: Spacing.md },
  totalLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  totalValue: { ...Typography.bodyBold, color: Colors.primary },
  couponRow: { flexDirection: 'row', gap: Spacing.sm },
  couponInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.small,
  },
  couponButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.base, borderRadius: Radius.sm, justifyContent: 'center' },
  couponButtonText: { ...Typography.smallBold, color: Colors.white },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: Spacing.sm,
  },
  methodRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary50 },
  methodLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  footer: { padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider },
  payButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
  payButtonDisabled: { opacity: 0.5 },
  payText: { ...Typography.bodyBold, color: Colors.white },
});
