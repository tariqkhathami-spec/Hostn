import React, { useRef, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { useSearchStore } from '../../store/searchStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import ListingCard from '../../components/listing/ListingCard';

export default function ResultsScreen() {
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ city?: string; cityName?: string }>();
  const searchStore = useSearchStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const city = params.city ?? searchStore.city;
  const cityName = params.cityName ?? searchStore.cityName ?? 'Results';

  const {
    minPrice, maxPrice, bedrooms, bathrooms, amenities,
    ratingMin, hasDiscount, district, direction, minArea, maxArea,
  } = searchStore;

  const buildSearchParams = (pageParam: number) => ({
    city: city ?? undefined,
    type: searchStore.propertyType ?? undefined,
    guests: searchStore.guests,
    checkIn: searchStore.checkIn ?? undefined,
    checkOut: searchStore.checkOut ?? undefined,
    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,
    bedrooms: bedrooms || undefined,
    bathrooms: bathrooms || undefined,
    amenities: amenities.length > 0 ? amenities : undefined,
    ratingMin: ratingMin ?? undefined,
    hasDiscount: hasDiscount || undefined,
    district: district ?? undefined,
    direction: direction ?? undefined,
    minArea: minArea ?? undefined,
    maxArea: maxArea ?? undefined,
    page: pageParam,
    limit: 20,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: [
      'search', city, searchStore.propertyType, searchStore.guests,
      searchStore.checkIn, searchStore.checkOut,
      minPrice, maxPrice, bedrooms, bathrooms, amenities,
      ratingMin, hasDiscount, district, direction, minArea, maxArea,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildSearchParams(pageParam);
      // Try unit search first, fall back to property search
      try {
        const unitResult = await listingsService.searchUnits(params as any);
        const unitData = unitResult?.data ?? unitResult;
        if (Array.isArray(unitData) && unitData.length > 0) {
          return unitResult;
        }
      } catch (err) {
        console.debug('[results] searchUnits failed, falling back to search:', err);
      }
      return listingsService.search(params as any);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination ?? (lastPage as any);
      return (p.page ?? 1) < (p.pages ?? 1) ? (p.page ?? 1) + 1 : undefined;
    },
  });

  const listings = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  const handleToggleFavorite = async (propertyId: string) => {
    try {
      await authService.toggleWishlist(propertyId);
      const updatedUser = await authService.getMe();
      setUser(updatedUser);
    } catch (err) {
      console.debug('[results] toggleWishlist failed:', err);
    }
  };

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
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
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
          <Text style={styles.emptyText}>{language === 'ar' ? 'حدث خطأ أثناء البحث' : 'An error occurred while searching'}</Text>
          <Pressable style={{ backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md }} onPress={() => refetch()}>
            <Text style={{ ...Typography.bodyBold, color: Colors.white }}>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Text>
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
          keyExtractor={(item) => item._id ?? item.id}
          contentContainerStyle={styles.list}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
            ) : null
          }
          renderItem={({ item }) => {
            const itemId = item._id ?? (item as any).id;
            return (
              <ListingCard
                listing={item}
                onPress={() => router.push(`/listing/${itemId}`)}
                onFavoritePress={() => handleToggleFavorite(itemId)}
                isFavorite={user?.wishlist?.includes(itemId)}
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
