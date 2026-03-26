import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Share,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { propertyService } from '../../services/property.service';
import { reviewService } from '../../services/review.service';
import { messageService } from '../../services/message.service';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { useSearchStore } from '../../store/searchStore';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/format';
import type { Property, Review, User, AmenityType } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;

const AMENITY_ICONS: Record<AmenityType, keyof typeof Ionicons.glyphMap> = {
  wifi: 'wifi',
  pool: 'water',
  parking: 'car',
  ac: 'snow',
  kitchen: 'restaurant',
  tv: 'tv',
  washer: 'water-outline',
  dryer: 'sunny-outline',
  gym: 'barbell',
  bbq: 'flame',
  garden: 'leaf',
  balcony: 'resize-outline',
  sea_view: 'boat',
  mountain_view: 'trail-sign',
  elevator: 'arrow-up',
  security: 'shield-checkmark',
  pet_friendly: 'paw',
  smoking_allowed: 'cafe-outline',
  breakfast_included: 'cafe',
  heating: 'thermometer',
  beach_access: 'umbrella',
  fireplace: 'bonfire',
  hot_tub: 'water',
};

const AMENITY_LABELS: Record<AmenityType, string> = {
  wifi: 'Wi-Fi',
  pool: 'Pool',
  parking: 'Parking',
  ac: 'A/C',
  kitchen: 'Kitchen',
  tv: 'TV',
  washer: 'Washer',
  dryer: 'Dryer',
  gym: 'Gym',
  bbq: 'BBQ',
  garden: 'Garden',
  balcony: 'Balcony',
  sea_view: 'Sea View',
  mountain_view: 'Mountain View',
  elevator: 'Elevator',
  security: 'Security',
  pet_friendly: 'Pet Friendly',
  smoking_allowed: 'Smoking',
  breakfast_included: 'Breakfast',
  heating: 'Heating',
  beach_access: 'Beach Access',
  fireplace: 'Fireplace',
  hot_tub: 'Hot Tub',
};

