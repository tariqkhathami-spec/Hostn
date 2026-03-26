import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { useSearchStore } from '../../store/searchStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate } from '../../utils/format';
import type { Property, SearchParams } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function EmptyResults() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search criteria
      </Text>
    </View>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ city?: string }>();
  const { user, updateWishlist } = useAuthStore();
  const {
    destination,
    propertyTypes,
    guests,
    dates,
    filters,
  } = useSearchStore();

  const city = params.city ?? destination;

  const searchParams: SearchParams = {
    city: city ?? undefined,
    type: propertyTypes.length > 0 ? propertyTypes.join(',') : undefined,
    guests: guests.adults + guests.children,
    checkIn: dates.checkIn ?? undefined,
    checkOut: dates.checkOut ?? undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    amenities:
      filters.amenities.length > 0 ? filters.amenities.join(',') : undefined,
    sort: filters.sortBy || undefined,
    limit: 20,
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['searchResults', searchParams],
    queryFn: ({ pageParam = 1 }) =>
      propertyService.search({ ...searchParams, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const allProperties =
    data?.pages.flatMap((page) => page.data) ?? [];

  const wishlist = user?.wishlist ?? [];

  const handleToggleWishlist = useCallback(
    async (propertyId: string) => {
      try {
        const result = await authService.toggleWishlist(propertyId);
        updateWishlist(result.wishlist);
        queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch {}
    },
    [updateWishlist, queryClient],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const headerSubtitle = [
    city,
    dates.checkIn && dates.checkOut
      ? `${formatDate(dates.checkIn, 'MMM dd')} - ${formatDate(dates.checkOut, 'MMM dd')}`
      : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const renderCard = useCallback(
    ({ item }: { item: Property }) => {
      const imageUrl = item.images?.[0]?.url;
      const isFavorited = wishlist.includes(item._id);

      return (
        <TouchableOpacity
          style={[styles.card, Shadows.card]}
          activeOpacity={0.9}
          onPress={() => router.push(`/listing/${item._id}`)}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => handleToggleWishlist(item._id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorited ? Colors.heart : Colors.textWhite}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardCity} numberOfLines={1}>
              {item.location.city}
              {item.location.district ? `, ${item.location.district}` : ''}
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
    [wishlist, handleToggleWishlist, router],
  );

  return (
    <ScreenWrapper>
      <HeaderBar title={city ?? 'Search Results'} />
      {headerSubtitle ? (
        <Text style={styles.subtitle}>{headerSubtitle}</Text>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={allProperties}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={
            allProperties.length === 0 ? styles.emptyList : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyResults />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...Typography.small,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
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
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
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
  emptySubtitle: {
    ...Typography.small,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
