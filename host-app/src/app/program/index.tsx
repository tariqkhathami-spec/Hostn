import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { AmbassadorTier } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'performance' | 'tiers' | 'faq' | 'terms';

interface IndicatorData {
  value: number;
  thresholds: number[];
  /** Tier this indicator currently earns, as computed by the server. */
  tier?: string;
  /** True when lower is better (cancelled bookings). */
  reverse?: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface TermsSection {
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------

const TIER_NAMES: Record<string, string> = {
  basic: 'سفير أساسي',
  silver: 'سفير فضي',
  gold: 'سفير ذهبي',
  peak: 'سفير القمة',
};

const TIER_COLORS: Record<string, string> = {
  basic: Colors.primary,
  silver: '#94a3b8',
  gold: '#d4af37',
  peak: '#059669',
};

const TIER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  basic: 'star-outline',
  silver: 'star-half',
  gold: 'star',
  peak: 'trophy',
};

const TIER_MOTIVATIONS: Record<string, string> = {
  basic: 'أنت في بداية رحلتك كسفير، استمر في التميز!',
  silver: 'أداؤك رائع! اقتربت من المستوى الذهبي.',
  gold: 'مضيف متميز! خطوة واحدة نحو القمة.',
  peak: 'تهانينا! أنت في قمة التميز كمضيف.',
};

const INDICATOR_LABELS: Record<string, string> = {
  confirmedNights: 'الليالي المؤكدة',
  averageRating: 'متوسط التقييمات',
  unitAvailability: 'إتاحة الوحدة',
  guestReviewPercent: 'نسبة تقييم الضيوف',
  hostReviewPercent: 'نسبة تقييم المضيف',
  cancelledBookings: 'الحجوزات الملغية',
};

const TIER_MARKER_LABELS = ['أساسي', 'فضي', 'ذهبي', 'القمة'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgramHeaderBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons
          name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
          size={24}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>برنامج سفير هوستن</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function TierCard({ level }: { level: string }) {
  const tierName = TIER_NAMES[level] || TIER_NAMES.basic;
  const iconName = TIER_ICONS[level] || TIER_ICONS.basic;
  const motivation = TIER_MOTIVATIONS[level] || TIER_MOTIVATIONS.basic;

  return (
    <View style={[styles.tierCard, { backgroundColor: Colors.primary }]}>
      <Ionicons name={iconName} size={48} color={Colors.white} />
      <Text style={styles.tierName}>{tierName}</Text>
      <Text style={styles.tierMotivation}>{motivation}</Text>
    </View>
  );
}

function TabBar({
  activeTab,
  onSelect,
}: {
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'performance', label: 'الأداء' },
    { key: 'tiers', label: 'الفئات والمكافآت' },
    { key: 'faq', label: 'الأسئلة الشائعة' },
    { key: 'terms', label: 'الشروط والأحكام' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarContent}
      style={styles.tabBar}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Performance indicator card
// ---------------------------------------------------------------------------

function IndicatorCard({
  label,
  data,
}: {
  label: string;
  data: IndicatorData;
}) {
  const { value, thresholds } = data;
  // Largest threshold, not the last one: for a "lower is better" indicator
  // the thresholds run downwards (e.g. 6, 5, 2, 0).
  const maxThreshold = Math.max(0, ...thresholds) || 100;
  const progress = Math.min(value / maxThreshold, 1);

  // Determine current tier zone color (the server's tier wins when present)
  let zoneColor = TIER_COLORS.basic;
  if (data.tier && TIER_COLORS[data.tier]) {
    zoneColor = TIER_COLORS[data.tier];
  } else if (thresholds.length >= 4) {
    if (value >= thresholds[3]) zoneColor = TIER_COLORS.peak;
    else if (value >= thresholds[2]) zoneColor = TIER_COLORS.gold;
    else if (value >= thresholds[1]) zoneColor = TIER_COLORS.silver;
  }

  return (
    <View style={[styles.indicatorCard, Shadows.card]}>
      <View style={styles.indicatorHeader}>
        <Text style={styles.indicatorLabel}>{label}</Text>
        <Text style={[styles.indicatorValue, { color: zoneColor }]}>{value}</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress * 100}%`, backgroundColor: zoneColor },
          ]}
        />
        {thresholds.map((t, i) => {
          const position = (t / maxThreshold) * 100;
          return (
            <View
              key={i}
              style={[styles.thresholdMarker, { left: `${position}%` }]}
            >
              <View style={styles.thresholdLine} />
              <Text style={styles.thresholdLabel}>{TIER_MARKER_LABELS[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tiers & Rewards card
// ---------------------------------------------------------------------------

function TierRewardCard({ tier }: { tier: AmbassadorTier }) {
  const color = TIER_COLORS[tier.level] || Colors.primary;

  return (
    <View style={[styles.rewardCard, Shadows.card, { borderStartColor: color, borderStartWidth: 4 }]}>
      <Text style={[styles.rewardTierName, { color }]}>{tier.nameAr}</Text>
      <View style={styles.benefitsList}>
        {tier.cashbackPercent > 0 && (
          <BenefitRow text={`كاشباك ${tier.cashbackPercent}%`} />
        )}
        {tier.bonusPoints > 0 && (
          <BenefitRow text={`${tier.bonusPoints} نقاط إضافية`} />
        )}
        {tier.benefits.map((b, i) => (
          <BenefitRow key={i} text={b} />
        ))}
      </View>
    </View>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Accordion item
// ---------------------------------------------------------------------------

function AccordionItem({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      style={[styles.accordionItem, Shadows.sm]}
      activeOpacity={0.7}
    >
      <View style={styles.accordionHeader}>
        <Text style={styles.accordionTitle}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textSecondary}
        />
      </View>
      {expanded && (
        <Text style={styles.accordionContent}>{content}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Tab content renderers
// ---------------------------------------------------------------------------

function PerformanceTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['ambassadorIndicators'],
    queryFn: () => hostService.getAmbassadorIndicators(),
    retry: false,
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const indicators = data?.data || data || {};

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      {Object.entries(INDICATOR_LABELS).map(([key, label]) => {
        const indicatorData = indicators[key] as IndicatorData | undefined;
        if (!indicatorData) return null;
        return <IndicatorCard key={key} label={label} data={indicatorData} />;
      })}
    </ScrollView>
  );
}

function TiersTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['ambassadorTiers'],
    queryFn: () => hostService.getAmbassadorTiers(),
    retry: false,
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tiers: AmbassadorTier[] = data?.data || data || [];
  // Order: peak, gold, silver, basic
  const order = ['peak', 'gold', 'silver', 'basic'];
  const sorted = [...tiers].sort(
    (a, b) => order.indexOf(a.level) - order.indexOf(b.level),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      {sorted.map((tier) => (
        <TierRewardCard key={tier.level} tier={tier} />
      ))}
    </ScrollView>
  );
}

function FaqTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['ambassadorFaq'],
    queryFn: () => hostService.getAmbassadorFaq(),
    retry: false,
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items: FaqItem[] = data?.data?.items || data?.items || [];

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      {items.map((item, i) => (
        <AccordionItem key={i} title={item.question} content={item.answer} />
      ))}
    </ScrollView>
  );
}

function TermsTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['ambassadorTerms'],
    queryFn: () => hostService.getAmbassadorTerms(),
    retry: false,
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>حدث خطأ في تحميل البيانات</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections: TermsSection[] = data?.data?.sections || data?.sections || data?.data || [];

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      {Array.isArray(sections) &&
        sections.map((section, i) => (
          <AccordionItem
            key={i}
            title={section.title}
            content={section.content}
          />
        ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProgramScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('performance');

  const { data: statusData, isLoading: statusLoading, isError: statusError } = useQuery({
    queryKey: ['ambassadorStatus'],
    queryFn: () => hostService.getAmbassadorStatus(),
    retry: false,
  });

  const currentLevel: string =
    statusData?.data?.tier?.level ||
    statusData?.data?.level ||
    statusData?.tier?.level ||
    statusData?.level ||
    'basic';

  const handleBack = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any);
  }, [router]);

  const renderTab = () => {
    switch (activeTab) {
      case 'performance':
        return <PerformanceTab />;
      case 'tiers':
        return <TiersTab />;
      case 'faq':
        return <FaqTab />;
      case 'terms':
        return <TermsTab />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ProgramHeaderBar onBack={handleBack} />

      {statusLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
      ) : statusError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.errorText}>حدث خطأ في تحميل حالة السفير</Text>
        </View>
      ) : (
        <TierCard level={currentLevel} />
      )}

      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      <View style={styles.tabBody}>{renderTab()}</View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // Tier card
  tierCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tierName: {
    ...Typography.h2,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  tierMotivation: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // Tab bar
  tabBar: {
    marginTop: Spacing.base,
    maxHeight: 48,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },

  // Tab body
  tabBody: {
    flex: 1,
    marginTop: Spacing.sm,
  },
  tabContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },

  // Loader
  loader: {
    marginTop: Spacing.xxl,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  retryText: {
    ...Typography.smallBold,
    color: Colors.white,
  },

  // Indicator card
  indicatorCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  indicatorLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  indicatorValue: {
    ...Typography.h3,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    overflow: 'visible',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  progressBarFill: {
    height: 8,
    borderRadius: Radius.full,
    position: 'absolute',
    top: 0,
    start: 0,
  },
  thresholdMarker: {
    position: 'absolute',
    top: -2,
    alignItems: 'center',
    transform: [{ translateX: -1 }],
  },
  thresholdLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.textTertiary,
  },
  thresholdLabel: {
    ...Typography.tiny,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Reward card
  rewardCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
  },
  rewardTierName: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  benefitsList: {
    gap: Spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  // Accordion
  accordionItem: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginEnd: Spacing.sm,
  },
  accordionContent: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 24,
    textAlign: 'right',
  },
});
