import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistsService } from '../../services/wishlists.service';
import { listingsService } from '../../services/listings.service';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import type { WishlistList, Listing } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - CARD_GAP) / 2;

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');

  const {
    data: listsRaw,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wishlists'],
    queryFn: () => wishlistsService.getLists().catch(() => []),
  });

  const lists = Array.isArray(listsRaw) ? listsRaw : [];

  // Fetch cover images for all lists that have properties
  const allPropertyIds = Array.from(
    new Set(lists.flatMap((l: WishlistList) => (l.properties?.length > 0 ? [l.properties[0]] : [])))
  );

  const { data: coverImages = {} } = useQuery({
    queryKey: ['wishlist-covers', allPropertyIds],
    queryFn: async () => {
      const entries = await Promise.all(
        allPropertyIds.map(async (id) => {
          try {
            const listing = await listingsService.getById(id);
            const img =
              listing.images?.find((i: any) => i.isPrimary) ?? listing.images?.[0];
            const uri = typeof img === 'string' ? img : img?.url;
            return [id, uri ?? null] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, string | null>;
    },
    enabled: allPropertyIds.length > 0,
  });

  const createList = useMutation({
    mutationFn: (name: string) => wishlistsService.createList(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setNewListName('');
      setShowCreateForm(false);
    },
  });

  const renameList = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      wishlistsService.renameList(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => wishlistsService.deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  const handleCreate = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    createList.mutate(trimmed);
  };

  const handleRename = (list: WishlistList) => {
    Alert.prompt(
      t('favorites.rename'),
      t('favorites.listName'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.save'),
          onPress: (value?: string) => {
            const trimmed = value?.trim();
            if (trimmed && trimmed !== list.name) {
              renameList.mutate({ id: list._id, name: trimmed });
            }
          },
        },
      ],
      'plain-text',
      list.name
    );
  };

  const handleDelete = (list: WishlistList) => {
    Alert.alert(
      t('favorites.delete'),
      `${list.name}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteList.mutate(list._id),
        },
      ]
    );
  };

  const handleMenu = (list: WishlistList) => {
    if (list.isDefault) {
      // Default list can only be renamed, not deleted
      Alert.alert(list.name, undefined, [
        { text: t('favorites.rename'), onPress: () => handleRename(list) },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } else {
      Alert.alert(list.name, undefined, [
        { text: t('favorites.rename'), onPress: () => handleRename(list) },
        {
          text: t('favorites.delete'),
          style: 'destructive',
          onPress: () => handleDelete(list),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const getCoverUri = (list: WishlistList): string | null => {
    if (!list.properties || list.properties.length === 0) return null;
    return coverImages[list.properties[0]] ?? null;
  };

  const renderListCard = ({ item }: { item: WishlistList }) => {
    const coverUri = getCoverUri(item);
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/favorites/${item._id}`)}
      >
        <View style={styles.cardImageContainer}>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="heart-outline" size={36} color={Colors.textTertiary} />
            </View>
          )}
          <Pressable
            style={styles.menuButton}
            onPress={() => handleMenu(item)}
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardCount}>
            {item.properties?.length ?? 0} {(item.properties?.length ?? 0) === 1 ? t('favorites.property') : t('favorites.properties')}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>{t('favorites.title')}</Text>

      {/* Create new list */}
      {showCreateForm ? (
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            placeholder={t('favorites.listName')}
            placeholderTextColor={Colors.textTertiary}
            value={newListName}
            onChangeText={setNewListName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Pressable
            style={[
              styles.createSubmitButton,
              (!newListName.trim() || createList.isPending) && styles.createSubmitDisabled,
            ]}
            onPress={handleCreate}
            disabled={!newListName.trim() || createList.isPending}
          >
            {createList.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.createSubmitText}>{t('favorites.create')}</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.cancelButton}
            onPress={() => {
              setShowCreateForm(false);
              setNewListName('');
            }}
          >
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.createButton}
          onPress={() => setShowCreateForm(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.createButtonText}>{t('favorites.createNew')}</Text>
        </Pressable>
      )}

      {lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('favorites.noLists')}</Text>
          <Text style={styles.emptyText}>
            {t('favorites.noListsSub')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          renderItem={renderListCard}
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  createButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  createForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
  },
  createInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createSubmitButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  createSubmitDisabled: {
    opacity: 0.5,
  },
  createSubmitText: {
    ...Typography.smallBold,
    color: Colors.white,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  grid: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 0.75,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardName: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
  },
  cardCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
