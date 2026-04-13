import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import { SAUDI_CITIES } from '../../constants/config';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import type { Listing } from '../../types';
import ListingCard from '../../components/listing/ListingCard';

export default function HomeScreen() {
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['homeFeed'],
    queryFn: () => listingsService.search({ limit: 20 }),
  });

  const listings = data?.data ?? [];

  const handleSearch = () => {
    router.push('/search/destination');
  };

  const handleCityPress = (cityId: string, cityName: string) => {
    router.push({
      pathname: '/results',
      params: { city: cityId, cityName },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>
              {(user?.firstName || user?.name) ? t('home.welcomeUser').replace('{name}', user?.firstName || user?.name?.split(' ')[0] || '') : t('home.welcome')}
            </Text>
            <Text style={styles.greetingSub}>{t('home.subtitle')}</Text>
          </View>
          <Pressable onPress={() => router.push('/account/notifications')}>
            <Ionicons name="notifications-outline" size={26} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <Pressable style={styles.searchBar} onPress={handleSearch}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
        </Pressable>

        {/* City Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.exploreCities')}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SAUDI_CITIES}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cityList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.cityCard}
                onPress={() => handleCityPress(item.id, item.name)}
              >
                <View style={styles.cityIcon}>
                  <Ionicons name="location" size={24} color={Colors.white} />
                </View>
                <Text style={styles.cityName}>{language === 'ar' ? item.nameAr : item.name}</Text>
              </Pressable>
            )}
          />
        </View>

        {/* Featured Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.featuredProperties')}</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{t('home.noProperties')}</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={listings}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listingList}
              renderItem={({ item }) => (
                <ListingCard
                  listing={item}
                  onPress={() => router.push(`/listing/${item._id}`)}
                  style={styles.horizontalCard}
                />
              )}
            />
          )}
        </View>

        {/* Promo Banner */}
        <Pressable style={styles.promoBanner} onPress={handleSearch}>
          <Ionicons name="sparkles" size={28} color={Colors.white} />
          <View style={styles.promoText}>
            <Text style={styles.promoTitle}>{t('home.planTrip')}</Text>
            <Text style={styles.promoSub}>{t('home.planTripSub')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  greeting: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  greetingSub: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  searchPlaceholder: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  cityList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  cityCard: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityName: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  listingList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.base,
  },
  horizontalCard: {
    width: 260,
  },
  loader: {
    paddingVertical: Spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
  promoSub: {
    ...Typography.caption,
    color: Colors.primary200,
    marginTop: 2,
  },
});
