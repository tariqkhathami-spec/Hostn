import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../../services/notifications.service';
import { formatDate } from '../../utils/format';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { Notification } from '../../types';

const ICON_MAP: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  booking: 'calendar', message: 'chatbubble', payment: 'card',
  promotion: 'pricetag', system: 'information-circle',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }: { item: Notification }) => (
            <Pressable
              style={[styles.notifRow, !item.read && styles.notifUnread]}
              onPress={() => !item.read && markRead.mutate(item._id)}
            >
              <View style={styles.notifIcon}>
                <Ionicons name={ICON_MAP[item.type] ?? 'notifications'} size={22} color={Colors.primary} />
              </View>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>{formatDate(item.createdAt, 'MMM d, h:mm a')}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  notifUnread: { backgroundColor: Colors.primary50 },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  notifInfo: { flex: 1 },
  notifTitle: { ...Typography.smallBold, color: Colors.textPrimary },
  notifBody: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  notifTime: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
