import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../../../services/support.service';
import { formatDate } from '../../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../../constants/theme';
import type { SupportTicket, SupportMessage } from '../../../types';

const STATUS_COLORS: Record<SupportTicket['status'], string> = {
  open: Colors.info,
  in_progress: Colors.warning,
  resolved: Colors.success,
  closed: Colors.textTertiary,
};

const STATUS_LABELS: Record<SupportTicket['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS: Record<SupportTicket['priority'], string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.error,
};

const CATEGORY_LABELS: Record<SupportTicket['category'], string> = {
  payment: 'Payment',
  booking: 'Booking',
  complaint: 'Complaint',
  technical: 'Technical',
  account: 'Account',
  other: 'Other',
};

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [replyText, setReplyText] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['supportTicket', id],
    queryFn: () => supportService.getTicket(id!),
    enabled: !!id,
  });

  const replyMutation = useMutation({
    mutationFn: () => supportService.replyToTicket(id!, replyText.trim()),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['supportTicket', id] });
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
    },
  });

  const canSend = replyText.trim().length > 0 && !replyMutation.isPending;
  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.adminBubble,
        ]}
      >
        {!isUser && (
          <Text style={styles.adminLabel}>Support Team</Text>
        )}
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.adminMessageText,
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isUser ? styles.userMessageTime : styles.adminMessageTime,
          ]}
        >
          {formatDate(item.createdAt, 'MMM d, h:mm a')}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Ticket</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Ticket</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Ticket not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Ticket
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Ticket Info */}
      <View style={styles.infoCard}>
        <Text style={styles.ticketSubject}>{ticket.subject}</Text>
        <View style={styles.infoRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[ticket.status] + '18' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: STATUS_COLORS[ticket.status] },
              ]}
            >
              {STATUS_LABELS[ticket.status]}
            </Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {CATEGORY_LABELS[ticket.category]}
            </Text>
          </View>
          <View style={styles.priorityBadgeRow}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: PRIORITY_COLORS[ticket.priority] },
              ]}
            />
            <Text style={styles.priorityLabel}>
              {ticket.priority.charAt(0).toUpperCase() +
                ticket.priority.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={ticket.messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Reply Input */}
      {!isClosed ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type a reply..."
              placeholderTextColor={Colors.textTertiary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={[
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
              ]}
              onPress={() => canSend && replyMutation.mutate()}
              disabled={!canSend}
            >
              {replyMutation.isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Ionicons name="send" size={20} color={Colors.white} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.closedBar}>
          <Text style={styles.closedText}>
            This ticket is {ticket.status === 'resolved' ? 'resolved' : 'closed'}.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.textTertiary },

  // Info card
  infoCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  ticketSubject: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  categoryText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  priorityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Messages
  messagesList: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  adminBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.xs,
  },
  adminLabel: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    ...Typography.small,
  },
  userMessageText: {
    color: Colors.white,
  },
  adminMessageText: {
    color: Colors.textPrimary,
  },
  messageTime: {
    ...Typography.tiny,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  adminMessageTime: {
    color: Colors.textTertiary,
  },

  // Reply bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  replyInput: {
    flex: 1,
    ...Typography.small,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Closed bar
  closedBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  closedText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
});
