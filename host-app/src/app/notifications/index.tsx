import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { formatDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Notification } from '../../types';

type FilterTab = 'all' | 'check_in' | 'check_out' | 'booking_confirmed';

interface FilterOption {
  key: FilterTab;
  label: string;
}

const FILTERS: FilterOption[] = [
  { key: 'all', label: '\u0627\u0644\u0643\u0644' },
  { key: 'check_in', label: '\u062f\u062e\u0648\u0644 \u0627\u0644\u064a\u0648\u0645' },
  { key: 'check_out', label: '\u062e\u0631\u0648\u062c \u0627\u0644\u064a\u0648\u0645' },
  { key: 'booking_confirmed', label: '\u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0624\u0643\u062f\u0629' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['notifications', activeTab],
    queryFn: ({ pageParam = 1 }) =>
      hostService.getNotifications({
        filter: activeTab === 'all' ? undefined : activeTab,
        page: pageParam as number,
      }),
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const hasMore = lastPage?.data?.length > 0;
      return hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const notifications: Notification[] =
    data?.pages?.flatMap((page: any) => page?.data ?? []) ?? [];

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => hostService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markReadMutation.mutate(notification.id);
      }
      if (notification.bookingId) {
        router.push(`/reservations/${notification.bookingId}` as any);
      }
    },
    [markReadMutation, router],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.notificationUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <Text style={styles.notificationBody} numberOfLines={3}>
            {item.body}
          </Text>
          <Text style={styles.notificationDate}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    ),
    [handleNotificationPress],
  );

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <ActivityIndicator
        color={Colors.primary}
        style={{ paddingVertical: Spacing.base }}
      />
    );
  }, [isFetchingNextPage]);

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      <HeaderBar title={'\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a'} showBack />

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTERS.map((filter) => {
            const isActive = activeTab === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveTab(filter.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: Spacing.xxxl }}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            message={'\u0644\u0627 \u064a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a'}
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            ItemSeparatorComponent={renderSeparator}
            ListFooterComponent={renderFooter}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  filterTabActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  filterTabText: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.8)',
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  notificationUnread: {
    borderRightWidth: 3,
    borderRightColor: Colors.primary,
  },
  notificationContent: {
    flex: 1,
  },
  notificationBody: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.xs,
  },
  notificationDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.base,
  },
});
