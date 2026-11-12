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
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Booking } from '../../types';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START, DirectionalIcon } from '../../constants/theme';
import { t } from '../../utils/i18n';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Tab = 'recent' | 'upcoming';

interface StatusFilter {
  key: string;
  label: string;
  color: string;
}

// statusFilters is built inside the component body so each render re-resolves
// t() against the current locale. Pre-fix, it was a module-scope const that
// captured t(...) at import time, freezing labels to whatever the bundle's
// locale was when the module was first loaded (B5).
//
// No useMemo: the array is 5 entries, t() is a Map lookup, and there's no
// dependent identity comparison downstream — just a .map render. Cheaper to
// rebuild than to memoize.

// No more mock bookings - using real API data only

// Statuses the API really has. The bookings list reports a pending request
// as 'waiting', the booking detail as 'pending': both mean the same thing.
const STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'بانتظار موافقتك',
  waiting: 'بانتظار موافقتك',
  confirmed: 'مؤكد',
  held: 'محجوز مؤقتاً',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  rejected: 'مرفوض',
};

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: '#eab308',
  waiting: '#eab308',
  confirmed: '#22c55e',
  held: '#177d5c',
  completed: '#22c55e',
  cancelled: '#ef4444',
  rejected: '#ef4444',
};

const STATUS_BG_MAP: Record<string, string> = {
  pending: '#fef9c3',
  waiting: '#fef9c3',
  confirmed: '#dcfce7',
  held: '#e6f4ef',
  completed: '#dcfce7',
  cancelled: '#fee2e2',
  rejected: '#fee2e2',
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
  const [searchText, setSearchText] = useState('');

  const statusFilters: StatusFilter[] = ['pending', 'confirmed', 'held', 'completed', 'cancelled', 'rejected'].map(
    (key) => ({ key, label: STATUS_LABEL_MAP[key], color: STATUS_COLOR_MAP[key] }),
  );

  const { data: bookings = [], isLoading, refetch } = useQuery({
    // 'list' keeps this cache entry apart from the dashboard's
    // ['bookings', 'recent'], which stores the wrapped { data } response;
    // sharing the key made this list render empty until a manual refresh.
    queryKey: ['bookings', 'list', activeTab, selectedStatus],
    queryFn: () =>
      activeTab === 'recent'
        ? // The server filters by status, so the chip covers every booking and
          // not only the newest page.
          hostService.getBookings({ page: 1, ...(selectedStatus ? { status: selectedStatus } : {}) }).then(r => r.data ?? [])
        : hostService.getUpcomingGuests().then(r => r.data ?? []),
    retry: false,
    refetchInterval: 30000,
  });

  // The upcoming-guests list has no status parameter: filter it here.
  const sameStatus = (status: string, wanted: string) =>
    (status === 'waiting' ? 'pending' : status) === wanted;
  const statusFiltered = selectedStatus && activeTab === 'upcoming'
    ? bookings.filter((b: Booking) => sameStatus(b.status, selectedStatus))
    : bookings;
  const needle = searchText.trim().toLowerCase();
  const filteredBookings = needle
    ? statusFiltered.filter((b: Booking) =>
        [b.guestName, b.bookingNumber, b.unitName].some((v) => String(v ?? '').toLowerCase().includes(needle)))
    : statusFiltered;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // New bookings should appear without a manual pull: reload whenever the
  // tab comes into view (tabs stay mounted, so mounting is not enough).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
        {/* Top row: booking ID + guest name first, then status badge, amount and date */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardRightInfo}>
            <Text style={styles.bookingId}>#{item.bookingNumber} - {item.guestName}</Text>
          </View>
          <View style={styles.cardLeftInfo}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            <Text style={styles.cardAmount}>{item.totalAmount} ر.س</Text>
            <Text style={styles.cardDate}>{item.createdAt}</Text>
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
      {/* Header: white background, back arrow first, centered title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any)}>
          <Ionicons name={DirectionalIcon.back} size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reservations.title')}</Text>
        <View style={styles.headerSide} />
      </View>

      {/* Two-tab toggle */}
      <View style={styles.tabBar}>
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
      </View>

      {/* Search by guest, booking number or unit */}
      <View style={styles.searchRow}>
        <View style={styles.searchButton}>
          <Ionicons name="search" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="ابحث باسم الضيف أو رقم الحجز"
            placeholderTextColor={Colors.textTertiary}
            textAlign="right"
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
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
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    ...Typography.small,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
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
    alignItems: 'flex-start',
  },
  cardLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bookingId: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
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
    textAlign: TEXT_START,
    marginBottom: 4,
  },
  dateRange: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
    marginBottom: 4,
  },
  unitName: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
  },
});
