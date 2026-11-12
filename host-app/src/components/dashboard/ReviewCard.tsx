import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '../../types';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { formatDate } from '../../utils/format';

interface ReviewCardProps {
  review: Review;
  onPress?: () => void;
}

export default function ReviewCard({ review, onPress }: ReviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingText}>{review.overallRating}</Text>
          <Text style={styles.ratingMax}>/10</Text>
          <Ionicons name="star" size={14} color={Colors.gold500} />
        </View>
        <Text style={styles.guestName}>{review.guestName}</Text>
      </View>

      {review.comment ? (
        <Text style={styles.comment} numberOfLines={2}>
          {review.comment}
        </Text>
      ) : null}

      <View style={styles.bottomRow}>
        <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
        <Text style={styles.unitName}>{review.unitName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  guestName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...Typography.bodyBold,
    color: Colors.gold500,
  },
  ratingMax: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginRight: 2,
  },
  comment: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitName: {
    ...Typography.caption,
    color: Colors.primary,
  },
  date: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
