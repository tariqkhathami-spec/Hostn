import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Input from '../../components/ui/Input';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { propertyService } from '../../services/property.service';
import { bookingService } from '../../services/booking.service';
import { useSearchStore } from '../../store/searchStore';
import { formatCurrency, formatDate, formatNights } from '../../utils/format';

type PaymentMethod = 'bank_card' | 'pay_later';

export default function CheckoutScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const dates = useSearchStore((s) => s.dates);
  const guests = useSearchStore((s) => s.guests);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => propertyService.getById(propertyId!),
    enabled: !!propertyId,
  });

  const checkIn = dates.checkIn ?? '';
  const checkOut = dates.checkOut ?? '';
  const nights = checkIn && checkOut ? formatNights(checkIn, checkOut) : 1;

  const perNight = property?.pricing?.perNight ?? 0;
  const cleaningFee = property?.pricing?.cleaningFee ?? 0;
  const subtotal = perNight * nights;
  const serviceFee = Math.round(subtotal * 0.1);
  const vat = Math.round((subtotal + cleaningFee + serviceFee) * 0.15);
  const total = subtotal + cleaningFee + serviceFee + vat;

  const handleConfirmBooking = async () => {
    if (!property) return;

    if (paymentMethod === 'bank_card') {
      if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        Alert.alert('Missing Information', 'Please fill in all card details.');
        return;
      }
    }

    setIsSubmitting(true);
    setShowLoadingModal(true);

    try {
      await bookingService.create({
        property: property._id,
        checkIn: checkIn || new Date().toISOString(),
        checkOut: checkOut || new Date(Date.now() + 86400000).toISOString(),
        guests: { adults: guests.adults, children: guests.children },
      });

      setShowLoadingModal(false);
      router.replace('/checkout/confirmation');
    } catch (error: any) {
      setShowLoadingModal(false);
      Alert.alert(
        'Booking Failed',
        error?.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="Checkout" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!property) {
    return (
      <ScreenWrapper>
        <HeaderBar title="Checkout" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Property not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const primaryImage = property.images.find((img) => img.isPrimary) ?? property.images[0];

  return (
    <ScreenWrapper>
      <HeaderBar title="Checkout" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Property Summary Card */}
        <View style={styles.propertyCard}>
          <Image
            source={{ uri: primaryImage?.url }}
            style={styles.propertyImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName} numberOfLines={2}>
              {property.title}
            </Text>
            <View style={styles.propertyLocation}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.propertyLocationText}>
                {property.location.city}
              </Text>
            </View>
            <View style={styles.propertyRating}>
              <Ionicons name="star" size={14} color={Colors.star} />
              <Text style={styles.propertyRatingText}>
                {property.ratings.average.toFixed(1)} ({property.ratings.count})
              </Text>
            </View>
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Check-in</Text>
              <Text style={styles.dateValue}>
                {checkIn ? formatDate(checkIn, 'MMM dd, yyyy') : 'Select date'}
              </Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Check-out</Text>
              <Text style={styles.dateValue}>
                {checkOut ? formatDate(checkOut, 'MMM dd, yyyy') : 'Select date'}
              </Text>
            </View>
          </View>
          <Text style={styles.nightsText}>
            {nights} night{nights > 1 ? 's' : ''} &middot; {guests.adults} adult
            {guests.adults > 1 ? 's' : ''}
            {guests.children > 0
              ? `, ${guests.children} child${guests.children > 1 ? 'ren' : ''}`
              : ''}
          </Text>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {formatCurrency(perNight)} x {nights} night{nights > 1 ? 's' : ''}
            </Text>
            <Text style={styles.priceValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Cleaning fee</Text>
            <Text style={styles.priceValue}>{formatCurrency(cleaningFee)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service fee (10%)</Text>
            <Text style={styles.priceValue}>{formatCurrency(serviceFee)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>VAT (15%)</Text>
            <Text style={styles.priceValue}>{formatCurrency(vat)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'bank_card' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('bank_card')}
          >
            <View style={styles.radioOuter}>
              {paymentMethod === 'bank_card' && <View style={styles.radioInner} />}
            </View>
            <Ionicons name="card-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.paymentOptionText}>Bank Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'pay_later' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('pay_later')}
          >
            <View style={styles.radioOuter}>
              {paymentMethod === 'pay_later' && <View style={styles.radioInner} />}
            </View>
            <Ionicons name="time-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.paymentOptionText}>Pay Later</Text>
          </TouchableOpacity>

          {paymentMethod === 'bank_card' && (
            <View style={styles.cardForm}>
              <Input
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '').slice(0, 16);
                  const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
                  setCardNumber(formatted);
                }}
                keyboardType="number-pad"
                maxLength={19}
              />
              <View style={styles.cardRow}>
                <View style={styles.cardHalf}>
                  <Input
                    label="Expiry Date"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '').slice(0, 4);
                      if (cleaned.length >= 3) {
                        setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
                      } else {
                        setCardExpiry(cleaned);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View style={styles.cardHalf}>
                  <Input
                    label="CVV"
                    placeholder="123"
                    value={cardCvv}
                    onChangeText={(text) => setCardCvv(text.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>{formatCurrency(total)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.textWhite} />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      <Modal visible={showLoadingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.modalText}>Processing your booking...</Text>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  // Property Card
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  propertyImage: {
    width: 100,
    height: 100,
  },
  propertyInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  propertyName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  propertyLocationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  propertyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  propertyRatingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Dates
  datesRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  dateBox: {
    flex: 1,
    padding: Spacing.base,
  },
  dateDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  dateLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dateValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  nightsText: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  priceLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  priceValue: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  totalLabel: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  totalValue: {
    ...Typography.subtitle,
    color: Colors.primary,
  },

  // Payment
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  paymentOptionText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },

  // Card Form
  cardForm: {
    marginTop: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cardHalf: {
    flex: 1,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.bottomBar,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomTotalLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  bottomTotalValue: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    ...Shadows.button,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.base,
    minWidth: 200,
  },
  modalText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
