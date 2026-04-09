import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../../services/bookings.service';
import { formatCurrency, formatDate, formatDateRange, getNights } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import type { Booking } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  confirmed: { color: Colors.success, label: 'Confirmed' },
  pending: { color: Colors.warning, label: 'Pending' },
  cancelled: { color: Colors.error, label: 'Cancelled' },
  completed: { color: Colors.info, label: 'Completed' },
  no_show: { color: Colors.textTertiary, label: 'No Show' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: Colors.warning, label: 'Pending' },
  paid: { color: Colors.success, label: 'Paid' },
  refunded: { color: Colors.info, label: 'Refunded' },
  failed: { color: Colors.error, label: 'Failed' },
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.getById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsService.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    },
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ]
    );
  };

  const handleContactHost = () => {
    if (!booking) return;
    const hostName = booking.host?.name ?? booking.host?.firstName ?? '';
    router.push({
      pathname: `/chat/${booking.host._id}`,
      params: { propertyId: booking.property._id, hostName },
    });
  };

  const handleViewProperty = () => {
    if (!booking) return;
    router.push(`/listing/${booking.property._id}`);
  };

  const handleViewHost = () => {
    if (!booking) return;
    router.push(`/host/${booking.host._id}`);
  };

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[booking.status] ?? { color: Colors.textTertiary, label: booking.status };
  const paymentStatus = PAYMENT_STATUS_CONFIG[booking.paymentStatus] ?? { color: Colors.textTertiary, label: booking.paymentStatus };
  const nights = getNights(booking.checkIn, booking.checkOut);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const imageUri = typeof booking.property?.images?.[0] === 'string'
    ? booking.property.images[0]
    : booking.property?.images?.[0]?.url;

  const hostName = booking.host?.name
    ?? (`${booking.host?.firstName ?? ''} ${booking.host?.lastName ?? ''}`.trim() || 'Host');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Property Card */}
        <Pressable style={styles.propertyCard} onPress={handleViewProperty}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.propertyImage} contentFit="cover" />
          )}
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={2}>{booking.property.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {booking.property.location?.city ?? ''}
                {booking.property.location?.district ? `, ${booking.property.location.district}` : ''}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Status Badges */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Booking Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusBadgeText}>{status.label}</Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Payment</Text>
            <View style={[styles.statusBadge, { backgroundColor: paymentStatus.color }]}>
              <Text style={styles.statusBadgeText}>{paymentStatus.label}</Text>
            </View>
          </View>
        </View>

        {/* Booking Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.datesCard}>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>Check-in</Text>
              <Text style={styles.dateValue}>{formatDate(booking.checkIn)}</Text>
            </View>
            <View style={styles.dateDivider}>
              <Ionicons name="arrow-forward" size={18} color={Colors.textTertiary} />
              <Text style={styles.nightsText}>{nights} night{nights !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>Check-out</Text>
              <Text style={styles.dateValue}>{formatDate(booking.checkOut)}</Text>
            </View>
          </View>
        </View>

        {/* Guests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guests</Text>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoValue}>{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Price</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.totalPrice)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Service Fee</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.serviceFee)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>VAT</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.vat)}</Text>
            </View>
            {(booking.discountAmount ?? 0) > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Discount</Text>
                <Text style={[styles.priceValue, { color: Colors.success }]}>
                  -{formatCurrency(booking.discountAmount!)}
                </Text>
              </View>
            )}
            {(booking.securityDeposit ?? 0) > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Security Deposit</Text>
                <Text style={styles.priceValue}>{formatCurrency(booking.securityDeposit!)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(booking.totalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* Host Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Host</Text>
          <Pressable style={styles.hostCard} onPress={handleViewHost}>
            <View style={styles.hostAvatar}>
              {booking.host?.avatar ? (
                <Image source={{ uri: booking.host.avatar }} style={styles.hostAvatarImage} />
              ) : (
                <Ionicons name="person" size={28} color={Colors.textSecondary} />
              )}
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{hostName}</Text>
              {booking.host?.isVerified && (
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.verifiedText}>Verified host</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {/* Booking Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Reference</Text>
          <Text style={styles.referenceText}>{booking._id}</Text>
          <Text style={styles.bookedOnText}>
            Booked on {formatDate(booking.createdAt)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.contactButton} onPress={handleContactHost}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.contactText}>Contact Host</Text>
          </Pressable>

          {canCancel && (
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={Colors.white} />
                  <Text style={styles.cancelText}>Cancel Booking</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.base },

  // Property Card
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  propertyImage: { width: 110, height: 100 },
  propertyInfo: { flex: 1, padding: Spacing.md, justifyContent: 'center' },
  propertyTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  locationText: { ...Typography.caption, color: Colors.textSecondary },

  // Status
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  statusItem: { alignItems: 'center', gap: Spacing.sm },
  statusLabel: { ...Typography.caption, color: Colors.textSecondary },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  statusBadgeText: { ...Typography.smallBold, color: Colors.white },

  // Section
  section: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.md },

  // Dates
  datesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
  },
  dateColumn: { flex: 1 },
  dateLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.xs },
  dateValue: { ...Typography.bodyBold, color: Colors.textPrimary },
  dateDivider: { alignItems: 'center', paddingHorizontal: Spacing.md },
  nightsText: { ...Typography.tiny, color: Colors.textTertiary, marginTop: 2 },

  // Guests
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoValue: { ...Typography.body, color: Colors.textPrimary },

  // Price
  priceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { ...Typography.small, color: Colors.textSecondary },
  priceValue: { ...Typography.small, color: Colors.textPrimary },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  totalLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  totalValue: { ...Typography.bodyBold, color: Colors.primary },

  // Host
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  hostAvatarImage: { width: 50, height: 50 },
  hostInfo: { flex: 1 },
  hostName: { ...Typography.bodyBold, color: Colors.textPrimary },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifiedText: { ...Typography.caption, color: Colors.success },

  // Reference
  referenceText: { ...Typography.caption, color: Colors.textTertiary, fontFamily: 'monospace' },
  bookedOnText: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },

  // Actions
  actions: { marginTop: Spacing.xl, gap: Spacing.md },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  contactText: { ...Typography.bodyBold, color: Colors.primary },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  cancelText: { ...Typography.bodyBold, color: Colors.white },
});
