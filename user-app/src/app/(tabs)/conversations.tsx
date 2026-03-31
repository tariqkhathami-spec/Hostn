import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '../../services/chat.service';
import { formatDate } from '../../utils/format';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { Conversation } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function ConversationsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?._id);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.getConversations(),
  });

  const conversations = data ?? [];

  const getOtherParticipant = (conv: Conversation) =>
    conv.participants.find((p) => p._id !== userId) ?? conv.participants[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Conversations</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation by contacting a host from a listing page
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => {
            const other = getOtherParticipant(item);
            return (
              <Pressable
                style={styles.conversationItem}
                onPress={() => router.push(`/chat/${item._id}`)}
              >
                <View style={styles.avatar}>
                  {other.avatar ? (
                    <Image source={{ uri: other.avatar }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={24} color={Colors.textSecondary} />
                  )}
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName} numberOfLines={1}>
                      {other.firstName ?? 'Host'} {other.lastName ?? ''}
                    </Text>
                    <Text style={styles.convTime}>
                      {item.lastMessage ? formatDate(item.lastMessage.createdAt, 'MMM d') : ''}
                    </Text>
                  </View>
                  <View style={styles.convBottom}>
                    <Text style={styles.convPreview} numberOfLines={1}>
                      {item.lastMessage?.text ?? 'No messages yet'}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { ...Typography.h2, color: Colors.textPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },
  list: { paddingBottom: Spacing.xxl },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 50, height: 50 },
  convInfo: { flex: 1, gap: 4 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { ...Typography.smallBold, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  convTime: { ...Typography.caption, color: Colors.textTertiary },
  convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convPreview: { ...Typography.small, color: Colors.textSecondary, flex: 1, marginRight: Spacing.sm },
  unreadBadge: {
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: { ...Typography.tiny, color: Colors.white, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center' },
});