function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonImage, { backgroundColor: Colors.skeleton }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '70%', height: 24 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 16, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 16, marginTop: 16 }]} />
        <View style={[styles.skeletonLine, { width: '80%', height: 16, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 16, marginTop: 8 }]} />
      </View>
    </View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateWishlist = useAuthStore((s) => s.updateWishlist);
  const dates = useSearchStore((s) => s.dates);
  const guests = useSearchStore((s) => s.guests);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertyService.getById(id!),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewService.getPropertyReviews(id!),
    enabled: !!id,
  });

  const reviews = reviewsData?.data ?? [];
  const isWishlisted = user?.wishlist?.includes(id!) ?? false;

  const handleImageScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setActiveImageIndex(index);
    },
    []
  );

  const handleShare = async () => {
    if (!property) return;
    try {
      await Share.share({
        message: `Check out ${property.title} on Hostn!`,
      });
    } catch {}
  };

  const handleToggleWishlist = async () => {
    if (!user || !id) return;
    setWishlistLoading(true);
    try {
      const result = await authService.toggleWishlist(id);
      updateWishlist(result.wishlist);
    } catch {}
    setWishlistLoading(false);
  };

  const handleContactHost = async () => {
    if (!property) return;
    const hostUser = property.host as User;
    if (!hostUser?._id) return;
    try {
      const conversation = await messageService.createConversation(hostUser._id, property._id);
      router.push(`/chat/${conversation._id}`);
    } catch {}
  };

  const handleBookNow = () => {
    if (!property) return;
    router.push(`/checkout/${property._id}`);
  };

  // Price calculations
  const nights =
    dates.checkIn && dates.checkOut
      ? Math.ceil(
          (new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 1;

  const perNight = property?.pricing?.perNight ?? 0;
  const cleaningFee = property?.pricing?.cleaningFee ?? 0;
  const subtotal = perNight * nights;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + cleaningFee + serviceFee;

  if (propertyLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar style="dark" />
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  if (propertyError || !property) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top']}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Failed to load property</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const hostUser = property.host as User;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.imageSection}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {property.images.map((img, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.95}
                onPress={() => router.push(`/gallery/${property._id}`)}
              >
                <Image
                  source={{ uri: img.url }}
                  style={styles.heroImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          <View style={styles.paginationDots}>
            {property.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeImageIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Overlay Buttons */}
          <SafeAreaView style={styles.overlayButtons} edges={['top']}>
            <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.overlayRight}>
              <TouchableOpacity style={styles.overlayBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.overlayBtn}
                onPress={handleToggleWishlist}
                disabled={wishlistLoading}
              >
                <Ionicons
                  name={isWishlisted ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isWishlisted ? Colors.heart : Colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* Title & Location */}
          <Text style={styles.title}>{property.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.locationText}>
              {property.location.district
                ? `${property.location.district}, ${property.location.city}`
                : property.location.city}
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={Colors.star} />
            <Text style={styles.ratingText}>
              {property.ratings.average.toFixed(1)}
            </Text>
            <Text style={styles.reviewCountText}>
              ({property.ratings.count} reviews)
            </Text>
          </View>

          {/* Property Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.capacity.maxGuests} guests</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.capacity.bedrooms} bedrooms</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.capacity.bathrooms} baths</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{property.description}</Text>
          </View>

          {/* Amenities */}
          {property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Facilities</Text>
              <View style={styles.amenitiesGrid}>
                {property.amenities.map((amenity) => (
                  <View key={amenity} style={styles.amenityItem}>
                    <Ionicons
                      name={AMENITY_ICONS[amenity] ?? 'ellipse-outline'}
                      size={22}
                      color={Colors.primary}
                    />
                    <Text style={styles.amenityLabel}>
                      {AMENITY_LABELS[amenity] ?? amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsScroll}
              >
                {reviews.map((review: Review) => (
                  <View key={review._id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        {review.guest?.avatar ? (
                          <Image
                            source={{ uri: review.guest.avatar }}
                            style={styles.reviewAvatarImage}
                          />
                        ) : (
                          <Text style={styles.reviewAvatarText}>
                            {review.guest?.name?.charAt(0)?.toUpperCase() ?? 'G'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.reviewHeaderText}>
                        <Text style={styles.reviewName}>
                          {review.guest?.name ?? 'Guest'}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {formatRelativeTime(review.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.reviewRating}>
                        <Ionicons name="star" size={14} color={Colors.star} />
                        <Text style={styles.reviewRatingText}>
                          {review.ratings.overall.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.reviewComment} numberOfLines={4}>
                      {review.comment}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Price Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {formatCurrency(perNight)} x {nights} night{nights > 1 ? 's' : ''}
              </Text>
              <Text style={styles.priceValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Cleaning fee</Text>
              <Text style={styles.priceValue}>{formatCurrency(cleaningFee)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Service fee</Text>
              <Text style={styles.priceValue}>{formatCurrency(serviceFee)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Host Section */}
          {hostUser && typeof hostUser === 'object' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Host</Text>
              <View style={styles.hostCard}>
                <View style={styles.hostAvatar}>
                  {hostUser.avatar ? (
                    <Image
                      source={{ uri: hostUser.avatar }}
                      style={styles.hostAvatarImage}
                    />
                  ) : (
                    <Text style={styles.hostAvatarText}>
                      {hostUser.name?.charAt(0)?.toUpperCase() ?? 'H'}
                    </Text>
                  )}
                </View>
                <View style={styles.hostInfo}>
                  <Text style={styles.hostName}>{hostUser.name}</Text>
                  {hostUser.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.contactHostBtn} onPress={handleContactHost}>
                  <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
                  <Text style={styles.contactHostText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom spacing for sticky bar */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceAmount}>{formatCurrency(perNight)}</Text>
          <Text style={styles.bottomPriceLabel}> / night</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  errorButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  errorButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },

  // Skeleton
  skeletonContainer: {
    flex: 1,
  },
  skeletonImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  skeletonContent: {
    padding: Spacing.base,
  },
  skeletonLine: {
    backgroundColor: Colors.skeleton,
    borderRadius: Radius.xs,
  },

  // Image Section
  imageSection: {
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: Colors.textWhite,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overlayButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  overlayRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  overlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  locationText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  reviewCountText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  descriptionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // Amenities
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  amenityItem: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.md * 3) / 4,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  amenityLabel: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Reviews
  reviewsScroll: {
    gap: Spacing.md,
  },
  reviewCard: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.base,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reviewAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewAvatarText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
  reviewHeaderText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  reviewName: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewRatingText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewComment: {
    ...Typography.small,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Price Breakdown
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  priceLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  priceValue: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  totalLabel: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  totalValue: {
    ...Typography.subtitle,
    color: Colors.primary,
  },

  // Host
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radius.card,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hostAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  hostAvatarText: {
    ...Typography.h3,
    color: Colors.textWhite,
  },
  hostInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  hostName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    ...Typography.caption,
    color: Colors.success,
  },
  contactHostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  contactHostText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.bottomBar,
  },
  bottomPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomPriceAmount: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  bottomPriceLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    ...Shadows.button,
  },
  bookButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
