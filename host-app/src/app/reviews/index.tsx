import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { formatDate } from '../../utils/format';
import type { Review } from '../../types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';

interface ReviewsSummary {
  data: {
    overall: number;
    totalCount: number;
    cleanliness: number;
    condition: number;
    information: number;
    service: number;
  };
}

interface ReviewsResponse {
  data: Review[];
  meta?: { currentPage: number; totalPages: number };
}

const CATEGORY_LABELS: { key: string; label: string }[] = [
  { key: 'cleanliness', label: 'النظافة' },
  { key: 'condition', label: 'الحالة' },
  { key: 'information', label: 'المعلومات' },
  { key: 'service', label: 'الخدمة' },
];

const MINI_CATEGORY_LABELS: Record<string, string> = {
  cleanliness: 'نظافة',
  condition: 'حالة',
  information: 'معلومات',
  service: 'خدمة',
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100;

  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.scoreBarValue}>{score.toFixed(1)}</Text>
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const miniScores = [
    { key: 'cleanliness', value: review.cleanliness },
    { key: 'condition', value: review.condition },
    { key: 'information', value: review.information },
    { key: 'service', value: review.service },
  ];

  return (
    <View style={styles.reviewCard}>
      {/* Header: Guest name + score badge */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewHeaderRight}>
          <Text style={styles.guestName}>{review.guestName}</Text>
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
          <Text style={styles.unitName}>{review.unitName}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{review.overallRating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Mini category scores */}
      <View style={styles.miniScoresRow}>
        {miniScores.map((s) => (
          <View key={s.key} style={styles.miniScoreItem}>
            <Text style={styles.miniScoreLabel}>{MINI_CATEGORY_LABELS[s.key]}</Text>
            <Text style={styles.miniScoreValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Comment */}
      {review.comment ? (
        <View style={styles.commentSection}>
          <Text
            style={styles.commentText}
            numberOfLines={expanded ? undefined : 3}
          >
            {review.comment}
          </Text>
          {review.comment.length > 120 && !expanded && (
            <TouchableOpacity onPress={() => setExpanded(true)}>
              <Text style={styles.moreButton}>المزيد</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Reply section */}
      {review.hostReply ? (
        <View style={styles.replySection}>
          <Text style={styles.replyPrefix}>ردك:</Text>
          <Text style={styles.replyText}>{review.hostReply}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => router.push(`/reviews/reply/${review.id}`)}
        >
          <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
          <Text style={styles.replyButtonText}>رد</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ReviewsScreen() {
  const [page, setPage] = useState(1);

  const summaryQuery = useQuery<ReviewsSummary>({
    queryKey: ['reviews-summary'],
    queryFn: () => hostService.getReviewsSummary(),
    retry: false,
  });

  const reviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ['reviews', page],
    queryFn: () => hostService.getReviews({ page }),
    retry: false,
  });

  const isLoading = summaryQuery.isLoading || reviewsQuery.isLoading;
  const isRefreshing = summaryQuery.isRefetching || reviewsQuery.isRefetching;

  const onRefresh = useCallback(() => {
    summaryQuery.refetch();
    reviewsQuery.refetch();
  }, [summaryQuery, reviewsQuery]);

  const summary = summaryQuery.data?.data;
  const reviews = reviewsQuery.data?.data ?? [];

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <View style={styles.summaryContainer}>
        {/* Overall rating */}
        <View style={styles.overallRow}>
          <View style={styles.overallLeft}>
            <Text style={styles.overallScore}>{summary.overall.toFixed(1)}</Text>
            <Text style={styles.overallOutOf}>/ 10</Text>
          </View>
          <Text style={styles.totalCount}>{summary.totalCount} تقييم</Text>
        </View>

        {/* Category bars */}
        <View style={styles.categoryBars}>
          {CATEGORY_LABELS.map((cat) => (
            <ScoreBar
              key={cat.key}
              label={cat.label}
              score={summary[cat.key as keyof typeof summary] as number}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: Review }) => <ReviewCard review={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Review) => item.id, []);

  return (
    <ScreenWrapper>
      <HeaderBar title="التقييمات" showBack />
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderSummary}
          ListEmptyComponent={
            <EmptyState icon="star-outline" message="لا توجد تقييمات" />
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },

  // Summary
  summaryContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  overallLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overallScore: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.primary,
  },
  overallOutOf: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginStart: Spacing.xs,
  },
  totalCount: {
    ...Typography.small,
    color: Colors.textSecondary,
  },

  // Score bars
  categoryBars: {
    gap: Spacing.md,
  },
  scoreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scoreBarLabel: {
    ...Typography.small,
    color: Colors.textPrimary,
    width: 70,
    textAlign: TEXT_START,
  },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  scoreBarValue: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    width: 30,
    textAlign: 'left',
  },

  // Review card
  reviewCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
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
  unitName: {
    ...Typography.caption,
    color: Colors.textSecondary,
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

  // Mini scores
  miniScoresRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  miniScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniScoreLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  miniScoreValue: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Comment
  commentSection: {
    marginTop: Spacing.md,
  },
  commentText: {
    ...Typography.small,
    color: Colors.textPrimary,
    lineHeight: 22,
    textAlign: TEXT_START,
    writingDirection: 'rtl',
  },
  moreButton: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },

  // Reply
  replySection: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary50,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  replyPrefix: {
    ...Typography.smallBold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  replyText: {
    ...Typography.small,
    color: Colors.textPrimary,
    lineHeight: 22,
    textAlign: TEXT_START,
    writingDirection: 'rtl',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
  },
  replyButtonText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
});
