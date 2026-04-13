import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Property, Unit, UnitPricing, UnitDiscount, CustomOffer } from '../../types';

type TabKey = 'prices' | 'offers';

interface DayRateConfig {
  key: keyof UnitPricing;
  label: string;
  description: string;
}

const DAY_RATES: DayRateConfig[] = [
  { key: 'midWeek', label: 'وسط الأسبوع', description: 'الأحد - الأربعاء' },
  { key: 'thursday', label: 'الخميس', description: '' },
  { key: 'friday', label: 'الجمعة', description: '' },
  { key: 'saturday', label: 'السبت', description: '' },
];

export default function UnitPricingDetailScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('prices');
  const [expandedRate, setExpandedRate] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Fetch unit info
  const {
    data: unitData,
    isLoading: unitLoading,
  } = useQuery({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      try { return await hostService.getUnit(unitId!); }
      catch { return await hostService.getUnitLegacy(unitId!); }
    },
    enabled: !!unitId,
    retry: false,
  });

  const unit: Unit | undefined = unitData?.data;

  // Fetch pricing
  const {
    data: pricingData,
    isLoading: pricingLoading,
    refetch: refetchPricing,
    isRefetching: pricingRefetching,
  } = useQuery({
    queryKey: ['unitPricing', unitId],
    queryFn: () => hostService.getUnitPricing(unitId!),
    enabled: !!unitId,
    retry: false,
  });

  const pricing: UnitPricing | undefined = pricingData?.data;

  // Fetch discounts
  const {
    data: discountsData,
    isLoading: discountsLoading,
    refetch: refetchDiscounts,
    isRefetching: discountsRefetching,
  } = useQuery({
    queryKey: ['unitDiscounts', unitId],
    queryFn: () => hostService.getUnitDiscounts(unitId!),
    enabled: !!unitId,
    retry: false,
  });

  const discounts: UnitDiscount[] = discountsData?.data ?? [];

  // Fetch offers
  const {
    data: offersData,
    isLoading: offersLoading,
    refetch: refetchOffers,
    isRefetching: offersRefetching,
  } = useQuery({
    queryKey: ['unitOffers', unitId],
    queryFn: () => hostService.getUnitOffers(unitId!),
    enabled: !!unitId,
    retry: false,
  });

  const offers: CustomOffer[] = offersData?.data ?? [];

  // Mutations
  const updatePricingMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      try { return await hostService.updateUnitPricing(unitId!, data); }
      catch { return await hostService.updateUnitPricingLegacy(unitId!, data); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitPricing', unitId] });
      setExpandedRate(null);
      setEditValues({});
    },
  });

  const toggleDiscountMutation = useMutation({
    mutationFn: (type: string) => hostService.toggleDiscount(unitId!, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitDiscounts', unitId] });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (offerId: string) => hostService.deleteOffer(unitId!, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitOffers', unitId] });
    },
  });

  const handleSaveRate = useCallback(
    (rateKey: string) => {
      const value = editValues[rateKey];
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
        return;
      }
      updatePricingMutation.mutate({ [rateKey]: Number(value) });
    },
    [editValues, updatePricingMutation],
  );

  const handleToggleRate = useCallback(
    (rateKey: string) => {
      if (expandedRate === rateKey) {
        setExpandedRate(null);
      } else {
        setExpandedRate(rateKey);
        if (pricing) {
          setEditValues((prev) => ({
            ...prev,
            [rateKey]: String(pricing[rateKey as keyof UnitPricing] ?? ''),
          }));
        }
      }
    },
    [expandedRate, pricing],
  );

  const handleToggleDiscount = useCallback(
    (type: string) => {
      toggleDiscountMutation.mutate(type);
    },
    [toggleDiscountMutation],
  );

  const handleDeleteOffer = useCallback(
    (offerId: string) => {
      Alert.alert(
        'حذف العرض',
        'هل أنت متأكد من حذف هذا العرض؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: () => deleteOfferMutation.mutate(offerId),
          },
        ],
      );
    },
    [deleteOfferMutation],
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === 'prices') {
      refetchPricing();
    } else {
      refetchDiscounts();
      refetchOffers();
    }
  }, [activeTab, refetchPricing, refetchDiscounts, refetchOffers]);

  const isRefreshing =
    activeTab === 'prices' ? pricingRefetching : discountsRefetching || offersRefetching;

  const isLoading = unitLoading || (activeTab === 'prices' ? pricingLoading : discountsLoading || offersLoading);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="..." showBack fallbackRoute="/pricing" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{'جاري التحميل...'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title={unit?.name ?? 'الأسعار'} showBack fallbackRoute="/pricing" />

      {/* Segmented Control */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'offers' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.segmentText, activeTab === 'offers' && styles.segmentTextActive]}>
            {'العروض والخصومات'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'prices' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('prices')}
        >
          <Text style={[styles.segmentText, activeTab === 'prices' && styles.segmentTextActive]}>
            {'الأسعار'}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'prices' ? (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          {DAY_RATES.map((rate) => {
            const currentPrice = pricing?.[rate.key] ?? 0;
            const isExpanded = expandedRate === rate.key;

            return (
              <View key={rate.key} style={styles.rateCard}>
                <TouchableOpacity
                  style={styles.rateHeader}
                  onPress={() => handleToggleRate(rate.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <View style={styles.rateHeaderInfo}>
                    <Text style={styles.rateLabel}>{rate.label}</Text>
                    {rate.description ? (
                      <Text style={styles.rateDescription}>{rate.description}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.ratePrice}>{formatCurrency(currentPrice)}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.rateEditContainer}>
                    <View style={styles.rateEditRow}>
                      <TouchableOpacity
                        style={[
                          styles.saveButton,
                          updatePricingMutation.isPending && styles.saveButtonDisabled,
                        ]}
                        onPress={() => handleSaveRate(rate.key)}
                        disabled={updatePricingMutation.isPending}
                      >
                        {updatePricingMutation.isPending ? (
                          <ActivityIndicator size="small" color={Colors.textWhite} />
                        ) : (
                          <Text style={styles.saveButtonText}>{'حفظ'}</Text>
                        )}
                      </TouchableOpacity>
                      <TextInput
                        style={styles.rateInput}
                        value={editValues[rate.key] ?? ''}
                        onChangeText={(text) =>
                          setEditValues((prev) => ({ ...prev, [rate.key]: text }))
                        }
                        keyboardType="numeric"
                        placeholder={'أدخل السعر'}
                        placeholderTextColor={Colors.textTertiary}
                        textAlign="right"
                      />
                    </View>
                    <Text style={styles.currencyHint}>{'ريال سعودي'}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          {/* Weekly Discount */}
          {renderDiscountCard(
            discounts.find((d) => d.type === 'weekly'),
            'weekly',
            'خصم أسبوعي',
            'خصم عند الحجز لمدة أسبوع',
            handleToggleDiscount,
            toggleDiscountMutation.isPending,
          )}

          {/* Monthly Discount */}
          {renderDiscountCard(
            discounts.find((d) => d.type === 'monthly'),
            'monthly',
            'خصم شهري',
            'خصم عند الحجز لمدة شهر',
            handleToggleDiscount,
            toggleDiscountMutation.isPending,
          )}

          {/* Custom Offers */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{'العروض المخصصة'}</Text>
          </View>

          {offers.length > 0 ? (
            offers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <TouchableOpacity
                    onPress={() => handleDeleteOffer(offer.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerName}>{offer.name}</Text>
                    <Text style={styles.offerDiscount}>{offer.discountPercent}% {'خصم'}</Text>
                    {offer.selectedDates.length > 0 && (
                      <Text style={styles.offerDates}>
                        {offer.selectedDates.length} {'أيام'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyOffers}>
              <Ionicons name="pricetag-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{'لا توجد عروض مخصصة'}</Text>
            </View>
          )}

          {/* Add Offer Button */}
          <TouchableOpacity style={styles.addOfferButton} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.textWhite} />
            <Text style={styles.addOfferText}>{'أضف عرض'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

function renderDiscountCard(
  discount: UnitDiscount | undefined,
  type: string,
  title: string,
  description: string,
  onToggle: (type: string) => void,
  isPending: boolean,
) {
  const percentage = discount?.percentage ?? 0;
  const isActive = discount?.active ?? false;

  return (
    <View style={styles.discountCard}>
      <View style={styles.discountHeader}>
        <Switch
          value={isActive}
          onValueChange={() => onToggle(type)}
          trackColor={{ false: Colors.border, true: Colors.primary300 }}
          thumbColor={isActive ? Colors.primary : Colors.textTertiary}
          disabled={isPending}
        />
        <View style={styles.discountInfo}>
          <Text style={styles.discountTitle}>{title}</Text>
          <Text style={styles.discountDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.discountPercentageContainer}>
        <Text style={styles.discountPercentageLabel}>{'نسبة الخصم'}</Text>
        <Text style={[styles.discountPercentage, isActive && styles.discountPercentageActive]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  segmentText: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  // Prices tab
  rateCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  rateHeaderInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: Spacing.md,
  },
  rateLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  rateDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  ratePrice: {
    ...Typography.subtitle,
    color: Colors.primary,
  },
  rateEditContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.base,
    backgroundColor: Colors.surface,
  },
  rateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rateInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.smallBold,
    color: Colors.textWhite,
  },
  currencyHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  // Offers tab
  discountCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discountInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  discountTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  discountDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  discountPercentageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  discountPercentageLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  discountPercentage: {
    ...Typography.h3,
    color: Colors.textTertiary,
  },
  discountPercentageActive: {
    color: Colors.primary,
  },
  sectionHeader: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  offerName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  offerDiscount: {
    ...Typography.small,
    color: Colors.primary,
    marginTop: 2,
    textAlign: 'right',
  },
  offerDates: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  emptyOffers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  addOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  addOfferText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
