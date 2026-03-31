import React from 'react';
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
import ListingCard from '../../components/listing/ListingCard';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ city?: string; cityName?: string }>();
  const searchStore = useSearchStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const city = params.city ?? searchStore.city;
  const cityName = params.cityName ?? searchStore.cityName ?? 'Results';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['search', city, searchStore.propertyType, searchStore.guests, searchStore.checkIn, searchStore.checkOut],
    queryFn: ({ pageParam = 1 }) =>
      listingsService.search({
        city: city ?? undefined,
        type: searchStore.propertyType ?? undefined,
        guests: searchStore.guests,
        checkIn: searchStore.checkIn ?? undefined,
        checkOut: searchStore.checkOut ?? undefined,
        page: pageParam,
        limit: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const listings = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const handleToggleFavorite = async (propertyId: string) => {
    try {
      await authService.toggleWishlist(propertyId);
      const updatedUser = await authService.getMe();
      setUser(updatedUser);
    } catch {}
  };

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

      <Text style={styles.resultCount}>{total} properties found</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
            ) : null
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/listing/${item._id}`)}
              onFavoritePress={() => handleToggleFavorite(item._id)}
              isFavorite={user?.wishlist.includes(item._id)}
            />
          )}
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
