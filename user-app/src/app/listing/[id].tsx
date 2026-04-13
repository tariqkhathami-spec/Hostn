import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { listingsService } from '../../services/listings.service';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatRating } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import { translateDistrict, translateCity } from '../../constants/districts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isAr = language === 'ar';

  // Try fetching as unit first, fall back to property
  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      try {
        const unit = await listingsService.getUnit(id!);
        if (unit && (unit.nameEn || unit.nameAr || unit.name)) {
          // Mark as unit for downstream logic
          return { ...unit, _isUnit: true };
        }
      } catch (err) {
        console.debug('[listing] getUnit failed, falling back to getById:', err);
      }
      return listingsService.getById(id!);
    },
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => listingsService.getReviews(id!),
    enabled: !!id,
  });

  const reviews = reviewsData?.data ?? reviewsData ?? [];

  // Tab-paging instead of scroll — matches web's 8bc861f
  const [activeTab, setActiveTab] = useState<'specifications' | 'reviews' | 'location' | 'policies'>('specifications');

  const NAV_SEGMENTS = [
    { key: 'specifications' as const, label: isAr ? 'المواصفات' : 'Specs', icon: 'clipboard-outline' as const },
    { key: 'reviews' as const, label: isAr ? 'التقييمات' : 'Reviews', icon: 'star-outline' as const },
    { key: 'location' as const, label: isAr ? 'الموقع' : 'Location', icon: 'location-outline' as const },
    { key: 'policies' as const, label: isAr ? 'الشروط' : 'Terms', icon: 'document-text-outline' as const },
  ];

  const isFavorite = user?.wishlist?.includes(id!) ?? false;

  const handleFavorite = async () => {
    if (!id) return;
    try {
      await authService.toggleWishlist(id);
      const updated = await authService.getMe();
      setUser(updated);
    } catch (err) {
      console.debug('[listing] toggleWishlist failed:', err);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out ${listing.title} on Hostn! ${listing.location?.city ?? ''}`,
      });
    } catch (err) {
      console.debug('[listing] share failed:', err);
    }
  };

  const handleBook = () => {
    if (isUnitDetail) {
      router.push({
        pathname: `/checkout/${id}` as any,
        params: { unitId: id, isUnit: '1' },
      });
    } else {
      router.push(`/checkout/${id}`);
    }
  };

  const handleContactHost = () => {
    if (!listing?.host?._id) return;
    const hostName = listing.host?.name ?? listing.host?.firstName ?? '';
    router.push({
      pathname: `/chat/${listing.host._id}`,
      params: { propertyId: id, hostName },
    });
  };

  if (isLoading || !listing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const itemData = listing as any;
  const isUnitDetail = !!(itemData._isUnit);

  // Pricing: units may use per-day rates
  let originalPrice = listing.pricing?.perNight ?? 0;
  if (isUnitDetail && itemData.pricing) {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayPrices = dayKeys.map((k: string) => parseFloat(itemData.pricing[k]) || 0).filter((v: number) => v > 0);
    if (dayPrices.length > 0) {
      originalPrice = dayPrices.reduce((a: number, b: number) => a + b, 0) / dayPrices.length;
    }
  }

  const price = listing.discountedPrice ?? originalPrice;
  const discount = listing.pricing?.discountPercent ?? 0;
  const hasDiscount = discount > 0 && price < originalPrice;
  const rating = listing.ratings?.average ?? 0;
  const reviewCount = listing.ratings?.count ?? 0;
  const city = listing.location?.city ?? '';
  const district = listing.location?.district;
  const hostName = listing.host?.name ?? (`${listing.host?.firstName ?? ''} ${listing.host?.lastName ?? ''}`.trim() || '');

  // Unit-aware title
  const displayTitle = isUnitDetail
    ? (isAr ? itemData.nameAr : itemData.nameEn) || itemData.nameAr || itemData.nameEn || listing.title
    : listing.title;
  const displaySubtitle = isUnitDetail
    ? (itemData.propertyName || itemData.property?.name || '')
    : '';

  // Unit-aware capacity
  const displayBedrooms = isUnitDetail
    ? (itemData.bedrooms?.count ?? itemData.rooms?.bedrooms ?? listing.capacity?.bedrooms)
    : listing.capacity?.bedrooms;
  const displayBathrooms = isUnitDetail
    ? (itemData.bathroomCount ?? itemData.rooms?.bathrooms ?? listing.capacity?.bathrooms)
    : listing.capacity?.bathrooms;

  const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
    rest_house: { en: 'Rest House', ar: 'استراحة' },
    room: { en: 'Room', ar: 'غرفة' },
    hotel_resort: { en: 'Hotel Resort', ar: 'منتجع فندقي' },
    serviced_apartment: { en: 'Serviced Apartment', ar: 'شقة مفروشة' },
  };

  const getTypeLabel = (type: string) => {
    const key = `type.${type}` as any;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    const fallback = TYPE_LABELS[type];
    if (fallback) return isAr ? fallback.ar : fallback.en;
    return type;
  };

  // Sort images so primary comes first
  const sortedImages = [...(listing.images ?? [])].sort((a: any, b: any) =>
    (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
  );

  // Extract map coordinates
  const coords = listing.location?.coordinates ?? listing.location?.geoJSON?.coordinates;
  let lat: number | undefined;
  let lng: number | undefined;
  if (coords) {
    if (Array.isArray(coords)) {
      lng = coords[0];
      lat = coords[1];
    } else if (typeof coords === 'object') {
      lat = (coords as any).lat;
      lng = (coords as any).lng;
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} nestedScrollEnabled>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {sortedImages.length > 0 ? (
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={sortedImages}
              keyExtractor={(_: any, i: number) => i.toString()}
              renderItem={({ item: img }: { item: any }) => {
                const uri = typeof img === 'string' ? img : img?.url;
                return uri ? (
                  <Image source={{ uri }} style={styles.heroImage} contentFit="cover" />
                ) : null;
              }}
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={48} color={Colors.textTertiary} />
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Pressable style={styles.overlayButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.overlayRight}>
              <Pressable style={styles.overlayButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={Colors.textPrimary} />
              </Pressable>
              <Pressable style={styles.overlayButton} onPress={handleFavorite}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? Colors.error : Colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.imageBadge}>
            <Text style={styles.imageBadgeText}>
              1/{sortedImages.length}
            </Text>
          </View>
        </View>

        {/* Header info — always visible */}
        <View style={styles.content}>
          {/* Discount & Type badges */}
          <View style={styles.badgesRow}>
            {hasDiscount && (
              <View style={styles.discountTag}>
                <Text style={styles.discountTagText}>{discount}{t('listing.off')}</Text>
              </View>
            )}
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{getTypeLabel(listing.type)}</Text>
            </View>
          </View>

          {/* Title & Location */}
          <Text style={styles.listingTitle}>{displayTitle}</Text>
          {displaySubtitle ? (
            <Text style={styles.locationText}>{displaySubtitle}</Text>
          ) : null}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.locationText}>
              {translateCity(city, language)}{district ? `, ${translateDistrict(district, city, language)}` : ''}
            </Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            {rating > 0 && (
              <View style={styles.stat}>
                <Ionicons name="star" size={18} color={Colors.accent} />
                <Text style={styles.statValue}>{formatRating(rating)}</Text>
                <Text style={styles.statLabel}>({reviewCount} {t('listing.reviews')})</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{listing.capacity?.maxGuests ?? '-'}</Text>
              <Text style={styles.statLabel}>{t('listing.guests')}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="bed-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{displayBedrooms ?? '-'}</Text>
              <Text style={styles.statLabel}>{t('listing.beds')}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="water-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{displayBathrooms ?? '-'}</Text>
              <Text style={styles.statLabel}>{t('listing.baths')}</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation — paging style (matching web 8bc861f) */}
        <View style={styles.segmentedNavContainer}>
          <View style={styles.segmentedNavRow}>
            {NAV_SEGMENTS.map((seg) => (
              <Pressable
                key={seg.key}
                style={[styles.segmentPill, activeTab === seg.key && styles.segmentPillActive]}
                onPress={() => setActiveTab(seg.key)}
              >
                <Ionicons
                  name={seg.icon}
                  size={16}
                  color={activeTab === seg.key ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[styles.segmentText, activeTab === seg.key && styles.segmentTextActive]}
                  numberOfLines={1}
                >
                  {seg.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tab Content — only active tab renders */}
        <View style={styles.content}>

          {/* ── Tab: Specifications ── */}
          {activeTab === 'specifications' && (
            <>
              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('detail.about')}</Text>
                <Text style={styles.description}>{listing.description}</Text>
              </View>

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('detail.amenities')}</Text>
                  <View style={styles.amenitiesGrid}>
                    {listing.amenities.slice(0, 8).map((amenity: string, i: number) => (
                      <View key={i} style={styles.amenityItem}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                        <Text style={styles.amenityText}>{t(('amenity.' + amenity) as any) ?? amenity}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Host */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('detail.host')}</Text>
                <View style={styles.hostCard}>
                  <View style={styles.hostAvatar}>
                    {listing.host?.avatar ? (
                      <Image source={{ uri: listing.host.avatar }} style={styles.hostAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={28} color={Colors.textSecondary} />
                    )}
                  </View>
                  <View style={styles.hostInfo}>
                    <Text style={styles.hostName}>{hostName}</Text>
                    {listing.host?.isVerified && (
                      <Text style={styles.hostMeta}>{t('detail.verifiedHost')}</Text>
                    )}
                  </View>
                  <Pressable style={styles.contactButton} onPress={handleContactHost}>
                    <Text style={styles.contactText}>{t('detail.contact')}</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* ── Tab: Reviews ── */}
          {activeTab === 'reviews' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('detail.guestReviews' as any)}</Text>
              {Array.isArray(reviews) && reviews.length > 0 ? (
                reviews.slice(0, 5).map((review: any, idx: number) => (
                  <View key={review._id ?? idx} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerAvatar}>
                        {review.user?.avatar ? (
                          <Image source={{ uri: review.user.avatar }} style={styles.reviewerAvatarImage} />
                        ) : (
                          <Ionicons name="person" size={20} color={Colors.textSecondary} />
                        )}
                      </View>
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>
                          {review.user?.name ?? review.user?.firstName ?? t('account.guest' as any)}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : ''}
                        </Text>
                      </View>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= (review.rating ?? 0) ? 'star' : 'star-outline'}
                            size={14}
                            color={Colors.accent}
                          />
                        ))}
                      </View>
                    </View>
                    {review.comment ? (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyReviews}>
                  <Ionicons name="chatbubble-outline" size={32} color={Colors.textTertiary} />
                  <Text style={styles.emptyReviewsText}>{t('detail.noReviews' as any)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Tab: Location ── */}
          {activeTab === 'location' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('detail.location')}</Text>
              {lat && lng ? (
                <>
                  <View style={styles.mapContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.map}
                      initialRegion={{
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                    >
                      <Marker coordinate={{ latitude: lat, longitude: lng }} />
                    </MapView>
                  </View>
                  {listing.location?.isApproximate && (
                    <Text style={styles.approximateText}>{t('detail.approximateLocation')}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.noMapText}>
                  {isAr ? 'لم يتم تحديد الموقع على الخريطة' : 'Location not available on map'}
                </Text>
              )}
              {/* Address */}
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={styles.addressText}>
                  {district ? `${translateDistrict(district, city, language)}, ` : ''}{translateCity(city, language)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Tab: Policies / Terms ── */}
          {activeTab === 'policies' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('detail.policies')}</Text>
              {listing.rules?.checkInTime && (
                <View style={styles.policyRow}>
                  <Text style={styles.policyLabel}>{t('detail.checkIn')}</Text>
                  <Text style={styles.policyValue}>{listing.rules.checkInTime}</Text>
                </View>
              )}
              {listing.rules?.checkOutTime && (
                <View style={styles.policyRow}>
                  <Text style={styles.policyLabel}>{t('detail.checkOut')}</Text>
                  <Text style={styles.policyValue}>{listing.rules.checkOutTime}</Text>
                </View>
              )}
              {listing.rules?.minNights > 1 && (
                <View style={styles.policyRow}>
                  <Text style={styles.policyLabel}>{t('detail.minNights')}</Text>
                  <Text style={styles.policyValue}>{listing.rules.minNights}</Text>
                </View>
              )}
              <View style={styles.policyRow}>
                <Text style={styles.policyLabel}>{t('detail.smoking')}</Text>
                <Text style={styles.policyValue}>{listing.rules?.smokingAllowed ? t('detail.allowed') : t('detail.notAllowed')}</Text>
              </View>
              <View style={styles.policyRow}>
                <Text style={styles.policyLabel}>{t('detail.pets')}</Text>
                <Text style={styles.policyValue}>{listing.rules?.petsAllowed ? t('detail.allowed') : t('detail.notAllowed')}</Text>
              </View>
              <View style={styles.policyRow}>
                <Text style={styles.policyLabel}>{t('detail.parties')}</Text>
                <Text style={styles.policyValue}>{listing.rules?.partiesAllowed ? t('detail.allowed') : t('detail.notAllowed')}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            {hasDiscount && (
              <Text style={styles.bottomOriginalPrice}>{formatCurrency(originalPrice)}</Text>
            )}
            <Text style={styles.bottomPrice}>{formatCurrency(price)}</Text>
          </View>
          <Text style={styles.bottomPerNight}>{t('common.perNight')}</Text>
        </View>
        <Pressable style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookText}>{t('detail.bookNow')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  imageContainer: { position: 'relative' },
  heroImage: { width: SCREEN_WIDTH, height: 280 },
  imageOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  overlayRight: { flexDirection: 'row', gap: Spacing.sm },
  overlayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  imageBadgeText: { ...Typography.tiny, color: Colors.white },
  // Tab navigation — paging style
  segmentedNavContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  segmentedNavRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 3,
    gap: 3,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  segmentPillActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.base },
  badgesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  discountTag: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  discountTagText: { ...Typography.tiny, color: Colors.white, fontWeight: '700' },
  typeTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  typeTagText: { ...Typography.tiny, color: Colors.white, fontWeight: '600' },
  listingTitle: { ...Typography.h2, color: Colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  locationText: { ...Typography.small, color: Colors.textSecondary },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.base,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.divider,
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { ...Typography.smallBold, color: Colors.textPrimary },
  statLabel: { ...Typography.caption, color: Colors.textSecondary },
  section: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.md },
  description: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  amenityText: { ...Typography.small, color: Colors.textPrimary },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  hostAvatarImage: { width: 50, height: 50 },
  hostInfo: { flex: 1 },
  hostName: { ...Typography.bodyBold, color: Colors.textPrimary },
  hostMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  contactButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  contactText: { ...Typography.smallBold, color: Colors.primary },
  mapContainer: {
    height: 200,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  approximateText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  noMapText: { ...Typography.small, color: Colors.textTertiary },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  addressText: { ...Typography.small, color: Colors.textSecondary, flex: 1 },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  policyLabel: { ...Typography.small, color: Colors.textSecondary },
  policyValue: { ...Typography.smallBold, color: Colors.textPrimary },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  reviewerAvatarImage: { width: 36, height: 36 },
  reviewerInfo: { flex: 1, marginLeft: Spacing.sm },
  reviewerName: { ...Typography.smallBold, color: Colors.textPrimary },
  reviewDate: { ...Typography.caption, color: Colors.textTertiary, marginTop: 1 },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { ...Typography.small, color: Colors.textSecondary, lineHeight: 20 },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyReviewsText: { ...Typography.small, color: Colors.textTertiary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.bottomBar,
  },
  bottomOriginalPrice: { ...Typography.small, color: Colors.textTertiary, textDecorationLine: 'line-through' },
  bottomPrice: { ...Typography.h3, color: Colors.primary },
  bottomPerNight: { ...Typography.caption, color: Colors.textSecondary },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  bookText: { ...Typography.bodyBold, color: Colors.white },
});
