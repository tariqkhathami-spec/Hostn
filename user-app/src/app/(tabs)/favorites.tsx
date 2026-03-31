import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing } from '../../constants/theme';
import ListingCard from '../../components/listing/ListingCard';

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const wishlist = user?.wishlist ?? [];

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['favorites', wishlist],
    queryFn: async () => {
      if (wishlist.length === 0) return [];
      const results = await Promise.all(
        wishlist.map((id) => listingsService.getById(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: wishlist.length > 0,
  });

  const toggleFavorite = useMutation({
    mutationFn: (propertyId: string) => authService.toggleWishlist(propertyId),
    onSuccess: async () => {
      const updatedUser = await authService.getMe();
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const listings = data ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Favorites</Text>
      {listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            When you find a property you like, tap the heart icon to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item!._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          renderItem={({ item }) =>
            item ? (
              <ListingCard
                listing={item}
                onPress={() => router.push(`/listing/${item._id}`)}
                onFavoritePress={() => toggleFavorite.mutate(item._id)}
                isFavorite={true}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.base,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
});
