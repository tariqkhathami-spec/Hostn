import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { notificationService } from '../../services/notification.service';
import { formatRelativeTime } from '../../utils/format';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import type { Notification } from '../../types';

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  booking_confirmed: { name: 'checkmark-circle', color: Colors.success },
  booking_cancelled: { name: 'close-circle', color: Colors.error },
  booking_pending: { name: 'time', color: Colors.warning },
  new_message: { name: 'chatbubble', color: Colors.info },
  new_review: { name: 'star', color: Colors.star },
  payment_received: { name: 'wallet', color: Colors.success },
  default: { name: 'notifications', color: Colors.primary },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];

  const handlePress = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
  };

  const getIcon = (type: string) => ICON_MAP[type] || ICON_MAP.default;

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.item, !item.isRead && styles.itemUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '15' }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <HeaderBar
        title="Notifications"
        rightIcon="checkmark-done"
        onRightPress={() => markAllReadMutation.mutate()}
      />
      {notifications.length === 0 && !isLoading ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications"
          subtitle="You'll see your notifications here"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: Spacing.xxl },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  itemUnread: {
    backgroundColor: Colors.surface,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemTitleUnread: { color: Colors.primary },
  itemMessage: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  itemTime: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
  },
});
