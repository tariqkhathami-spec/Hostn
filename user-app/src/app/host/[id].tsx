import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { hostsService } from '../../services/hosts.service';
import { formatCurrency, formatDate, formatRating } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import type { Listing, Review } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROPERTY_CARD_WIDTH = SCREEN_WIDTH * 0.7;

export default function HostProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['host', id],
    queryFn: () => hostsService.getProfile(id!),
    enabled: !!id,
  });

  const handlePropertyPress = (propertyId: string) => {
    router.push(`/listing/${propertyId}`);
  };

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const { host, stats, properties, reviews } = data;
  const hostName = host.name
    ?? (`${host.firstName ?? ''} ${host.lastName ?? ''}`.trim() || 'Host');
  const memberSince = host.createdAt ? formatDate(host.createdAt, 'MMM yyyy') : null;

  const renderPropertyCard = ({ item }: { item: Listing }) => {
    const imageUri = typeof item.images?.[0] === 'string'
      ? item.images[0]
      : item.images?.[0]?.url;
    const price = item.discountedPrice ?? item.pricing?.perNight ?? 0;

    return (
      <Pressable
        style={styles.propertyCard}
        onPress={() => handlePropertyPress(item._id)}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.propertyImage} contentFit="cover" />
        ) : (
          <View style={[styles.propertyImage, styles.propertyImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.propertyLocationRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.propertyLocation} numberOfLines={1}>
              {item.location?.city ?? ''}
            </Text>
          </View>
          <View style={styles.propertyBottom}>
            <Text style={styles.propertyPrice}>{formatCurrency(price)}</Text>
            {(item.ratings?.average ?? 0) > 0 && (
              <View style={styles.propertyRating}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.propertyRatingText}>{formatRating(item.ratings.average)}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderReviewCard = ({ item }: { item: Review }) => {
    const reviewerName = item.reviewer?.name
      ?? (`${item.reviewer?.firstName ?? ''} ${item.reviewer?.lastName ?? ''}`.trim() || 'Guest');

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerAvatar}>
            {item.reviewer?.avatar ? (
              <Image source={{ uri: item.reviewer.avatar }} style={styles.reviewerAvatarImage} />
            ) : (
              <Ionicons name="person" size={18} color={Colors.textSecondary} />
            )}
          </View>
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>{reviewerName}</Text>
            <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={Colors.accent} />
            <Text style={styles.ratingBadgeText}>{item.rating}</Text>
          </View>
        </View>
        <Text style={styles.reviewComment} numberOfLines={4}>{item.comment}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Host Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {host.avatar ? (
              <Image source={{ uri: host.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color={Colors.textSecondary} />
              </View>
            )}
            {host.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              </View>
            )}
          </View>
          <Text style={styles.hostName}>{hostName}</Text>
          {host.isVerified && (
            <View style={styles.verifiedRow}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified Host</Text>
            </View>
          )}
          {memberSince && (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalProperties}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.averageRating > 0 ? formatRating(stats.averageRating) : '-'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalReviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Properties */}
        {properties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Properties ({properties.length})
            </Text>
            <FlatList
              data={properties}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.propertiesList}
              renderItem={renderPropertyCard}
            />
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Reviews ({reviews.length})
            </Text>
            {reviews.map((review) => (
              <View key={review._id}>
                {renderReviewCard({ item: review })}
              </View>
            ))}
          </View>
        )}

        {reviews.length === 0 && (
          <View style={styles.emptyReviews}>
            <Ionicons name="chatbubble-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { paddingBottom: Spacing.xxl },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  hostName: { ...Typography.h2, color: Colors.textPrimary },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  verifiedText: { ...Typography.small, color: Colors.success },
  memberSince: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { ...Typography.h3, color: Colors.primary },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },

  // Section
  section: { marginTop: Spacing.xl },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Properties
  propertiesList: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  propertyCard: {
    width: PROPERTY_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  propertyImage: {
    width: '100%',
    height: 140,
  },
  propertyImagePlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: { padding: Spacing.md },
  propertyTitle: { ...Typography.smallBold, color: Colors.textPrimary },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.xs,
  },
  propertyLocation: { ...Typography.caption, color: Colors.textSecondary },
  propertyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  propertyPrice: { ...Typography.smallBold, color: Colors.primary },
  propertyRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  propertyRatingText: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },

  // Reviews
  reviewCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  reviewerAvatarImage: { width: 36, height: 36 },
  reviewerInfo: { flex: 1, marginLeft: Spacing.sm },
  reviewerName: { ...Typography.smallBold, color: Colors.textPrimary },
  reviewDate: { ...Typography.caption, color: Colors.textSecondary },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  ratingBadgeText: { ...Typography.smallBold, color: Colors.textPrimary },
  reviewComment: { ...Typography.small, color: Colors.textSecondary, lineHeight: 20 },

  // Empty
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: { ...Typography.body, color: Colors.textTertiary },
});
