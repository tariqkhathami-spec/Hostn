import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { formatCurrency, formatDate } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';
import HeaderBar from '../../components/layout/HeaderBar';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    data: bookingData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['bookingDetail', id],
    queryFn: () => hostService.getBookingDetail(id!),
    enabled: !!id,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      hostService.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hostBookings'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingGuests'] });
      setIsUpdating(false);
      Alert.alert('تم بنجاح', 'تم تحديث حالة الحجز بنجاح');
    },
    onError: () => {
      setIsUpdating(false);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديث حالة الحجز. حاول مرة أخرى.');
    },
  });

  const handleStatusUpdate = (status: string, actionLabel: string) => {
    Alert.alert(
      'تأكيد',
      `هل أنت متأكد من ${actionLabel}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          onPress: () => {
            setIsUpdating(true);
            statusMutation.mutate({ bookingId: id!, status });
          },
        },
      ],
    );
  };

  const booking = bookingData?.data;

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="تفاصيل الحجز" showBack fallbackRoute="/(tabs)/reservations" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !booking) {
    return (
      <ScreenWrapper>
        <HeaderBar title="تفاصيل الحجز" showBack fallbackRoute="/(tabs)/reservations" />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const nights = calculateNights(booking.checkIn, booking.checkOut);

  return (
    <ScreenWrapper>
      <HeaderBar title="تفاصيل الحجز" showBack fallbackRoute="/(tabs)/reservations" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section: Status + Booking Number */}
        <View style={styles.topSection}>
          <StatusBadge status={booking.status} />
          <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
          {booking.reference ? (
            <Text style={styles.referenceLabel}>رقم الحجز: {booking.reference}</Text>
          ) : null}
        </View>

        {/* Guest Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>بيانات الضيف</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الاسم</Text>
              <Text style={styles.infoValue}>{booking.guestName}</Text>
            </View>
            {booking.guestPhone ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>الجوال</Text>
                <Text style={styles.infoValue}>{booking.guestPhone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Dates Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>مواعيد الحجز</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>تاريخ الدخول</Text>
              <Text style={styles.infoValue}>{formatDate(booking.checkIn)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>تاريخ الخروج</Text>
              <Text style={styles.infoValue}>{formatDate(booking.checkOut)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>عدد الليالي</Text>
              <Text style={styles.infoValue}>
                {nights} {nights === 1 ? 'ليلة' : 'ليالي'}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="home-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>العقار والوحدة</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>العقار</Text>
              <Text style={styles.infoValue}>{booking.propertyName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الوحدة</Text>
              <Text style={styles.infoValue}>{booking.unitName}</Text>
            </View>
          </View>
        </View>

        {/* Financial Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>التفاصيل المالية</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>المبلغ الإجمالي</Text>
              <Text style={styles.infoValueBold}>{formatCurrency(booking.totalAmount)}</Text>
            </View>
            {booking.hostAmount !== booking.totalAmount && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>مبلغ المضيف</Text>
                <Text style={styles.infoValueBold}>{formatCurrency(booking.hostAmount)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Creation Date */}
        <Text style={styles.createdAt}>
          تاريخ الإنشاء: {formatDate(booking.createdAt)}
        </Text>

        {/* Action Buttons */}
        {booking.status === 'pending' && (
          <View style={styles.actionsCard}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleStatusUpdate('rejected', 'رفض الحجز')}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                {isUpdating && statusMutation.variables?.status === 'rejected' ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#dc2626" />
                    <Text style={styles.rejectButtonText}>رفض الحجز</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleStatusUpdate('confirmed', 'قبول الحجز')}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                {isUpdating && statusMutation.variables?.status === 'confirmed' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                    <Text style={styles.acceptButtonText}>قبول الحجز</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {booking.status === 'confirmed' && (
          <View style={styles.actionsCard}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleStatusUpdate('cancelled', 'إلغاء الحجز')}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                {isUpdating && statusMutation.variables?.status === 'cancelled' ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="ban-outline" size={20} color="#dc2626" />
                    <Text style={styles.rejectButtonText}>إلغاء الحجز</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleStatusUpdate('completed', 'إتمام الحجز')}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                {isUpdating && statusMutation.variables?.status === 'completed' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={20} color="#ffffff" />
                    <Text style={styles.acceptButtonText}>إتمام الحجز</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  topSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  bookingNumber: {
    ...Typography.h3,
    color: Colors.primary,
  },
  referenceLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.card,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.primary50,
  },
  cardTitle: {
    ...Typography.smallBold,
    color: Colors.primary,
    textAlign: 'right',
  },
  cardBody: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  infoValue: {
    ...Typography.small,
    color: Colors.textPrimary,
    textAlign: 'left',
  },
  infoValueBold: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'left',
  },
  createdAt: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.card,
    padding: Spacing.base,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.md,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#059669',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  acceptButtonText: {
    ...Typography.smallBold,
    color: '#ffffff',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#dc2626',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  rejectButtonText: {
    ...Typography.smallBold,
    color: '#dc2626',
  },
});
