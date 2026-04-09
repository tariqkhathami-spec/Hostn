import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistsService } from '../../services/wishlists.service';
import { listingsService } from '../../services/listings.service';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import ListingCard from '../../components/listing/ListingCard';
import type { Listing } from '../../types';

export default function WishlistDetailScreen() {
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const queryClient = useQueryClient();

  const {
    data: list,
    isLoading: listLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['wishlist', listId],
    queryFn: () => wishlistsService.getList(listId!),
    enabled: !!listId,
  });

  const {
    data: properties = [],
    isLoading: propertiesLoading,
    refetch: refetchProperties,
    isRefetching,
  } = useQuery({
    queryKey: ['wishlist-properties', listId, list?.properties],
    queryFn: async () => {
      if (!list || list.properties.length === 0) return [];
      const results = await Promise.all(
        list.properties.map((id) => listingsService.getById(id).catch(() => null))
      );
      return results.filter(Boolean) as Listing[];
    },
    enabled: !!list && list.properties.length > 0,
  });

  const removeProperty = useMutation({
    mutationFn: (propertyId: string) =>
      wishlistsService.removeProperty(listId!, propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', listId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-properties', listId] });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  const handleRemove = (propertyId: string, title: string) => {
    Alert.alert(
      'Remove from List',
      `Remove "${title}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeProperty.mutate(propertyId),
        },
      ]
    );
  };

  const handleRefresh = () => {
    refetchList();
    refetchProperties();
  };

  const isLoading = listLoading || propertiesLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {list?.name ?? 'Wishlist'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {properties.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No properties yet</Text>
          <Text style={styles.emptyText}>
            Browse listings and save them to this list
          </Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ListingCard
                listing={item}
                onPress={() => router.push(`/listing/${item._id}`)}
              />
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemove(item._id, item.title)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={24} color={Colors.error} />
              </Pressable>
            </View>
          )}
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerSpacer: {
    width: 36,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.base,
  },
  cardWrapper: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
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
