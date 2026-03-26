import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { messageService } from '../../services/message.service';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime } from '../../utils/format';
import type { Conversation } from '../../types';

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation by messaging a host about a property
      </Text>
    </View>
  );
}

export default function ConversationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: conversationsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageService.getConversations(),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const conversations = conversationsData?.data ?? [];

  const getOtherParticipant = useCallback(
    (conversation: Conversation) => {
      const other = conversation.participants.find(
        (p) => p._id !== user?._id,
      );
      return other ?? conversation.participants[0];
    },
    [user],
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => {
      const otherUser = getOtherParticipant(item);
      const initial = (otherUser?.name ?? '?').charAt(0).toUpperCase();
      const lastMessageText = item.lastMessage?.content ?? 'No messages yet';
      const truncatedMessage =
        lastMessageText.length > 50
          ? lastMessageText.substring(0, 50) + '...'
          : lastMessageText;
      const timeStr = item.lastMessage?.createdAt
        ? formatRelativeTime(item.lastMessage.createdAt)
        : '';

      return (
        <TouchableOpacity
          style={styles.conversationItem}
          activeOpacity={0.7}
          onPress={() => router.push(`/chat/${item._id}`)}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.conversationContent}>
            <View style={styles.topRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {otherUser?.name ?? 'Unknown'}
              </Text>
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>
            <View style={styles.bottomRow}>
              <Text
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.lastMessageUnread,
                ]}
                numberOfLines={1}
              >
                {truncatedMessage}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [getOtherParticipant, router],
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversation}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyList : undefined
          }
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyState />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h3,
    color: Colors.textWhite,
  },
  conversationContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  timeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    ...Typography.small,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lastMessageUnread: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    ...Typography.tiny,
    color: Colors.textWhite,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 52 + Spacing.base + Spacing.md,
    marginRight: Spacing.base,
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
