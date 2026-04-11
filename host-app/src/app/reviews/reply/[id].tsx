import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../../constants/theme';
import { hostService } from '../../../services/host.service';
import { formatDate } from '../../../utils/format';
import type { Review } from '../../../types';
import ScreenWrapper from '../../../components/layout/ScreenWrapper';
import HeaderBar from '../../../components/layout/HeaderBar';

const QUICK_REPLIES = [
  'شكراً لتقييمك',
  'نسعد بخدمتكم دائماً',
  'مروركم الجميل أسعدنا',
  'فرصة سعيدة لاستضافتكم',
  'نعتذر عن أي إزعاج',
  'سنعمل على تحسين تجربتكم',
];

interface ReviewsResponse {
  data: Review[];
}

export default function ReplyToReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [replyText, setReplyText] = useState('');
  const [selectedChips, setSelectedChips] = useState<Set<number>>(new Set());

  // Fetch all reviews and find the one matching id
  const reviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ['reviews', 1],
    queryFn: () => hostService.getReviews({ page: 1 }),
    retry: false,
  });

  const review = useMemo(
    () => reviewsQuery.data?.data?.find((r) => r.id === id),
    [reviewsQuery.data, id],
  );

  const replyMutation = useMutation({
    mutationFn: (text: string) => hostService.replyToReview(id!, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews-summary'] });
      router.canGoBack() ? router.back() : router.replace('/reviews' as any);
    },
    onError: () => {
      Alert.alert('خطأ', 'حدث خطأ أثناء إرسال الرد. حاول مرة أخرى.');
    },
  });

  const toggleChip = (index: number) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      // Rebuild text from selected chips
      const parts: string[] = [];
      QUICK_REPLIES.forEach((text, i) => {
        if (next.has(i)) {
          parts.push(text);
        }
      });
      setReplyText(parts.join('. '));

      return next;
    });
  };

  const handleSend = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    replyMutation.mutate(trimmed);
  };

  const isSending = replyMutation.isPending;

  return (
    <ScreenWrapper>
      <HeaderBar title="الرد على التقييم" showBack fallbackRoute="/reviews" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Review summary */}
        {review ? (
          <View style={styles.reviewSummary}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewHeaderRight}>
                <Text style={styles.guestName}>{review.guestName}</Text>
                <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>
                  {review.overallRating.toFixed(1)}
                </Text>
              </View>
            </View>
            {review.comment ? (
              <Text style={styles.commentPreview} numberOfLines={4}>
                {review.comment}
              </Text>
            ) : null}
          </View>
        ) : reviewsQuery.isLoading ? (
          <View style={styles.loadingReview}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null}

        {/* Quick reply chips */}
        <Text style={styles.sectionTitle}>ردود سريعة</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          style={styles.chipsScroll}
        >
          {QUICK_REPLIES.map((text, index) => {
            const isSelected = selectedChips.has(index);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleChip(index)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Text input */}
        <Text style={styles.sectionTitle}>ردك</Text>
        <TextInput
          style={styles.textInput}
          value={replyText}
          onChangeText={setReplyText}
          placeholder="اكتب ردك هنا..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          textAlignVertical="top"
          textAlign="right"
          editable={!isSending}
        />

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!replyText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!replyText.trim() || isSending}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.textWhite} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={Colors.textWhite} />
              <Text style={styles.sendButtonText}>إرسال</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },

  // Review summary
  reviewSummary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewHeaderRight: {
    flex: 1,
  },
  guestName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  reviewDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadgeText: {
    ...Typography.smallBold,
    color: Colors.textWhite,
  },
  commentPreview: {
    ...Typography.small,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.md,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  loadingReview: {
    padding: Spacing.xl,
    alignItems: 'center',
  },

  // Section title
  sectionTitle: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Chips
  chipsScroll: {
    flexGrow: 0,
  },
  chipsContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary50,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // Text input
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 120,
    ...Typography.body,
    color: Colors.textPrimary,
    writingDirection: 'rtl',
  },

  // Send button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
