import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { hostService } from '../../services/host.service';
import { formatCurrency } from '../../utils/format';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { getLocale } from '../../utils/i18n';

const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface EarningMonth {
  month: number;
  year: number;
  earnings: number;
  bookings: number;
  avgPerBooking?: number;
}

export default function EarningsScreen() {
  const locale = getLocale();
  const isAr = locale === 'ar';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['earnings'],
    queryFn: () => hostService.getEarnings(),
    retry: false,
  });

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => hostService.getStats(),
    retry: false,
  });

  const earningsData: EarningMonth[] = data?.data?.monthly ?? data?.data ?? [];
  const totalEarnings = statsQuery.data?.data?.totalEarnings ?? data?.data?.total ?? 0;

  const renderMonth = ({ item }: { item: EarningMonth }) => {
    const monthName = isAr ? MONTH_NAMES_AR[item.month - 1] : MONTH_NAMES_EN[item.month - 1];
    return (
      <View style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthEarnings}>{formatCurrency(item.earnings)}</Text>
          <Text style={styles.monthName}>{monthName} {item.year}</Text>
        </View>
        <View style={styles.monthDetails}>
          <View style={styles.monthStat}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textTertiary} />
            <Text style={styles.monthStatText}>
              {item.bookings} {isAr ? 'حجوزات' : 'bookings'}
            </Text>
          </View>
          {item.avgPerBooking ? (
            <View style={styles.monthStat}>
              <Ionicons name="trending-up-outline" size={16} color={Colors.textTertiary} />
              <Text style={styles.monthStatText}>
                {isAr ? 'متوسط' : 'Avg'}: {formatCurrency(Math.round(item.avgPerBooking))}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <HeaderBar title={isAr ? 'الأرباح' : 'Earnings'} showBack />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={earningsData}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          renderItem={renderMonth}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListHeaderComponent={
            <View style={styles.totalCard}>
              <View style={styles.totalIconCircle}>
                <Ionicons name="wallet-outline" size={28} color={Colors.white} />
              </View>
              <Text style={styles.totalAmount}>{formatCurrency(totalEarnings)}</Text>
              <Text style={styles.totalLabel}>{isAr ? 'إجمالي الأرباح' : 'Total Earnings'}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="bar-chart-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{isAr ? 'لا توجد أرباح بعد' : 'No earnings yet'}</Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  totalCard: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  totalIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalAmount: { ...Typography.h1, color: Colors.white, marginBottom: Spacing.xs },
  totalLabel: { ...Typography.body, color: 'rgba(255,255,255,0.8)' },
  monthCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthName: { ...Typography.bodyBold, color: Colors.textPrimary },
  monthEarnings: { ...Typography.bodyBold, color: Colors.success },
  monthDetails: { flexDirection: 'row', gap: Spacing.lg },
  monthStat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  monthStatText: { ...Typography.caption, color: Colors.textTertiary },
  emptyText: { ...Typography.body, color: Colors.textTertiary },
});
