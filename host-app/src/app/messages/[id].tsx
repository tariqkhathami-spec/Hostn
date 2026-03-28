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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { formatRelativeDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Message } from '../../types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversationId = id ?? '';

  // Fetch conversation details to get guest name
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => hostService.getConversations(),
    enabled: !!conversationId,
    retry: false,
  });

  const conversation = conversationsData?.data?.find((c: { id: string }) => c.id === conversationId);
  const headerTitle = conversation?.guestName ?? 'المحادثة';

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => hostService.getConversationMessages(conversationId),
    enabled: !!conversationId,
    retry: false,
  });

  const messages: Message[] = data?.data ?? [];

  // Mark as read on mount
  useEffect(() => {
    if (conversationId) {
      hostService.markConversationRead(conversationId).catch(() => {
        // Silently fail - not critical
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => hostService.sendMessage(conversationId, text),
    onMutate: async (text) => {
      // Optimistic update
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

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isHost = item.sender === 'host';
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

  return (
    <ScreenWrapper>
      <HeaderBar title={headerTitle} showBack />

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
            placeholder="اكتب رسالتك..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={2000}
            textAlign="right"
          />
        </View>
      </KeyboardAvoidingView>
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
});
