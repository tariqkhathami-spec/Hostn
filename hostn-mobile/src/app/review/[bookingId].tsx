import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { showToast } from '../../components/ui/Toast';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { bookingService } from '../../services/booking.service';
import { reviewService } from '../../services/review.service';
import type { Property } from '../../types';

const RATING_CATEGORIES = [
  { key: 'overall', label: 'Overall' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'communication', label: 'Communication' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
] as const;

type RatingKey = (typeof RATING_CATEGORIES)[number]['key'];

const StarRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <View style={styles.starRow}>
    <Text style={styles.starLabel}>{label}</Text>
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={28}
            color={star <= value ? Colors.star : Colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();

  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    overall: 0,
    cleanliness: 0,
    accuracy: 0,
    communication: 0,
    location: 0,
    value: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getById(bookingId!),
    enabled: !!bookingId,
  });

  const property = booking?.property as Property | undefined;

  const handleRatingChange = (key: RatingKey, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      Alert.alert('Required', 'Please provide an overall rating.');
      return;
    }

    setSubmitting(true);
    try {
      await reviewService.createReview({
        property: typeof booking?.property === 'string' ? booking.property : property?._id ?? '',
        booking: bookingId!,
        ratings: {
          overall: ratings.overall,
          cleanliness: ratings.cleanliness || ratings.overall,
          accuracy: ratings.accuracy || ratings.overall,
          communication: ratings.communication || ratings.overall,
          location: ratings.location || ratings.overall,
          value: ratings.value || ratings.overall,
        },
        comment: comment.trim() || undefined,
      });
      showToast('success', 'Review submitted!', 'Thank you for your feedback.');
      router.back();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? 'Failed to submit review. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="Leave a Review" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="Leave a Review" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Property Info */}
        {property && (
          <View style={[styles.propertyCard, Shadows.card]}>
            <Image
              source={{ uri: property.images?.[0]?.url }}
              style={styles.propertyImage}
              contentFit="cover"
              transition={200}
            />
            <Text style={styles.propertyName} numberOfLines={2}>
              {property.title}
            </Text>
          </View>
        )}

        {/* Ratings */}
        <Text style={styles.sectionTitle}>Rate your experience</Text>
        <View style={[styles.ratingsCard, Shadows.card]}>
          {RATING_CATEGORIES.map((cat) => (
            <StarRow
              key={cat.key}
              label={cat.label}
              value={ratings[cat.key]}
              onChange={(v) => handleRatingChange(cat.key, v)}
            />
          ))}
        </View>

        {/* Comment */}
        <Text style={styles.sectionTitle}>Comment (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Share your experience..."
          placeholderTextColor={Colors.textLight}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  propertyImage: {
    width: '100%',
    height: 160,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  propertyName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  ratingsCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: Spacing.base,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  starLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
