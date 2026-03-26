import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import type { Property } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

function EmptyState({
  icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon} size={64} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyButton} onPress={onAction}>
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateWishlist } = useAuthStore();

  const {
    data: user,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.getMe(),
  });

  const wishlistProperties = (user?.wishlist ?? []) as unknown as Property[];

  const handleUnfavorite = useCallback(
    async (propertyId: string) => {
      try {
        const result = await authService.toggleWishlist(propertyId);
        updateWishlist(result.wishlist);
        queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch {}
    },
    [updateWishlist, queryClient],
  );

  const renderCard = useCallback(
    ({ item }: { item: Property }) => {
      const imageUrl = item.images?.[0]?.url;
      return (
        <TouchableOpacity
          style={[styles.card, Shadows.card]}
          activeOpacity={0.9}
          onPress={() => router.push(`/listing/${item._id}`)}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleUnfavorite(item._id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={22} color={Colors.heart} />
          </TouchableOpacity>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardCity} numberOfLines={1}>
              {item.location.city}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>
                {formatCurrency(item.pricing.perNight)}{' '}
                <Text style={styles.perNight}>/night</Text>
              </Text>
              {item.ratings.count > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={Colors.star} />
                  <Text style={styles.ratingText}>
                    {item.ratings.average.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleUnfavorite, router],
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>
      <FlatList
        data={wishlistProperties}
        keyExtractor={(item) => item._id}
        renderItem={renderCard}
        contentContainerStyle={
          wishlistProperties.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="No favorites yet"
            actionLabel="Browse Properties"
            onAction={() => router.push('/(tabs)')}
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  heartButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radius.full,
    padding: Spacing.xs + 2,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  cardCity: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  cardPrice: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  perNight: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...Typography.small,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
