import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatRating } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import type { Listing } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  chalet: 'Chalet',
  apartment: 'Apartment',
  villa: 'Villa',
  studio: 'Studio',
  farm: 'Farm',
  camp: 'Camp',
  resort: 'Resort',
  hotel: 'Hotel',
};

interface Props {
  listing: Listing;
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  style?: ViewStyle;
}

export default function ListingCard({ listing, onPress, onFavoritePress, isFavorite, style }: Props) {
  const primaryImage = listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
  const imageUri = typeof primaryImage === 'string' ? primaryImage : primaryImage?.url;
  const originalPrice = listing.pricing?.perNight ?? 0;
  const price = listing.discountedPrice ?? originalPrice;
  const discount = listing.pricing?.discountPercent ?? 0;
  const hasDiscount = discount > 0 && price < originalPrice;
  const city = listing.location?.city ?? '';
  const district = listing.location?.district;
  const rating = listing.ratings?.average ?? 0;
  const reviewCount = listing.ratings?.count ?? 0;
  const guests = listing.capacity?.maxGuests;
  const bedrooms = listing.capacity?.bedrooms;
  const bathrooms = listing.capacity?.bathrooms;
  const typeLabel = TYPE_LABELS[listing.type] ?? listing.type;

  return (
    <Pressable style={[styles.container, style]} onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
            transition={200}
          />
        ) : (
          <View style={[styles.image, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
          </View>
        )}
        {onFavoritePress && (
          <Pressable style={styles.heartButton} onPress={onFavoritePress} hitSlop={8}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? Colors.error : Colors.white}
            />
          </Pressable>
        )}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
        {/* Property type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>
            {city}{district ? `, ${district}` : ''}
          </Text>
        </View>

        {/* Capacity stats row — matching web */}
        {(guests || bedrooms || bathrooms) && (
          <View style={styles.capacityRow}>
            {guests ? (
              <View style={styles.capacityStat}>
                <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.capacityText}>{guests}</Text>
              </View>
            ) : null}
            {bedrooms ? (
              <View style={styles.capacityStat}>
                <Ionicons name="bed-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.capacityText}>{bedrooms}</Text>
              </View>
            ) : null}
            {bathrooms ? (
              <View style={styles.capacityStat}>
                <Ionicons name="water-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.capacityText}>{bathrooms}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.priceRow}>
            {hasDiscount && (
              <Text style={styles.originalPrice}>{formatCurrency(originalPrice)}</Text>
            )}
            <Text style={styles.price}>{formatCurrency(price)}</Text>
            <Text style={styles.perNight}>/night</Text>
          </View>
          {rating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={Colors.accent} />
              <Text style={styles.rating}>{formatRating(rating)}</Text>
              <Text style={styles.reviewCount}>({reviewCount})</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
  },
  heartButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  discountText: {
    ...Typography.tiny,
    color: Colors.white,
    fontWeight: '700',
  },
  typeBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  typeText: {
    ...Typography.tiny,
    color: Colors.white,
    fontWeight: '600',
  },
  info: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  capacityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  capacityText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  originalPrice: {
    ...Typography.small,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  price: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  perNight: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
  },
  reviewCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
