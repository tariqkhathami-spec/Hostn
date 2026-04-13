import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { formatRelativeDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Message } from '../../types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { getLocale } from '../../utils/i18n';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const locale = getLocale();
  const isAr = locale === 'ar';

  const conversationId = id ?? '';

  // Fetch conversation details to get guest name
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => hostService.getConversations(),
    enabled: !!conversationId,
    retry: false,
  });

  const conversation = conversationsData?.data?.find((c: any) => c.id === conversationId);
  const headerTitle = conversation?.guestName ?? (isAr ? 'المحادثة' : 'Chat');
  const guestId = conversation?.guestId ?? '';

  // Fetch messages with auto-polling every 5 seconds (matching web behavior)
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => hostService.getConversationMessages(conversationId),
    enabled: !!conversationId,
    retry: false,
    refetchInterval: 5000, // Poll every 5 seconds like the web
  });

  const messages: Message[] = data?.data ?? [];

  // Mark as read on mount
  useEffect(() => {
    if (conversationId) {
      hostService.markConversationRead(conversationId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [conversationId, queryClient]);

  // Send message mutation with optimistic update
  const sendMutation = useMutation({
    mutationFn: (text: string) => hostService.sendMessage(conversationId, text),
    onMutate: async (text) => {
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        text,
        sender: 'host',
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      await queryClient.cancelQueries({ queryKey: ['conversation-messages', conversationId] });
      const previousMessages = queryClient.getQueryData(['conversation-messages', conversationId]);

      queryClient.setQueryData(
        ['conversation-messages', conversationId],
        (old: { data: Message[] } | undefined) => ({
          ...old,
          data: [optimisticMessage, ...(old?.data ?? [])],
        }),
      );

      return { previousMessages };
    },
    onError: (_err, _text, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['conversation-messages', conversationId],
          context.previousMessages,
        );
      }
    },
    onSuccess: (data: any) => {
      if (data?.warning) {
        Alert.alert(
          isAr ? 'تنبيه' : 'Notice',
          data.warning,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText('');
    sendMutation.mutate(trimmed);
  }, [inputText, sendMutation]);

  // Block conversation
  const handleBlock = useCallback(() => {
    setShowMenu(false);
    Alert.alert(
      isAr ? 'حظر المحادثة' : 'Block Conversation',
      isAr ? 'هل أنت متأكد من حظر هذه المحادثة؟ لن تتمكن من إرسال أو استقبال رسائل.' : 'Are you sure you want to block this conversation?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حظر' : 'Block',
          style: 'destructive',
          onPress: async () => {
            if (!conversationId) return;
            try {
              await hostService.blockConversation(conversationId);
              Alert.alert(
                isAr ? 'تم' : 'Done',
                isAr ? 'تم حظر المحادثة' : 'Conversation blocked',
              );
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            } catch {
              Alert.alert(
                isAr ? 'خطأ' : 'Error',
                isAr ? 'فشل حظر المحادثة' : 'Failed to block conversation',
              );
            }
          },
        },
      ],
    );
  }, [conversationId, isAr, queryClient]);

  // Report user
  const handleReport = useCallback(() => {
    setShowMenu(false);
    if (!guestId) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'لا يمكن الإبلاغ' : 'Cannot report');
      return;
    }
    Alert.alert(
      isAr ? 'الإبلاغ عن المستخدم' : 'Report User',
      isAr ? 'سيتم مراجعة البلاغ من قبل فريق الدعم.' : 'The report will be reviewed by our support team.',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'إبلاغ' : 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await hostService.reportUser({
                reportedUser: guestId,
                reason: 'inappropriate_behavior',
                details: `Reported from conversation ${conversationId}`,
              });
              Alert.alert(
                isAr ? 'تم' : 'Done',
                isAr ? 'تم إرسال البلاغ بنجاح' : 'Report submitted successfully',
              );
            } catch {
              Alert.alert(
                isAr ? 'خطأ' : 'Error',
                isAr ? 'فشل إرسال البلاغ' : 'Failed to submit report',
              );
            }
          },
        },
      ],
    );
  }, [guestId, conversationId, isAr]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isHost = item.sender === 'host';
    const isSystem = (item.sender as string) === 'system' || (item as any).messageType === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isHost ? styles.bubbleRowHost : styles.bubbleRowGuest]}>
        <View style={[styles.bubble, isHost ? styles.bubbleHost : styles.bubbleGuest]}>
          <Text style={[styles.bubbleText, isHost ? styles.bubbleTextHost : styles.bubbleTextGuest]}>
            {item.text}
          </Text>
        </View>
        <View style={[styles.timestampRow, isHost ? styles.timestampRowHost : styles.timestampRowGuest]}>
          <Text style={styles.timestampText}>{formatRelativeDate(item.timestamp)}</Text>
          {isHost && item.status && (
            <Ionicons
              name={
                item.status === 'read'
                  ? 'checkmark-done'
                  : item.status === 'delivered'
                  ? 'checkmark-done'
                  : item.status === 'sent'
                  ? 'checkmark'
                  : 'time-outline'
              }
              size={14}
              color={item.status === 'read' ? Colors.primary : Colors.textTertiary}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Header right action — three-dot menu
  const headerRight = (
    <TouchableOpacity onPress={() => setShowMenu(true)} hitSlop={12}>
      <Ionicons name="ellipsis-vertical" size={22} color={Colors.textPrimary} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <HeaderBar title={headerTitle} showBack fallbackRoute="/messages" rightActions={headerRight} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {inputText.length > 1800 && (
            <Text style={[styles.charCounter, inputText.length > 1950 && { color: Colors.error }]}>
              {inputText.length}/2000
            </Text>
          )}
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim() || sendMutation.isPending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isAr ? 'اكتب رسالتك...' : 'Type a message...'}
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={2000}
            textAlign="right"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Menu Modal — Block / Report */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color={Colors.warning} />
              <Text style={styles.menuItemText}>{isAr ? 'الإبلاغ عن المستخدم' : 'Report User'}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>
                {isAr ? 'حظر المحادثة' : 'Block Conversation'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  bubbleRow: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  bubbleRowHost: {
    alignSelf: 'flex-start',
  },
  bubbleRowGuest: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  bubbleHost: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: Radius.xs,
  },
  bubbleGuest: {
    backgroundColor: Colors.surfaceAlt,
    borderBottomRightRadius: Radius.xs,
  },
  bubbleText: {
    ...Typography.body,
    writingDirection: 'rtl',
  },
  bubbleTextHost: {
    color: Colors.textWhite,
  },
  bubbleTextGuest: {
    color: Colors.textPrimary,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  timestampRowHost: {
    justifyContent: 'flex-start',
  },
  timestampRowGuest: {
    justifyContent: 'flex-end',
  },
  timestampText: {
    ...Typography.tiny,
    color: Colors.textTertiary,
  },
  statusIcon: {
    marginLeft: 2,
  },
  // System messages
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  systemMessageText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    writingDirection: 'rtl',
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
  charCounter: {
    ...Typography.tiny,
    color: Colors.textTertiary,
    textAlign: 'right',
    paddingHorizontal: Spacing.base,
    paddingBottom: 2,
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
    ...Shadows.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: Colors.border,
  },
});
