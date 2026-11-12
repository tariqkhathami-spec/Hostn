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
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START, MIRROR_IN_RTL } from '../../constants/theme';
import { formatRelativeDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Message } from '../../types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { getLocale } from '../../utils/i18n';
import { apiErrorMessage } from '../../utils/apiError';

// Arabic labels for the report reasons the API accepts
// (backend/src/models/Report.js).
const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'inappropriate_behavior', label: 'سلوك غير لائق' },
  { value: 'harassment', label: 'إساءة أو مضايقة' },
  { value: 'fraud', label: 'احتيال أو محاولة دفع خارج المنصة' },
  { value: 'property_damage', label: 'إتلاف في العقار' },
  { value: 'policy_violation', label: 'مخالفة شروط الحجز' },
  { value: 'spam', label: 'رسائل مزعجة' },
  { value: 'other', label: 'سبب آخر' },
];

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

  // Block is a toggle on the server: the same call blocks and unblocks, and
  // answers with the new state in data.isBlocked.
  const [blockedOverride, setBlockedOverride] = useState<boolean | null>(null);
  const isBlocked = blockedOverride ?? Boolean(conversation?.isBlocked);

  const handleBlock = useCallback(() => {
    setShowMenu(false);
    if (!conversationId) return;
    Alert.alert(
      isBlocked ? 'إلغاء حظر المحادثة' : 'حظر المحادثة',
      isBlocked
        ? 'هل تريد إلغاء حظر هذه المحادثة؟ سيتمكن الضيف من مراسلتك مجدداً.'
        : 'هل أنت متأكد من حظر هذه المحادثة؟ لن تتمكن من إرسال أو استقبال الرسائل فيها.',
      [
        { text: 'تراجع', style: 'cancel' },
        {
          text: isBlocked ? 'إلغاء الحظر' : 'حظر',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res: any = await hostService.blockConversation(conversationId);
              const nowBlocked = Boolean(res?.data?.isBlocked);
              setBlockedOverride(nowBlocked);
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              Alert.alert('تم', nowBlocked ? 'تم حظر المحادثة.' : 'تم إلغاء حظر المحادثة.');
            } catch (err: any) {
              // The server refuses to lift a block the other side placed.
              const blockedByOther = err?.response?.status === 403;
              Alert.alert(
                'خطأ',
                blockedByOther
                  ? 'هذه المحادثة محظورة من الطرف الآخر ولا يمكنك إلغاء الحظر.'
                  : apiErrorMessage(err, isBlocked ? 'تعذّر إلغاء حظر المحادثة.' : 'تعذّر حظر المحادثة.'),
              );
            }
          },
        },
      ],
    );
  }, [conversationId, isBlocked, queryClient]);

  // Report guest: the host picks a reason, then the report is sent as
  // { targetType: 'user', targetId, reason, description }.
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSending, setReportSending] = useState(false);

  const handleReport = useCallback(() => {
    setShowMenu(false);
    if (!guestId) {
      Alert.alert('خطأ', 'تعذّر تحديد الضيف في هذه المحادثة، لذا لا يمكن إرسال البلاغ.');
      return;
    }
    setReportReason(REPORT_REASONS[0].value);
    setReportDetails('');
    setShowReport(true);
  }, [guestId]);

  const submitReport = useCallback(async () => {
    if (!guestId || reportSending) return;
    const reasonLabel = REPORT_REASONS.find((r) => r.value === reportReason)?.label ?? '';
    setReportSending(true);
    try {
      await hostService.reportUser({
        targetId: guestId,
        reason: reportReason,
        // The description is required by the API.
        description: reportDetails.trim() || `بلاغ من المضيف عن ضيف في المحادثة (${reasonLabel})`,
      });
      setShowReport(false);
      Alert.alert('تم', 'تم إرسال البلاغ، وسيراجعه فريق الدعم.');
    } catch (err: any) {
      const serverMessage = String(err?.response?.data?.message || '').toLowerCase();
      Alert.alert(
        'خطأ',
        serverMessage.includes('already')
          ? 'سبق أن أرسلت بلاغاً عن هذا الضيف وهو قيد المراجعة.'
          : apiErrorMessage(err, 'تعذّر إرسال البلاغ. حاول مرة أخرى.'),
      );
    } finally {
      setReportSending(false);
    }
  }, [guestId, reportReason, reportDetails, reportSending]);

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
            <Ionicons name="send" size={20} color={Colors.textWhite} style={MIRROR_IN_RTL} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Menu Modal — Block / Report */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color={Colors.warning} />
              <Text style={styles.menuItemText}>الإبلاغ عن الضيف</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Ionicons name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'} size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>
                {isBlocked ? 'إلغاء الحظر' : 'حظر'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Report guest — reason picker */}
      <Modal visible={showReport} transparent animationType="fade" onRequestClose={() => setShowReport(false)}>
        <KeyboardAvoidingView
          style={styles.reportOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>الإبلاغ عن الضيف</Text>
            <Text style={styles.reportHint}>اختر سبب البلاغ، وسيراجعه فريق الدعم.</Text>
            {REPORT_REASONS.map((r) => {
              const selected = r.value === reportReason;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={styles.reportReasonRow}
                  onPress={() => setReportReason(r.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? Colors.primary : Colors.textTertiary}
                  />
                  <Text style={styles.reportReasonText}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TextInput
              style={styles.reportInput}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="تفاصيل إضافية (اختياري)"
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={1000}
            />
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[styles.reportBtn, styles.reportBtnPrimary, reportSending && { opacity: 0.6 }]}
                onPress={submitReport}
                disabled={reportSending}
              >
                {reportSending ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <Text style={styles.reportBtnPrimaryText}>إرسال البلاغ</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportBtn, styles.reportBtnGhost]}
                onPress={() => setShowReport(false)}
                disabled={reportSending}
              >
                <Text style={styles.reportBtnGhostText}>تراجع</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    marginStart: 2,
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
    textAlign: TEXT_START,
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
    paddingEnd: Spacing.xl,
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
  // Report modal
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  reportCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  reportTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
  },
  reportHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reportReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  reportReasonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    flex: 1,
  },
  reportInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 72,
    marginTop: Spacing.sm,
    textAlign: TEXT_START,
    textAlignVertical: 'top',
    writingDirection: 'rtl',
  },
  reportActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  reportBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnPrimary: {
    backgroundColor: Colors.error,
  },
  reportBtnPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
  reportBtnGhost: {
    backgroundColor: Colors.surface,
  },
  reportBtnGhostText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
});
