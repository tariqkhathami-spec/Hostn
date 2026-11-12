import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { listingsService } from '../../services/listings.service';
import { formatCurrency } from '../../utils/format';
import { propertyTitle, unitName } from '../../utils/unit';
import { cityLabel } from '../../constants/cities';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius, Shadows, BACK_ICON, FORWARD_ICON } from '../../constants/theme';
import type { Listing } from '../../types';

/**
 * A property opened by its own id (from a host's public page, an old booking,
 * a link). Guests book units, not properties, so this screen only decides
 * where to go:
 *  - one bookable unit  -> straight to that unit's detail
 *  - several            -> the list of units, each opening its detail
 *  - none               -> an explanation instead of a dead end
 */
export default function PropertyUnitsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['property-units', id],
    queryFn: async () => {
      const property = await listingsService.getById(id!);
      const units = await listingsService.getPropertyUnits(id!, property);
      return { property, units };
    },
    enabled: !!id,
    retry: (count, err: any) => err?.response?.status !== 404 && err?.response?.status !== 400 && count < 2,
  });

  const header = (title: string) => (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name={BACK_ICON} size={22} color={Colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 38 }} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (isError || !data || !id) {
    // 404: the property was removed or unlisted (400: not a valid id).
    const status = (error as any)?.response?.status;
    const gone = status === 404 || status === 400;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header('')}
        <View style={styles.state}>
          <Ionicons name={gone ? 'home-outline' : 'alert-circle-outline'} size={56} color={Colors.textTertiary} />
          <Text style={styles.stateTitle}>{gone ? t('property.notFoundTitle') : t('common.somethingWrong')}</Text>
          <Text style={styles.stateBody}>{gone ? t('property.notFoundBody') : t('common.unexpectedError')}</Text>
          {gone ? (
            <Pressable style={styles.primaryButton} onPress={() => router.back()}>
              <Text style={styles.primaryButtonText}>{t('common.back')}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={() => refetch()} disabled={isRefetching}>
              {isRefetching ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('common.tryAgain')}</Text>
              )}
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { property, units } = data;
  const title = propertyTitle(property, language);

  // Exactly one bookable unit: it replaces this screen, so "back" from the
  // unit returns to where the guest came from.
  if (units.length === 1) {
    return <Redirect href={`/listing/${units[0]._id}`} />;
  }

  if (units.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header(title)}
        <View style={styles.state}>
          <Ionicons name="bed-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.stateTitle}>{t('property.noUnitsTitle')}</Text>
          <Text style={styles.stateBody}>{t('property.noUnitsBody')}</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.primaryButtonText}>{t('property.browse')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const city = cityLabel(property.location?.city, language);

  const renderUnit = ({ item }: { item: Listing }) => {
    const unit = item as any;
    const images: any[] = unit.images ?? [];
    const primary = images.find((img) => typeof img !== 'string' && img?.isPrimary) ?? images[0];
    const imageUri = typeof primary === 'string' ? primary : primary?.url;
    // Set by flattenUnit: the average day price, after the unit's discount.
    const original = Number(item.pricing?.perNight) || 0;
    const price = Number(item.discountedPrice) || original;
    const hasDiscount = price > 0 && price < original;
    const guests = item.capacity?.maxGuests;

    return (
      <Pressable style={styles.card} onPress={() => router.push(`/listing/${item._id}`)}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{unitName(item, language)}</Text>
          {!!guests && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{guests} {t('listing.guests')}</Text>
            </View>
          )}
          {price > 0 ? (
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(price)}</Text>
              <Text style={styles.priceUnit}>{t('listing.perNight')}</Text>
              {hasDiscount && <Text style={styles.priceOld}>{formatCurrency(original)}</Text>}
            </View>
          ) : (
            <Text style={styles.metaText}>{t('property.priceUnavailable')}</Text>
          )}
        </View>
        <Ionicons name={FORWARD_ICON} size={18} color={Colors.textTertiary} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header(t('property.unitsTitle'))}
      <FlatList
        data={units}
        keyExtractor={(item) => item._id}
        renderItem={renderUnit}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.propertyName}>{title}</Text>
            {!!city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{city}</Text>
              </View>
            )}
            <Text style={styles.count}>{t('property.unitsCount', { count: units.length })}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary, flexShrink: 1, textAlign: 'center' },

  list: { padding: Spacing.xl, gap: Spacing.md },
  intro: { gap: Spacing.xs, marginBottom: Spacing.sm },
  propertyName: { ...Typography.h3, color: Colors.textPrimary },
  count: { ...Typography.small, color: Colors.textSecondary, marginTop: Spacing.xs },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  cardImage: { width: 96, height: 96, borderRadius: Radius.sm },
  cardImagePlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: Spacing.xs },
  cardTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.caption, color: Colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  price: { ...Typography.bodyBold, color: Colors.primary },
  priceUnit: { ...Typography.caption, color: Colors.textSecondary },
  priceOld: { ...Typography.caption, color: Colors.textTertiary, textDecorationLine: 'line-through' },

  state: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  stateTitle: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center' },
  stateBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: Spacing.md,
  },
  primaryButtonText: { ...Typography.bodyBold, color: Colors.white },
  secondaryButton: { paddingVertical: Spacing.sm },
  secondaryButtonText: { ...Typography.bodyBold, color: Colors.primary },
});
