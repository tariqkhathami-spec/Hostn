import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import type { Suggestion } from '../../types';

const voteOptions = [
  { key: 'important' as const, label: 'مهم', color: '#22c55e' },
  { key: 'moderate' as const, label: 'متوسط', color: '#3b82f6' },
  { key: 'not_important' as const, label: 'غير مهم', color: '#f97316' },
];

export default function SuggestionsScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['suggestions'],
    queryFn: hostService.getSuggestions,
    retry: false,
  });

  const suggestions: Suggestion[] = data?.data ?? [];

  const voteMutation = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: string }) =>
      hostService.voteSuggestion(id, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (text: string) => hostService.addSuggestion(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      setModalVisible(false);
      setNewSuggestion('');
    },
  });

  const handleVote = useCallback(
    (id: string, vote: string) => {
      voteMutation.mutate({ id, vote });
    },
    [voteMutation],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = newSuggestion.trim();
    if (trimmed.length === 0) return;
    addMutation.mutate(trimmed);
  }, [newSuggestion, addMutation]);

  const renderSuggestionCard = ({ item }: { item: Suggestion }) => (
    <Card style={styles.suggestionCard}>
      <Text style={styles.hostName}>{item.hostName}</Text>
      <Text style={styles.suggestionText}>{item.text}</Text>

      {/* Vote Buttons */}
      <View style={styles.voteRow}>
        {voteOptions.map((option) => {
          const isActive = item.currentUserVote === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => handleVote(item.id, option.key)}
              style={[
                styles.votePill,
                { borderColor: option.color },
                isActive && { backgroundColor: option.color },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.votePillText,
                  { color: isActive ? Colors.white : option.color },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vote Percentages */}
      <View style={styles.percentagesRow}>
        <Text style={[styles.percentText, { color: '#22c55e' }]}>
          مهم {item.percentages.important}%
        </Text>
        <Text style={[styles.percentText, { color: '#3b82f6' }]}>
          متوسط {item.percentages.moderate}%
        </Text>
        <Text style={[styles.percentText, { color: '#f97316' }]}>
          غير مهم {item.percentages.notImportant}%
        </Text>
      </View>

      {/* Platform Response */}
      {item.platformResponse && (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>رد المنصة:</Text>
          <Text style={styles.responseText}>{item.platformResponse}</Text>
        </View>
      )}
    </Card>
  );

  return (
    <ScreenWrapper>
      <HeaderBar title="مقترحات المضيفين" showBack />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          message="حدث خطأ في تحميل المقترحات"
          submessage="اسحب للأسفل للمحاولة مرة أخرى"
        />
      ) : (
        <>
          <View style={styles.topSection}>
            <Button
              title="أضف اقتراح"
              onPress={() => setModalVisible(true)}
              variant="primary"
              size="md"
              fullWidth
            />

            {/* Voting Legend */}
            <View style={styles.legend}>
              {voteOptions.map((option) => (
                <View key={option.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: option.color }]} />
                  <Text style={styles.legendLabel}>{option.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={renderSuggestionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="bulb-outline"
                message="لا توجد مقترحات بعد"
                submessage="كن أول من يضيف اقتراحاً لتحسين المنصة"
              />
            }
          />
        </>
      )}

      {/* Add Suggestion Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اقتراح جديد</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="اكتب اقتراحك هنا..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              textAlign="right"
              value={newSuggestion}
              onChangeText={setNewSuggestion}
            />

            <Button
              title="إرسال"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={addMutation.isPending}
              disabled={newSuggestion.trim().length === 0}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    gap: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  suggestionCard: {
    marginBottom: Spacing.md,
  },
  hostName: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginBottom: Spacing.xs,
  },
  suggestionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  voteRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  votePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  votePillText: {
    ...Typography.smallBold,
  },
  percentagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  percentText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  responseBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  responseLabel: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginBottom: Spacing.xs,
  },
  responseText: {
    ...Typography.small,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlign: 'right',
  },
});
