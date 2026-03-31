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

const PAYMENT_METHODS = [
  { id: 'card', label: 'Bank Card', icon: 'card-outline' },
  { id: 'tabby', label: 'Tabby', icon: 'pricetag-outline' },
  { id: 'tamara', label: 'Tamara', icon: 'pricetags-outline' },
] as const;

export default function CheckoutScreen() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { checkIn, checkOut, guests } = useSearchStore();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsService.getById(listingId!),
    enabled: !!listingId,
  });

  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 1;
  const subtotal = (listing?.price ?? 0) * nights;
  const serviceFee = Math.round(subtotal * 0.1);
  const vat = Math.round((subtotal + serviceFee) * 0.15);
  const total = subtotal + serviceFee + vat - couponDiscount;

  const bookMutation = useMutation({
    mutationFn: () =>
      bookingsService.create({
        property: listingId!,
        checkIn: checkIn!,
        checkOut: checkOut!,
        guests,
        paymentMethod,
        couponCode: couponCode || undefined,
      }),
    onSuccess: () => {
      Alert.alert('Booking Confirmed!', 'Your reservation has been created.', [
        { text: 'View Bookings', onPress: () => router.replace('/(tabs)/bookings') },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create booking.');
    },
  });

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const result = await couponsService.validate(couponCode, subtotal);
      if (result.valid) {
        setCouponDiscount(result.discount);
      } else {
        Alert.alert('Invalid Coupon', 'This coupon code is not valid.');
      }
    } catch {
      Alert.alert('Error', 'Failed to validate coupon.');
    }
  };

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
        <Text style={styles.title}>Review & Pay</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Property Summary */}
        <View style={styles.propertyCard}>
          <Image source={{ uri: listing.images[0] }} style={styles.propertyImage} contentFit="cover" />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={2}>{listing.title}</Text>
            <Text style={styles.propertyLocation}>{listing.city}</Text>
            {checkIn && checkOut && (
              <Text style={styles.propertyDates}>{formatDateRange(checkIn, checkOut)}</Text>
            )}
            <Text style={styles.propertyGuests}>{guests} guest{guests > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{formatCurrency(listing.price)} x {nights} night{nights > 1 ? 's' : ''}</Text>
            <Text style={styles.priceValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service fee</Text>
            <Text style={styles.priceValue}>{formatCurrency(serviceFee)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>VAT (15%)</Text>
            <Text style={styles.priceValue}>{formatCurrency(vat)}</Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: Colors.success }]}>Coupon discount</Text>
              <Text style={[styles.priceValue, { color: Colors.success }]}>-{formatCurrency(couponDiscount)}</Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Coupon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discount Code</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter code"
              placeholderTextColor={Colors.textTertiary}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <Pressable style={styles.couponButton} onPress={handleApplyCoupon}>
              <Text style={styles.couponButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
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
          style={styles.payButton}
          onPress={() => bookMutation.mutate()}
          disabled={bookMutation.isPending}
        >
          {bookMutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.payText}>Pay {formatCurrency(total)}</Text>
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
  payText: { ...Typography.bodyBold, color: Colors.white },
});
