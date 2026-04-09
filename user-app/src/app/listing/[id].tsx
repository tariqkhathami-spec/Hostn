import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  ActivityIndicator,
  Dimensions,
  Platform,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsService.getById(id!),
    enabled: !!id,
  });

  const isFavorite = user?.wishlist?.includes(id!) ?? false;

  const handleFavorite = async () => {
    if (!id) return;
    try {
      await authService.toggleWishlist(id);
      const updated = await authService.getMe();
      setUser(updated);
    } catch {}
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out ${listing.title} on Hostn! ${listing.location?.city ?? ''}`,
      });
    } catch {}
  };

  const handleBook = () => {
    router.push(`/checkout/${id}`);
  };

  const handleContactHost = () => {
    if (!listing) return;
    const hostName = listing.host.name ?? listing.host.firstName ?? '';
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

  const price = listing.discountedPrice ?? listing.pricing?.perNight ?? 0;
  const rating = listing.ratings?.average ?? 0;
  const reviewCount = listing.ratings?.count ?? 0;
  const city = listing.location?.city ?? '';
  const district = listing.location?.district;
  const hostName = listing.host.name ?? `${listing.host.firstName ?? ''} ${listing.host.lastName ?? ''}`.trim();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(listing.images ?? []).map((img: any, i: number) => {
              const uri = typeof img === 'string' ? img : img?.url;
              return uri ? (
                <Image key={i} source={{ uri }} style={styles.heroImage} contentFit="cover" />
              ) : null;
            })}
          </ScrollView>
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
              1/{listing.images?.length ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title & Location */}
          <Text style={styles.listingTitle}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.locationText}>
              {city}{district ? `, ${district}` : ''}
            </Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            {rating > 0 && (
              <View style={styles.stat}>
                <Ionicons name="star" size={18} color={Colors.accent} />
                <Text style={styles.statValue}>{formatRating(rating)}</Text>
                <Text style={styles.statLabel}>({reviewCount} reviews)</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{listing.capacity?.maxGuests ?? '-'}</Text>
              <Text style={styles.statLabel}>guests</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="bed-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{listing.capacity?.bedrooms ?? '-'}</Text>
              <Text style={styles.statLabel}>beds</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="water-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{listing.capacity?.bathrooms ?? '-'}</Text>
              <Text style={styles.statLabel}>baths</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Amenities */}
          {listing.amenities?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {listing.amenities.slice(0, 8).map((amenity: string, i: number) => (
                  <View key={i} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Host */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Host</Text>
            <View style={styles.hostCard}>
              <View style={styles.hostAvatar}>
                {listing.host.avatar ? (
                  <Image source={{ uri: listing.host.avatar }} style={styles.hostAvatarImage} />
                ) : (
                  <Ionicons name="person" size={28} color={Colors.textSecondary} />
                )}
              </View>
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{hostName}</Text>
                {listing.host.isVerified && (
                  <Text style={styles.hostMeta}>Verified host</Text>
                )}
              </View>
              <Pressable style={styles.contactButton} onPress={handleContactHost}>
                <Text style={styles.contactText}>Contact</Text>
              </Pressable>
            </View>
          </View>

          {/* Location Map */}
          {(() => {
            const coords = listing.location?.coordinates
              ?? listing.location?.geoJSON?.coordinates;
            if (!coords) return null;
            // geoJSON is [lng, lat], coordinates may be {lat, lng} or [lng, lat]
            let lat: number | undefined;
            let lng: number | undefined;
            if (Array.isArray(coords)) {
              lng = coords[0];
              lat = coords[1];
            } else if (typeof coords === 'object') {
              lat = (coords as any).lat;
              lng = (coords as any).lng;
            }
            if (!lat || !lng) return null;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
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
                  <Text style={styles.approximateText}>Approximate location shown</Text>
                )}
              </View>
            );
          })()}

          {/* Policies */}
          {(listing.rules?.checkInTime || listing.rules?.checkOutTime) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Policies</Text>
              {listing.rules.checkInTime && (
                <View style={styles.policyRow}>
                  <Text style={styles.policyLabel}>Check-in</Text>
                  <Text style={styles.policyValue}>{listing.rules.checkInTime}</Text>
                </View>
              )}
              {listing.rules.checkOutTime && (
                <View style={styles.policyRow}>
                  <Text style={styles.policyLabel}>Check-out</Text>
                  <Text style={styles.policyValue}>{listing.rules.checkOutTime}</Text>
                </View>
              )}
              {listing.rules.minNights > 1 && (
                <View style={styles.policyRow}>
                  <Text style={styles.policyLabel}>Min nights</Text>
                  <Text style={styles.policyValue}>{listing.rules.minNights}</Text>
                </View>
              )}
              <View style={styles.policyRow}>
                <Text style={styles.policyLabel}>Smoking</Text>
                <Text style={styles.policyValue}>{listing.rules.smokingAllowed ? 'Allowed' : 'Not allowed'}</Text>
              </View>
              <View style={styles.policyRow}>
                <Text style={styles.policyLabel}>Pets</Text>
                <Text style={styles.policyValue}>{listing.rules.petsAllowed ? 'Allowed' : 'Not allowed'}</Text>
              </View>
              <View style={styles.policyRow}>
                <Text style={styles.policyLabel}>Parties</Text>
                <Text style={styles.policyValue}>{listing.rules.partiesAllowed ? 'Allowed' : 'Not allowed'}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPrice}>{formatCurrency(price)}</Text>
          <Text style={styles.bottomPerNight}>per night</Text>
        </View>
        <Pressable style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookText}>Book Now</Text>
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
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.base },
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
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  policyLabel: { ...Typography.small, color: Colors.textSecondary },
  policyValue: { ...Typography.smallBold, color: Colors.textPrimary },
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
