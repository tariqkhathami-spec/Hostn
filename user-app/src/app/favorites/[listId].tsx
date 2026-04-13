import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistsService } from '../../services/wishlists.service';
import { listingsService } from '../../services/listings.service';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { SAUDI_CITIES } from '../../constants/config';
import { useLanguage } from '../../i18n/LanguageContext';
import ListingCard from '../../components/listing/ListingCard';
import type { Listing } from '../../types';

export default function WishlistDetailScreen() {
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const queryClient = useQueryClient();
  const { t, language, isRTL } = useLanguage();

  // Filter state
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestCount, setGuestCount] = useState(0);

  // City modal state
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

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

  const hasActiveFilters = !!selectedCity || !!checkIn || !!checkOut || guestCount > 0;

  const clearFilters = () => {
    setSelectedCity(null);
    setCheckIn('');
    setCheckOut('');
    setGuestCount(0);
  };

  // Compute nights from check-in/check-out
  const requestedNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0;
    const diff = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  // Split properties into matching and non-matching
  const { matching, nonMatching } = useMemo(() => {
    if (!hasActiveFilters) return { matching: properties, nonMatching: [] };

    const match: Listing[] = [];
    const noMatch: { listing: Listing; reasons: string[] }[] = [];

    properties.forEach((listing) => {
      const reasons: string[] = [];

      // City mismatch
      if (selectedCity) {
        const cityObj = SAUDI_CITIES.find((c) => c.id === selectedCity);
        const listingCity = listing.location?.city?.toLowerCase() || '';
        const cityName = cityObj?.name?.toLowerCase() || '';
        const cityNameAr = cityObj?.nameAr || '';
        if (listingCity !== cityName && listingCity !== cityNameAr && listingCity !== selectedCity) {
          const displayCity = language === 'ar' ? cityNameAr : (cityObj?.name || selectedCity);
          reasons.push(t('favorites.mismatchCity' as any, { city: displayCity }));
        }
      }

      // Guest capacity mismatch
      if (guestCount > 0 && listing.capacity?.maxGuests && listing.capacity.maxGuests < guestCount) {
        reasons.push(t('favorites.mismatchGuests' as any, { count: listing.capacity.maxGuests }));
      }

      // Min nights mismatch
      if (requestedNights > 0 && listing.rules?.minNights && requestedNights < listing.rules.minNights) {
        reasons.push(t('favorites.mismatchNights' as any, { count: listing.rules.minNights }));
      }

      if (reasons.length > 0) {
        noMatch.push({ listing, reasons });
      } else {
        match.push(listing);
      }
    });

    return { matching: match, nonMatching: noMatch };
  }, [properties, selectedCity, guestCount, requestedNights, hasActiveFilters, language, t]);

  // Combined list for FlatList
  const listData = useMemo(() => {
    const items: { listing: Listing; dimmed: boolean; reasons: string[] }[] = [];
    matching.forEach((l) => items.push({ listing: l, dimmed: false, reasons: [] }));
    nonMatching.forEach(({ listing, reasons }) => items.push({ listing, dimmed: true, reasons }));
    return items;
  }, [matching, nonMatching]);

  // Filtered city list for modal
  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return [...SAUDI_CITIES];
    const q = citySearch.toLowerCase();
    return SAUDI_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.nameAr.includes(citySearch)
    );
  }, [citySearch]);

  const selectedCityLabel = useMemo(() => {
    if (!selectedCity) return t('favorites.filterCity' as any);
    const city = SAUDI_CITIES.find((c) => c.id === selectedCity);
    if (!city) return selectedCity;
    return language === 'ar' ? city.nameAr : city.name;
  }, [selectedCity, language, t]);

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

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {/* City Dropdown */}
        <Pressable
          style={[styles.filterChip, selectedCity && styles.filterChipActive]}
          onPress={() => setCityModalVisible(true)}
        >
          <Ionicons
            name="location-outline"
            size={16}
            color={selectedCity ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[styles.filterChipText, selectedCity && styles.filterChipTextActive]}
            numberOfLines={1}
          >
            {selectedCityLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={selectedCity ? Colors.primary : Colors.textSecondary}
          />
        </Pressable>

        {/* Check-in Date */}
        <View style={[styles.filterChip, checkIn ? styles.filterChipActive : undefined]}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={checkIn ? Colors.primary : Colors.textSecondary}
          />
          <TextInput
            style={[styles.dateInput, checkIn && styles.filterChipTextActive]}
            placeholder={t('detail.checkIn')}
            placeholderTextColor={Colors.textTertiary}
            value={checkIn}
            onChangeText={setCheckIn}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>

        {/* Check-out Date */}
        <View style={[styles.filterChip, checkOut ? styles.filterChipActive : undefined]}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={checkOut ? Colors.primary : Colors.textSecondary}
          />
          <TextInput
            style={[styles.dateInput, checkOut && styles.filterChipTextActive]}
            placeholder={t('detail.checkOut')}
            placeholderTextColor={Colors.textTertiary}
            value={checkOut}
            onChangeText={setCheckOut}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>

        {/* Guest Counter */}
        <View style={[styles.filterChip, guestCount > 0 && styles.filterChipActive]}>
          <Ionicons
            name="people-outline"
            size={16}
            color={guestCount > 0 ? Colors.primary : Colors.textSecondary}
          />
          <Pressable
            style={styles.counterButton}
            onPress={() => setGuestCount(Math.max(0, guestCount - 1))}
            hitSlop={4}
          >
            <Ionicons name="remove" size={16} color={Colors.textSecondary} />
          </Pressable>
          <Text
            style={[styles.filterChipText, guestCount > 0 && styles.filterChipTextActive]}
          >
            {guestCount > 0 ? `${guestCount}` : t('favorites.filterGuests' as any)}
          </Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setGuestCount(guestCount + 1)}
            hitSlop={4}
          >
            <Ionicons name="add" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Clear All */}
        {hasActiveFilters && (
          <Pressable style={styles.clearButton} onPress={clearFilters}>
            <Ionicons name="close-circle" size={16} color={Colors.error} />
            <Text style={styles.clearButtonText}>{t('favorites.clearAll' as any)}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );

  const renderCityModal = () => (
    <Modal
      visible={cityModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setCityModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('favorites.filterCity' as any)}</Text>
          <Pressable onPress={() => setCityModalVisible(false)}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.modalSearchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={[styles.modalSearchInput, isRTL && { textAlign: 'right' }]}
            placeholder={t('search.searchCities')}
            placeholderTextColor={Colors.textTertiary}
            value={citySearch}
            onChangeText={setCitySearch}
            autoFocus
          />
        </View>
        {/* "All cities" option to clear selection */}
        <Pressable
          style={[
            styles.cityItem,
            !selectedCity && styles.cityItemActive,
          ]}
          onPress={() => {
            setSelectedCity(null);
            setCityModalVisible(false);
            setCitySearch('');
          }}
        >
          <Text style={[styles.cityItemText, !selectedCity && styles.cityItemTextActive]}>
            {language === 'ar' ? 'جميع المدن' : 'All Cities'}
          </Text>
          {!selectedCity && (
            <Ionicons name="checkmark" size={20} color={Colors.primary} />
          )}
        </Pressable>
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.cityItem,
                selectedCity === item.id && styles.cityItemActive,
              ]}
              onPress={() => {
                setSelectedCity(item.id);
                setCityModalVisible(false);
                setCitySearch('');
              }}
            >
              <Text
                style={[
                  styles.cityItemText,
                  selectedCity === item.id && styles.cityItemTextActive,
                ]}
              >
                {language === 'ar' ? item.nameAr : item.name}
              </Text>
              {selectedCity === item.id && (
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
              )}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

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

      {renderFilterBar()}
      {renderCityModal()}

      {properties.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('favorites.noProperties')}</Text>
          <Text style={styles.emptyText}>{t('favorites.noPropertiesSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.listing._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.cardWrapper, item.dimmed && styles.cardDimmed]}>
              <ListingCard
                listing={item.listing}
                onPress={() => router.push(`/listing/${item.listing._id}`)}
              />
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemove(item.listing._id, item.listing.title)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={24} color={Colors.error} />
              </Pressable>
              {item.dimmed && item.reasons.length > 0 && (
                <View style={styles.mismatchBanner}>
                  <Ionicons name="alert-circle" size={16} color="#B45309" />
                  <Text style={styles.mismatchText}>
                    {item.reasons.join(' \u00B7 ')}
                  </Text>
                </View>
              )}
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

  // Filter bar
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  filterChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dateInput: {
    ...Typography.caption,
    color: Colors.textSecondary,
    minWidth: 70,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  counterButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
  },

  // City modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  cityItemActive: {
    backgroundColor: Colors.primary + '08',
  },
  cityItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  cityItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // Mismatch
  cardDimmed: {
    opacity: 0.5,
  },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.sm,
  },
  mismatchText: {
    ...Typography.caption,
    color: '#B45309',
    flex: 1,
  },

  // Existing
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
