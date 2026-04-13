import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../services/chat.service';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/format';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import type { Message } from '../../types';

export default function ChatScreen() {
  const router = useRouter();
  const { id, propertyId, hostName } = useLocalSearchParams<{
    id: string;
    propertyId?: string;
    hostName?: string;
  }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?._id);
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // When entering from a listing detail page, id = host ID
  // We need to create/get a conversation with this host first
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setCreating(true);

    chatService
      .createConversation(id, propertyId)
      .then((conv) => {
        if (!cancelled) {
          // conv could be the full conversation object or unwrapped
          const convId = conv?._id ?? (conv as any)?.id ?? id;
          setConversationId(convId);
        }
      })
      .catch((err) => {
        console.warn('Chat conversation creation failed:', err?.response?.data?.message ?? err?.message);
        // If create fails, id might already be a conversation ID — try using it
        if (!cancelled) setConversationId(id);
      })
      .finally(() => {
        if (!cancelled) setCreating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, propertyId]);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatService.getMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (messageText: string) => chatService.sendMessage(conversationId!, messageText),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;
    sendMutation.mutate(trimmed);
  };

  // Determine the other participant for reporting
  const otherParticipantId = id;

  const handleBlock = useCallback(() => {
    setShowMenu(false);
    if (!conversationId) return;
    Alert.alert(
      t('chat.blockTitle' as any) || 'Block Conversation',
      t('chat.blockConfirm' as any) || 'Are you sure you want to block this conversation?',
      [
        { text: t('common.cancel' as any) || 'Cancel', style: 'cancel' },
        {
          text: t('chat.block' as any) || 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.blockConversation(conversationId);
              Alert.alert(
                t('common.success' as any) || 'Done',
                t('chat.blocked' as any) || 'Conversation blocked',
              );
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            } catch {
              Alert.alert(
                t('common.error' as any) || 'Error',
                t('chat.blockFailed' as any) || 'Failed to block conversation',
              );
            }
          },
        },
      ],
    );
  }, [conversationId, t, queryClient]);

  const handleReport = useCallback(() => {
    setShowMenu(false);
    if (!otherParticipantId) return;
    Alert.alert(
      t('chat.reportTitle' as any) || 'Report User',
      t('chat.reportConfirm' as any) || 'The report will be reviewed by our support team.',
      [
        { text: t('common.cancel' as any) || 'Cancel', style: 'cancel' },
        {
          text: t('chat.report' as any) || 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.reportUser({
                reportedUser: otherParticipantId,
                reason: 'inappropriate_behavior',
                details: `Reported from conversation ${conversationId}`,
              });
              Alert.alert(
                t('common.success' as any) || 'Done',
                t('chat.reported' as any) || 'Report submitted successfully',
              );
            } catch {
              Alert.alert(
                t('common.error' as any) || 'Error',
                t('chat.reportFailed' as any) || 'Failed to submit report',
              );
            }
          },
        },
      ],
    );
  }, [otherParticipantId, conversationId, t]);

  const sortedMessages = [...(Array.isArray(messages) ? messages : [])].reverse();

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender === userId;
    const isSystem = item.sender === 'system' || (item as any).messageType === 'system';
    // Messages may use 'content' field instead of 'text'
    const messageText = item.text ?? (item as any).content ?? '';

    if (isSystem) {
      return (
        <View style={styles.systemBubble}>
          <Text style={styles.systemBubbleText}>{messageText}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
          {messageText}
        </Text>
        <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>
          {formatDate(item.createdAt, 'h:mm a')}
        </Text>
      </View>
    );
  };

  const displayName = hostName || t('chat.title');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
        <Pressable onPress={() => setShowMenu(true)} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {isLoading || creating ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={sortedMessages}
            keyExtractor={(item) => item._id}
            inverted
            contentContainerStyle={styles.messageList}
            renderItem={renderMessage}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>{t('chat.emptyChat')}</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputRow}>
          {text.length > 800 && (
            <Text style={[styles.charCounter, text.length > 950 && { color: Colors.error }]}>
              {text.length}/1000
            </Text>
          )}
          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={Colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendButton, (!text.trim() || !conversationId) && styles.sendDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || !conversationId || sendMutation.isPending}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Block / Report Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <Pressable style={styles.menuItem} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color={Colors.accent} />
              <Text style={styles.menuItemText}>{t('chat.reportUser' as any) || 'Report User'}</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>
                {t('chat.blockConversation' as any) || 'Block Conversation'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center' },
  messageList: { padding: Spacing.xl, gap: Spacing.sm },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center' },
  bubble: {
    maxWidth: '75%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, marginBottom: Spacing.xs,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: Radius.xs },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: Radius.xs },
  bubbleText: { ...Typography.body, lineHeight: 22 },
  bubbleTextMine: { color: Colors.white },
  bubbleTextOther: { color: Colors.textPrimary },
  bubbleTime: { ...Typography.tiny, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  bubbleTimeOther: { color: Colors.textTertiary },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.white,
  },
  input: {
    flex: 1, ...Typography.body, color: Colors.textPrimary,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  charCounter: {
    ...Typography.tiny,
    color: Colors.textTertiary,
    textAlign: 'right',
    paddingHorizontal: Spacing.base,
    paddingBottom: 2,
  },
  // System messages
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  systemBubbleText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  // Menu modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: Spacing.xl,
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  menuItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
