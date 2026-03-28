import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostService } from '../../services/host.service';
import { Booking } from '../../types';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { formatCurrency, formatDate } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import HeaderBar from '../../components/layout/HeaderBar';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Tab = 'recent' | 'upcoming';

interface StatusFilter {
  key: string;
  label: string;
  color: string;
}

const statusFilters: StatusFilter[] = [
  { key: 'confirmed', label: 'مؤكد', color: '#22c55e' },
  { key: 'in_payment', label: 'جاري السداد', color: '#3b82f6' },
  { key: 'waiting', label: 'منتظي', color: '#eab308' },
  { key: 'cancelled', label: 'ملغي', color: '#ef4444' },
  { key: 'no_show', label: 'عدم حضور', color: '#6b7280' },
];

export default function ReservationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [page] = useState(1);

  const statusParam = selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined;

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
    isRefetching: bookingsRefetching,
  } = useQuery({
    queryKey: ['bookings', statusParam, page],
    queryFn: () => hostService.getBookings({ status: statusParam, page }),
    enabled: activeTab === 'recent',
    retry: false,
  });

  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
    isRefetching: upcomingRefetching,
  } = useQuery({
    queryKey: ['upcomingGuests'],
    queryFn: () => hostService.getUpcomingGuests(),
    enabled: activeTab === 'upcoming',
    retry: false,
  });

  const toggleStatus = useCallback((key: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }, []);

  const handleBookingPress = useCallback(
    (booking: Booking) => {
      router.push(`/reservations/${booking.id}` as any);
    },
    [router]
  );

  const bookings = bookingsData?.data || [];
  const upcomingGuests = upcomingData?.data || [];

  const renderBookingCard = useCallback(
    ({ item }: { item: Booking }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleBookingPress(item)}
        activeOpacity={0.7}
      >
        {/* Top row: booking number + date */}
        <View style={styles.cardTopRow}>
          <Text style={styles.bookingNumber}>#{item.bookingNumber}</Text>
          <Text style={styles.bookingDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Guest name */}
        <Text style={styles.guestName}>{item.guestName}</Text>

        {/* Property / unit */}
        <Text style={styles.propertyName}>
          {item.propertyName} - {item.unitName}
        </Text>

        {/* Date range */}
        <View style={styles.dateRangeRow}>
          <Text style={styles.dateRange}>
            {formatDate(item.checkIn)} ← {formatDate(item.checkOut)}
          </Text>
        </View>

        {/* Bottom row: amount + status */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
          <StatusBadge status={item.status} />
        </View>
      </TouchableOpacity>
    ),
    [handleBookingPress]
  );

  const isLoading = activeTab === 'recent' ? bookingsLoading : upcomingLoading;
  const isRefetching = activeTab === 'recent' ? bookingsRefetching : upcomingRefetching;
  const currentData = activeTab === 'recent' ? bookings : upcomingGuests;
  const onRefresh = activeTab === 'recent' ? refetchBookings : refetchUpcoming;

  return (
    <ScreenWrapper>
      <HeaderBar title={t('reservations.title')} />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
            {t('reservations.recent')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            {t('reservations.upcoming')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Filters (only for recent tab) */}
      {activeTab === 'recent' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScroll}
        >
          {statusFilters.map((filter) => {
            const isSelected = selectedStatuses.includes(filter.key);
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: filter.color + '20', borderColor: filter.color },
                ]}
                onPress={() => toggleStatus(filter.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
                <Text
                  style={[
                    styles.filterLabel,
                    isSelected && { color: filter.color, fontWeight: '600' },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              message={
                activeTab === 'recent'
                  ? 'لا توجد حجوزات'
                  : 'لا يوجد ضيوف قادمون'
              }
              submessage={
                activeTab === 'recent'
                  ? 'ستظهر الحجوزات هنا عند استلامها'
                  : 'ستظهر بيانات الضيوف القادمين هنا'
              }
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  filtersScroll: {
    backgroundColor: Colors.white,
    maxHeight: 56,
  },
  filtersContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
    gap: Spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingNumber: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
  bookingDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  guestName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  propertyName: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  dateRangeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  dateRange: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  cardBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  amount: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
});
