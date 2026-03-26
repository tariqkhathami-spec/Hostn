import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { bookingService } from '../../services/booking.service';
import { formatCurrency, formatDate } from '../../utils/format';
import type { Booking, Property } from '../../types';

type Segment = 'upcoming' | 'previous';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: Colors.warning },
  confirmed: { bg: '#E8F5E9', text: Colors.success },
  cancelled: { bg: '#FFEBEE', text: Colors.error },
  completed: { bg: '#E3F2FD', text: Colors.info },
  rejected: { bg: '#FFEBEE', text: Colors.error },
};

function EmptyState({ segment }: { segment: Segment }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={segment === 'upcoming' ? 'calendar-outline' : 'time-outline'}
        size={64}
        color={Colors.textLight}
      />
      <Text style={styles.emptyTitle}>
        {segment === 'upcoming'
          ? 'No upcoming bookings'
          : 'No previous bookings'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {segment === 'upcoming'
          ? 'Your confirmed reservations will appear here'
          : 'Your past stays will appear here'}
      </Text>
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState<Segment>('upcoming');

  const {
    data: bookings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingService.getMyBookings(),
  });

  const today = new Date().toISOString().split('T')[0];

  const { upcoming, previous } = useMemo(() => {
    const all = bookings ?? [];
    const up: Booking[] = [];
    const prev: Booking[] = [];

    all.forEach((b) => {
      const isUpcoming =
        ['pending', 'confirmed'].includes(b.status) && b.checkIn >= today;
      if (isUpcoming) {
        up.push(b);
      } else {
        prev.push(b);
      }
    });

    return { upcoming: up, previous: prev };
  }, [bookings, today]);

  const currentData = segment === 'upcoming' ? upcoming : previous;

  const handleCancel = useCallback(
    (booking: Booking) => {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await bookingService.cancel(booking._id);
                queryClient.invalidateQueries({ queryKey: ['myBookings'] });
              } catch {}
            },
          },
        ],
      );
    },
    [queryClient],
  );

  const renderBookingCard = useCallback(
    ({ item }: { item: Booking }) => {
      const property = item.property as Property;
      const imageUrl = property?.images?.[0]?.url;
      const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
      const isUpcoming =
        segment === 'upcoming' &&
        ['pending', 'confirmed'].includes(item.status);

      return (
        <TouchableOpacity
          style={[styles.bookingCard, Shadows.card]}
          activeOpacity={0.9}
          onPress={() => router.push(`/booking/${item._id}`)}
        >
          <View style={styles.bookingRow}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.bookingImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.bookingInfo}>
              <Text style={styles.propertyName} numberOfLines={1}>
                {property?.title ?? 'Property'}
              </Text>
              <Text style={styles.bookingDates}>
                {formatDate(item.checkIn, 'MMM dd')} -{' '}
                {formatDate(item.checkOut, 'MMM dd, yyyy')}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusStyle.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusStyle.text }]}
                  >
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
                <Text style={styles.totalPrice}>
                  {formatCurrency(item.pricing.total)}
                </Text>
              </View>
            </View>
          </View>
          {isUpcoming && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [segment, handleCancel, router],
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Segment Tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            segment === 'upcoming' && styles.segmentActive,
          ]}
          onPress={() => setSegment('upcoming')}
        >
          <Text
            style={[
              styles.segmentText,
              segment === 'upcoming' && styles.segmentTextActive,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            segment === 'previous' && styles.segmentActive,
          ]}
          onPress={() => setSegment('previous')}
        >
          <Text
            style={[
              styles.segmentText,
              segment === 'previous' && styles.segmentTextActive,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={
            currentData.length === 0 ? styles.emptyList : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyState segment={segment} />}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  emptyList: {
    flexGrow: 1,
  },
  bookingCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  bookingRow: {
    flexDirection: 'row',
  },
  bookingImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  propertyName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  bookingDates: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  totalPrice: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  cancelButton: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.small,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
