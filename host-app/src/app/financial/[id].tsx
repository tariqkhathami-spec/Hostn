import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import { hostService } from '../../services/host.service';
import { formatCurrency, formatDate } from '../../utils/format';
import type { TransferDetail } from '../../types';

const statusColors: Record<string, string> = {
  completed: Colors.success,
  pending: Colors.warning,
  failed: Colors.error,
};

const statusLabels: Record<string, string> = {
  completed: 'مكتمل',
  pending: 'قيد المعالجة',
  failed: 'فشل',
};

const statusBgColors: Record<string, string> = {
  completed: '#dcfce7',
  pending: '#fef3c7',
  failed: '#fecaca',
};

const methodLabels: Record<string, string> = {
  bank: 'حوالة بنكية',
  stc_pay: 'STC Pay',
};

export default function TransferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transferDetail', id],
    queryFn: () => hostService.getTransferDetail(id!),
    enabled: !!id,
    retry: false,
  });

  const transfer: TransferDetail | undefined = data?.data;

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="تفاصيل الحوالة" showBack fallbackRoute="/financial/transfers" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !transfer) {
    return (
      <ScreenWrapper>
        <HeaderBar title="تفاصيل الحوالة" showBack fallbackRoute="/financial/transfers" />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const statusColor = statusColors[transfer.status] || Colors.warning;
  const statusBg = statusBgColors[transfer.status] || '#fef3c7';

  return (
    <ScreenWrapper>
      <HeaderBar title={transfer.transactionId} showBack fallbackRoute="/financial/transfers" />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>المبلغ الإجمالي</Text>
            <Text style={styles.amountValue}>{formatCurrency(transfer.amount)}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusTextBadge, { color: statusColor }]}>
                {statusLabels[transfer.status]}
              </Text>
            </View>
            <Text style={styles.detailLabel}>الحالة</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>
              {transfer.completionDate ? formatDate(transfer.completionDate) : formatDate(transfer.requestDate)}
            </Text>
            <Text style={styles.detailLabel}>تاريخ التنفيذ</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{methodLabels[transfer.method] || transfer.method}</Text>
            <Text style={styles.detailLabel}>طريقة التحويل</Text>
          </View>

          {transfer.accountNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{transfer.accountNumber}</Text>
              <Text style={styles.detailLabel}>رقم الحساب</Text>
            </View>
          )}
        </Card>

        {/* Reservations Section */}
        {transfer.reservations && transfer.reservations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>الحجوزات المرتبطة</Text>
            {transfer.reservations.map((reservation, index) => (
              <Card key={reservation.reservationId || index} style={styles.reservationCard}>
                <View style={styles.reservationHeader}>
                  <Text style={styles.reservationAmount}>{formatCurrency(reservation.amount)}</Text>
                  <Text style={styles.guestName}>{reservation.guestName}</Text>
                </View>

                <View style={styles.reservationSeparator} />

                <View style={styles.reservationDetailRow}>
                  <Text style={styles.reservationDetailValue}>{reservation.unitName}</Text>
                  <Text style={styles.reservationDetailLabel}>الوحدة</Text>
                </View>

                <View style={styles.reservationDetailRow}>
                  <Text style={styles.reservationDetailValue}>{formatDate(reservation.checkIn)}</Text>
                  <Text style={styles.reservationDetailLabel}>تاريخ الدخول</Text>
                </View>

                <View style={styles.reservationDetailRow}>
                  <Text style={styles.reservationDetailValue}>{formatDate(reservation.checkOut)}</Text>
                  <Text style={styles.reservationDetailLabel}>تاريخ الخروج</Text>
                </View>

                <View style={styles.reservationDetailRow}>
                  <View style={styles.nightsBadge}>
                    <Text style={styles.nightsText}>
                      {reservation.nights} {reservation.nights === 1 ? 'ليلة' : 'ليالي'}
                    </Text>
                  </View>
                  <Text style={styles.reservationDetailLabel}>عدد الليالي</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  summaryCard: {
    padding: Spacing.base,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  amountLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    ...Typography.h2,
    color: Colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextBadge: {
    ...Typography.caption,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  reservationCard: {
    padding: Spacing.base,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  reservationAmount: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  reservationSeparator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  reservationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  reservationDetailLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  reservationDetailValue: {
    ...Typography.small,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  nightsBadge: {
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  nightsText: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
});
