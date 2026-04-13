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
import { useLanguage } from '../../i18n';
import type { Booking } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.success,
  pending: Colors.warning,
  cancelled: Colors.error,
  completed: Colors.info,
  no_show: Colors.textTertiary,
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  paid: Colors.success,
  refunded: Colors.info,
  failed: Colors.error,
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { t } = useLanguage();

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
      Alert.alert(t('common.success'), t('status.cancelled'));
    },
    onError: () => {
      Alert.alert(t('common.error'), t('common.unexpectedError'));
    },
  });

  const handleCancel = () => {
    Alert.alert(
      t('booking.cancelBooking'),
      t('booking.cancelConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.ok'),
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

  const statusColor = STATUS_COLORS[booking.status] ?? Colors.textTertiary;
  const statusLabel = t(`status.${booking.status}` as any) || booking.status;
  const paymentStatusColor = PAYMENT_STATUS_COLORS[booking.paymentStatus] ?? Colors.textTertiary;
  const paymentStatusLabel = t(`status.${booking.paymentStatus}` as any) || booking.paymentStatus;
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
        <Text style={styles.headerTitle}>{t('booking.title')}</Text>
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
            <Text style={styles.statusLabel}>{t('booking.status')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>{t('booking.payment')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: paymentStatusColor }]}>
              <Text style={styles.statusBadgeText}>{paymentStatusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Booking Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.dates')}</Text>
          <View style={styles.datesCard}>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>{t('search.checkIn')}</Text>
              <Text style={styles.dateValue}>{formatDate(booking.checkIn)}</Text>
            </View>
            <View style={styles.dateDivider}>
              <Ionicons name="arrow-forward" size={18} color={Colors.textTertiary} />
              <Text style={styles.nightsText}>{nights} {nights !== 1 ? t('booking.nights') : t('booking.night')}</Text>
            </View>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>{t('search.checkOut')}</Text>
              <Text style={styles.dateValue}>{formatDate(booking.checkOut)}</Text>
            </View>
          </View>
        </View>

        {/* Guests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.guests')}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoValue}>
              {typeof booking.guests === 'object'
                ? `${(booking.guests as any).adults ?? 0} ${((booking.guests as any).adults ?? 0) !== 1 ? t('listing.guests') : t('booking.guest')}${((booking.guests as any).children ?? 0) > 0 ? `, ${(booking.guests as any).children} ${t('booking.guest')}` : ''}`
                : `${booking.guests} ${booking.guests !== 1 ? t('listing.guests') : t('booking.guest')}`}
            </Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.priceBreakdown')}</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.total')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.totalPrice)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.serviceFee')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.serviceFee)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('checkout.vat')}</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.vat)}</Text>
            </View>
            {(booking.discountAmount ?? 0) > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('checkout.couponDiscount')}</Text>
                <Text style={[styles.priceValue, { color: Colors.success }]}>
                  -{formatCurrency(booking.discountAmount!)}
                </Text>
              </View>
            )}
            {(booking.securityDeposit ?? 0) > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('booking.securityDeposit')}</Text>
                <Text style={styles.priceValue}>{formatCurrency(booking.securityDeposit!)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('checkout.total')}</Text>
              <Text style={styles.totalValue}>{formatCurrency(booking.totalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* Host Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.host')}</Text>
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
                  <Text style={styles.verifiedText}>{t('detail.verifiedHost')}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {/* Booking Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.reference')}</Text>
          <Text style={styles.referenceText}>{booking._id}</Text>
          <Text style={styles.bookedOnText}>
            {t('booking.bookedOn')} {formatDate(booking.createdAt)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.contactButton} onPress={handleContactHost}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.contactText}>{t('booking.contactHost')}</Text>
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
                  <Text style={styles.cancelText}>{t('booking.cancelBooking')}</Text>
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
