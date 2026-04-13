import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../../services/support.service';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import type { SupportTicket } from '../../types';

type Category = SupportTicket['category'];
type Priority = SupportTicket['priority'];

const CATEGORY_ICONS: Record<Category, React.ComponentProps<typeof Ionicons>['name']> = {
  payment: 'card-outline',
  booking: 'calendar-outline',
  complaint: 'warning-outline',
  technical: 'construct-outline',
  account: 'person-outline',
  other: 'ellipsis-horizontal-outline',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.error,
};

export default function NewTicketScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');
  const [message, setMessage] = useState('');

  const CATEGORIES: { value: Category; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { value: 'payment', label: t('support.cat.payment'), icon: CATEGORY_ICONS.payment },
    { value: 'booking', label: t('support.cat.booking'), icon: CATEGORY_ICONS.booking },
    { value: 'complaint', label: t('support.cat.complaint'), icon: CATEGORY_ICONS.complaint },
    { value: 'technical', label: t('support.cat.technical'), icon: CATEGORY_ICONS.technical },
    { value: 'account', label: t('support.cat.account'), icon: CATEGORY_ICONS.account },
    { value: 'other', label: t('support.cat.other'), icon: CATEGORY_ICONS.other },
  ];

  const PRIORITIES: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: t('support.pri.low'), color: PRIORITY_COLORS.low },
    { value: 'medium', label: t('support.pri.medium'), color: PRIORITY_COLORS.medium },
    { value: 'high', label: t('support.pri.high'), color: PRIORITY_COLORS.high },
  ];

  const createMutation = useMutation({
    mutationFn: () =>
      supportService.createTicket({
        subject: subject.trim(),
        category: category!,
        priority,
        message: message.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      router.back();
    },
    onError: () => {
      Alert.alert(t('common.error'), t('common.unexpectedError'));
    },
  });

  const canSubmit =
    subject.trim().length > 0 &&
    category !== null &&
    message.trim().length > 0 &&
    !createMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('support.newTicket')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subject */}
          <Text style={styles.label}>{t('support.subject')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description of your issue"
            placeholderTextColor={Colors.textTertiary}
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          {/* Category */}
          <Text style={styles.label}>{t('support.category')}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                style={[
                  styles.categoryItem,
                  category === cat.value && styles.categoryItemActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={
                    category === cat.value
                      ? Colors.primary
                      : Colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.value && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Priority */}
          <Text style={styles.label}>{t('support.priority')}</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p.value}
                style={[
                  styles.priorityItem,
                  priority === p.value && {
                    backgroundColor: p.color + '18',
                    borderColor: p.color,
                  },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <View
                  style={[styles.priorityDot, { backgroundColor: p.color }]}
                />
                <Text
                  style={[
                    styles.priorityText,
                    priority === p.value && { color: p.color, fontWeight: '600' },
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Message */}
          <Text style={styles.label}>{t('support.message')}</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={Colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {/* Submit */}
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>{t('support.submit')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  label: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.body,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  categoryItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary50,
  },
  categoryText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  textArea: {
    ...Typography.body,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    minHeight: 140,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
});
