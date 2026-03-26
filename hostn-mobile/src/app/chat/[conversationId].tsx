import React, { useState, useCallback, useRef } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { messageService } from '../../services/message.service';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime } from '../../utils/format';
import type { Message, User } from '../../types';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messageService.getMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageService.getConversations(),
  });

  // Find the current conversation to get the other participant's name
  const conversation = conversationsData?.data?.find((c) => c._id === conversationId);
  const otherParticipant = conversation?.participants?.find(
    (p) => p._id !== user?._id
  );
  const headerTitle = otherParticipant?.name ?? 'Chat';

  const allMessages = [
    ...optimisticMessages,
    ...(messagesData?.data ?? []),
  ];

  const isOwnMessage = useCallback(
    (message: Message) => {
      if (!user) return false;
      const senderId =
        typeof message.sender === 'string' ? message.sender : message.sender?._id;
      return senderId === user._id;
    },
    [user]
  );

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !conversationId || isSending) return;

    setInputText('');
    setIsSending(true);

    // Optimistic message
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      conversation: conversationId,
      sender: user?._id ?? '',
      content: text,
      messageType: 'text',
      readBy: [user?._id ?? ''],
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    setOptimisticMessages((prev) => [tempMessage, ...prev]);

    try {
      await messageService.sendMessage(conversationId, text);
      // Remove optimistic message and refetch
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempMessage._id));
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch {
      // Remove failed optimistic message
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempMessage._id));
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = isOwnMessage(item);
    const isSystem = item.messageType === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubbleWrapper,
          isOwn ? styles.ownMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text
          style={[
            styles.messageTime,
            isOwn ? styles.ownTime : styles.otherTime,
          ]}
        >
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper safeAreaEdges={['top']}>
      <HeaderBar title={headerTitle} />
      <KeyboardAvoidingView
        style={styles.container}
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
            data={allMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            inverted
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={Colors.textSecondary}
                />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Send a message to start the conversation
                </Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.textWhite} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.textWhite} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  messageBubbleWrapper: {
    marginVertical: Spacing.xs,
    maxWidth: '78%',
  },
  ownMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  ownBubble: {
    backgroundColor: Colors.messageSent,
    borderBottomRightRadius: Radius.xs,
  },
  otherBubble: {
    backgroundColor: Colors.messageReceived,
    borderBottomLeftRadius: Radius.xs,
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  ownMessageText: {
    color: Colors.textWhite,
  },
  otherMessageText: {
    color: Colors.textPrimary,
  },
  messageTime: {
    ...Typography.tiny,
    marginTop: 2,
  },
  ownTime: {
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  otherTime: {
    color: Colors.textSecondary,
    textAlign: 'left',
  },

  // System Message
  systemMessage: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  systemMessageText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl * 2,
    gap: Spacing.sm,
    // inverted FlatList: this shows at bottom visually
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  emptySubtext: {
    ...Typography.small,
    color: Colors.textSecondary,
  },

  // Input Area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    maxHeight: 120,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
