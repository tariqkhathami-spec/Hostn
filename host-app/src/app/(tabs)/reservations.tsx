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
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Booking } from '../../types';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t } from '../../utils/i18n';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Tab = 'recent' | 'upcoming';

interface StatusFilter {
  key: string;
  label: string;
  color: string;
}

const statusFilters: StatusFilter[] = [
  { key: 'confirmed', label: t('reservations.confirmed'), color: '#22c55e' },
  { key: 'in_payment', label: t('reservations.inPayment'), color: '#3b82f6' },
  { key: 'waiting', label: t('reservations.waiting'), color: '#eab308' },
  { key: 'cancelled', label: t('reservations.cancelled'), color: '#ef4444' },
  { key: 'no_show', label: t('reservations.noShow'), color: '#6b7280' },
];

// No more mock bookings - using real API data only

const STATUS_LABEL_MAP: Record<string, string> = {
  confirmed: 'مؤكد',
  in_payment: 'جاري السداد',
  waiting: 'منتظر',
  cancelled: 'ملغي',
  no_show: 'عدم حضور',
  completed: 'مكتمل',
};

const STATUS_COLOR_MAP: Record<string, string> = {
  confirmed: '#22c55e',
  in_payment: '#3b82f6',
  waiting: '#eab308',
  cancelled: '#ef4444',
  no_show: '#6b7280',
  completed: '#22c55e',
};

const STATUS_BG_MAP: Record<string, string> = {
  confirmed: '#dcfce7',
  in_payment: '#dbeafe',
  waiting: '#fef9c3',
  cancelled: '#fee2e2',
  no_show: '#f3f4f6',
  completed: '#dcfce7',
};

// Helpers for Arabic date formatting
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function formatArabicDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = ARABIC_DAYS[d.getDay()];
  const date = String(d.getDate()).padStart(2, '0');
  const month = ARABIC_MONTHS[d.getMonth()];
  return `${day} ${date} ${month}`;
}

export default function ReservationsTabScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () =>
      activeTab === 'recent'
        ? hostService.getBookings({ page: 1 }).then(r => r.data ?? [])
        : hostService.getUpcomingGuests().then(r => r.data ?? []),
    retry: false,
  });

  // Use real API data only (no mock fallback)
  const displayBookings = bookings;

  const filteredBookings = selectedStatus
    ? displayBookings.filter((b: Booking) => b.status === selectedStatus)
    : displayBookings;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const statusColor = STATUS_COLOR_MAP[item.status] || '#6b7280';
    const statusBg = STATUS_BG_MAP[item.status] || '#f3f4f6';
    const statusLabel = STATUS_LABEL_MAP[item.status] || item.status;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => router.push(`/reservations/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Top row: booking ID + guest name (right) | date + amount + status badge (left) */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardLeftInfo}>
            <Text style={styles.cardDate}>{item.createdAt}</Text>
            <Text style={styles.cardAmount}>{item.totalAmount} ر.س</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <View style={styles.cardRightInfo}>
            <Text style={styles.bookingId}>#{item.bookingNumber} - {item.guestName}</Text>
          </View>
        </View>

        {/* Property name */}
        <Text style={styles.propertyName}>{item.propertyName}</Text>

        {/* Date range */}
        <Text style={styles.dateRange}>
          من {formatArabicDate(item.checkIn)} الى {formatArabicDate(item.checkOut)}
        </Text>

        {/* Unit name */}
        <Text style={styles.unitName}>{item.unitName}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper backgroundColor={Colors.white}>
      {/* Header: white background, centered title, back arrow on right */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>{t('reservations.title')}</Text>
        <TouchableOpacity style={styles.headerSide} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any)}>
          <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Two-tab toggle */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}
          >
            {t('reservations.upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <Text
            style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}
          >
            {t('reservations.recent')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search/filter row */}
      <View style={styles.searchRow}>
        <TouchableOpacity style={styles.searchBackArrow}>
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.searchRowRight}>
          <TouchableOpacity style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>{t('common.search')}</Text>
            <Ionicons name="search" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status filter dots row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={styles.filterItem}
            onPress={() =>
              setSelectedStatus(
                selectedStatus === filter.key ? null : filter.key
              )
            }
          >
            <Text
              style={[
                styles.filterLabel,
                selectedStatus === filter.key && { color: filter.color, fontWeight: '700' },
              ]}
            >
              {filter.label}
            </Text>
            <View
              style={[
                styles.filterDot,
                { backgroundColor: filter.color },
                selectedStatus === filter.key && styles.filterDotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Booking list */}
      {isLoading && bookings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{t('common.empty')}</Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  headerSide: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md - 2,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.small,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.textWhite,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  searchRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 6,
  },
  searchButtonText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  infoButton: {
    padding: Spacing.xs,
  },
  searchBackArrow: {
    padding: Spacing.xs,
  },

  // Status filter dots
  filterRow: {
    maxHeight: 50,
    marginBottom: Spacing.xs,
  },
  filterContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.lg,
    alignItems: 'center',
  },
  filterItem: {
    alignItems: 'center',
    gap: 4,
  },
  filterLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.sm,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },

  // Booking card
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cardRightInfo: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  cardLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bookingId: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  cardDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  cardAmount: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  propertyName: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
  },
  dateRange: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginBottom: 4,
  },
  unitName: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
});
