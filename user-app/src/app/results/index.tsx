import React, { useRef, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { useSearchStore } from '../../store/searchStore';
import { Colors, Typography, Spacing, Radius, BACK_ICON } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import { cityLabel, normalizeCity } from '../../constants/cities';
import ListingCard from '../../components/listing/ListingCard';
import { useWishlist } from '../../hooks/useWishlist';
import { POOL_FILTER } from '../../constants/amenities';

export default function ResultsScreen() {
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ city?: string; cityName?: string }>();
  const searchStore = useSearchStore();
  const { isFavorite, toggle: toggleFavorite } = useWishlist();

  // Always search with the stored city value (e.g. "Madinah"), whatever
  // spelling arrived through params or an older saved state.
  const rawCity = params.city ?? searchStore.city;
  const city = rawCity ? normalizeCity(rawCity) || rawCity : null;
  const cityName = city ? cityLabel(city, language) : t('results.title');

  const {
    minPrice, maxPrice, bedrooms, bathrooms, amenities,
    ratingMin, hasDiscount, district, direction, minArea, maxArea,
  } = searchStore;

  // Parameter names are the ones GET /units/search reads.
  const buildSearchParams = (pageParam: number) => {
    // "pool" is its own flag on the unit, not an amenity value.
    const amenityValues = amenities.filter((a) => a !== POOL_FILTER);
    return {
      city: city ?? undefined,
      type: searchStore.propertyType ?? undefined,
      guests: searchStore.guests,
      checkIn: searchStore.checkIn ?? undefined,
      checkOut: searchStore.checkOut ?? undefined,
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      bedrooms: bedrooms || undefined,
      bathrooms: bathrooms || undefined,
      amenities: amenityValues.length > 0 ? amenityValues.join(',') : undefined,
      pool: amenities.includes(POOL_FILTER) ? '1' : undefined,
      rating: ratingMin ?? undefined,
      discount: hasDiscount ? '1' : undefined,
      district: district ?? undefined,
      direction: direction ?? undefined,
      minArea: minArea ?? undefined,
      maxArea: maxArea ?? undefined,
      page: pageParam,
      limit: 20,
    };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: [
      'search', city, searchStore.propertyType, searchStore.guests,
      searchStore.checkIn, searchStore.checkOut,
      minPrice, maxPrice, bedrooms, bathrooms, amenities,
      ratingMin, hasDiscount, district, direction, minArea, maxArea,
    ],
    // Units only: every result is bookable, and an empty result stays empty
    // (no fallback to /properties, which ignored the filters).
    queryFn: ({ pageParam = 1 }) => listingsService.searchUnits(buildSearchParams(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination ?? (lastPage as any);
      return (p.page ?? 1) < (p.pages ?? 1) ? (p.page ?? 1) + 1 : undefined;
    },
  });

  const listings = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  const loadingMore = useRef(false);

  const handleEndReached = useCallback(() => {
    if (loadingMore.current || !hasNextPage || isFetchingNextPage) return;
    loadingMore.current = true;
    fetchNextPage().finally(() => {
      setTimeout(() => { loadingMore.current = false; }, 500);
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={BACK_ICON} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{cityName}</Text>
        <Pressable onPress={() => router.push('/filters')} hitSlop={12}>
          <Ionicons name="options-outline" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <Text style={styles.resultCount}>{total} {t('results.propertiesFound')}</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.emptyTitle}>{t('results.noResults')}</Text>
          <Text style={styles.emptyText}>{t('results.searchError')}</Text>
          <Pressable style={{ backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md }} onPress={() => refetch()}>
            <Text style={{ ...Typography.bodyBold, color: Colors.white }}>{t('common.tryAgain')}</Text>
          </Pressable>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('results.noResults')}</Text>
          <Text style={styles.emptyText}>{t('results.noResultsSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
            ) : null
          }
          renderItem={({ item }) => {
            const itemId = item._id;
            return (
              <ListingCard
                listing={item}
                onPress={() => router.push(`/listing/${itemId}`)}
                onFavoritePress={() => toggleFavorite(itemId)}
                isFavorite={isFavorite(itemId)}
              />
            );
          }}
        />
      )}
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
  resultCount: {
    ...Typography.small,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.base },
  loader: { flex: 1, justifyContent: 'center' },
  footerLoader: { paddingVertical: Spacing.xl },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
