import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import type { Property } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm) / 2;

function SkeletonCard({ width }: { width: number }) {
  return (
    <View style={[styles.skeletonCard, { width }]}>
      <View style={[styles.skeletonImage, { width }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: width * 0.7 }]} />
        <View style={[styles.skeletonLine, { width: width * 0.5 }]} />
        <View style={[styles.skeletonLine, { width: width * 0.4 }]} />
      </View>
    </View>
  );
}

function PropertyCard({
  property,
  width,
  onHeartPress,
  isFavorited,
}: {
  property: Property;
  width: number;
  onHeartPress: (id: string) => void;
  isFavorited: boolean;
}) {
  const router = useRouter();
  const imageUrl = property.images?.[0]?.url;

  return (
    <TouchableOpacity
      style={[styles.card, { width }, Shadows.card]}
      activeOpacity={0.9}
      onPress={() => router.push(`/listing/${property._id}`)}
    >
      <View style={[styles.imageContainer, { width }]}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => onHeartPress(property._id)}
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
          {property.title}
        </Text>
        <Text style={styles.cardCity} numberOfLines={1}>
          {property.location.city}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>
            {formatCurrency(property.pricing.perNight)}{' '}
            <Text style={styles.perNight}>/night</Text>
          </Text>
          {property.ratings.count > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={Colors.star} />
              <Text style={styles.ratingText}>
                {property.ratings.average.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateWishlist } = useAuthStore();

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => propertyService.getCities(),
  });

  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ['properties', 'featured'],
    queryFn: () =>
      propertyService.search({ featured: 'true', limit: 10 }),
  });

  const { data: topRated, isLoading: topRatedLoading } = useQuery({
    queryKey: ['properties', 'topRated'],
    queryFn: () =>
      propertyService.search({ sort: '-ratings.average', limit: 10 }),
  });

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

  const isLoading = citiesLoading || featuredLoading || topRatedLoading;

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar Pill */}
        <TouchableOpacity
          style={styles.searchPill}
          activeOpacity={0.8}
          onPress={() => router.push('/search/destination')}
        >
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <Text style={styles.searchPillText}>Where are you going?</Text>
        </TouchableOpacity>

        {/* City Pills */}
        {citiesLoading ? (
          <View style={styles.citySkeletonRow}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.citySkeletonPill} />
            ))}
          </View>
        ) : (
          <FlatList
            data={cities}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.cityList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cityPill}
                onPress={() => {
                  router.push({
                    pathname: '/results/',
                    params: { city: item },
                  });
                }}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.cityPillText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Featured Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
        </View>
        {featuredLoading ? (
          <FlatList
            data={[1, 2, 3]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item)}
            contentContainerStyle={styles.horizontalList}
            renderItem={() => <SkeletonCard width={CARD_WIDTH} />}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
          />
        ) : (
          <FlatList
            data={featured?.data ?? []}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                width={CARD_WIDTH}
                onHeartPress={handleToggleWishlist}
                isFavorited={wishlist.includes(item._id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
          />
        )}

        {/* Top Rated Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated</Text>
        </View>
        {topRatedLoading ? (
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} width={GRID_CARD_WIDTH} />
            ))}
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {(topRated?.data ?? []).map((item) => (
              <PropertyCard
                key={item._id}
                property={item}
                width={GRID_CARD_WIDTH}
                onHeartPress={handleToggleWishlist}
                isFavorited={wishlist.includes(item._id)}
              />
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPillText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  cityList: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityPillText: {
    ...Typography.small,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
  citySkeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  citySkeletonPill: {
    width: 80,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.skeleton,
    marginRight: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  horizontalList: {
    paddingHorizontal: Spacing.base,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 160,
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
    padding: Spacing.sm,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...Typography.small,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  skeletonCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  skeletonImage: {
    height: 160,
    backgroundColor: Colors.skeleton,
  },
  skeletonContent: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: Colors.skeleton,
    borderRadius: Radius.xs,
  },
});
