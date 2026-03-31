import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { bookingsService } from '../../services/bookings.service';
import { formatCurrency, formatDateRange } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import type { Booking } from '../../types';

const TABS = ['upcoming', 'previous'] as const;

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.success,
  pending: Colors.warning,
  cancelled: Colors.error,
  completed: Colors.info,
};

export default function BookingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'previous'>('upcoming');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () => bookingsService.getMyBookings(activeTab),
  });

  const bookings = data ?? [];

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <Pressable
      style={styles.bookingCard}
      onPress={() => router.push(`/listing/${item.property._id}`)}
    >
      <Image
        source={{ uri: item.property.images[0] }}
        style={styles.bookingImage}
        contentFit="cover"
      />
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingTitle} numberOfLines={1}>{item.property.title}</Text>
        <Text style={styles.bookingDates}>{formatDateRange(item.checkIn, item.checkOut)}</Text>
        <View style={styles.bookingBottom}>
          <Text style={styles.bookingPrice}>{formatCurrency(item.totalPrice)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? Colors.textTertiary }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>My Bookings</Text>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming'
              ? 'Your upcoming reservations will appear here'
              : 'Your past reservations will appear here'}
          </Text>
          {activeTab === 'upcoming' && (
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.ctaText}>Browse Properties</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          renderItem={renderBookingCard}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.xs,
  },
  tabActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  tabText: { ...Typography.small, color: Colors.textSecondary },
  tabTextActive: { ...Typography.smallBold, color: Colors.primary },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.base },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  bookingImage: { width: 100, height: 100 },
  bookingInfo: { flex: 1, padding: Spacing.md, justifyContent: 'space-between' },
  bookingTitle: { ...Typography.smallBold, color: Colors.textPrimary },
  bookingDates: { ...Typography.caption, color: Colors.textSecondary },
  bookingBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingPrice: { ...Typography.smallBold, color: Colors.primary },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.xs },
  statusText: { ...Typography.tiny, color: Colors.white, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  ctaButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md },
  ctaText: { ...Typography.bodyBold, color: Colors.white },
  loader: { flex: 1, justifyContent: 'center' },
});
