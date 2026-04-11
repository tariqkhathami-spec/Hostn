import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import BookingCard from '../../components/dashboard/BookingCard';
import TransferCard from '../../components/dashboard/TransferCard';
import ReviewCard from '../../components/dashboard/ReviewCard';
import SectionHeader from '../../components/dashboard/SectionHeader';
import NpsSurveyModal from '../../components/notifications/NpsSurveyModal';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t, getLocale } from '../../utils/i18n';
import { hostService } from '../../services/host.service';
import type { Booking, Transfer, Review } from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showNps, setShowNps] = React.useState(false);
  const locale = getLocale();
  const l = (obj: { en: string; ar: string }) => (locale === 'ar' ? obj.ar : obj.en);

  // --- NPS check on mount ---
  const npsQuery = useQuery({
    queryKey: ['nps', 'shouldShow'],
    queryFn: () => hostService.shouldShowNps(),
    retry: false,
  });

  React.useEffect(() => {
    if (npsQuery.data?.data?.shouldShow) {
      setShowNps(true);
    }
  }, [npsQuery.data]);

  // --- Stats overview ---
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => hostService.getStats(),
    retry: false,
  });
  const stats = statsQuery.data?.data;

  // --- Data queries (retry: false to avoid looping on guest role) ---
  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: () => hostService.getBookings({ page: 1 }),
    retry: false,
  });

  const upcomingQuery = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => hostService.getUpcomingGuests(),
    retry: false,
  });

  const transfersQuery = useQuery({
    queryKey: ['transfers', 'recent'],
    queryFn: () => hostService.getTransfers({ page: 1 }),
    retry: false,
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'recent'],
    queryFn: () => hostService.getReviews({ page: 1 }),
    retry: false,
  });

  const ambassadorQuery = useQuery({
    queryKey: ['ambassador', 'status'],
    queryFn: () => hostService.getAmbassadorStatus(),
    retry: false,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => hostService.getUnreadCount(),
    retry: false,
  });

  // --- Pull to refresh ---
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  // --- Derived data ---
  const recentBookings: Booking[] = (bookingsQuery.data?.data ?? []).slice(0, 5);
  const upcomingGuests: Booking[] = upcomingQuery.data?.data ?? [];
  const recentTransfers: Transfer[] = (transfersQuery.data?.data ?? []).slice(0, 5);
  const recentReviews: Review[] = (reviewsQuery.data?.data ?? []).slice(0, 3);
  const ambassadorStatus = ambassadorQuery.data?.data;
  const unreadCount: number = unreadQuery.data?.data?.count ?? 0;

  const isLoading =
    bookingsQuery.isLoading &&
    upcomingQuery.isLoading &&
    transfersQuery.isLoading &&
    reviewsQuery.isLoading;

  // Don't block rendering on errors — show dashboard with empty data
  const _hasError =
    bookingsQuery.isError &&
    upcomingQuery.isError &&
    transfersQuery.isError &&
    reviewsQuery.isError;

  // --- Quick access cards config ---
  const quickCards = [
    {
      icon: 'card-outline' as const,
      title: t('dashboard.financial'),
      accent: Colors.success,
      route: '/financial',
    },
    {
      icon: 'pricetag-outline' as const,
      title: t('dashboard.pricing'),
      accent: Colors.gold500,
      route: '/pricing',
    },
    {
      icon: 'document-text-outline' as const,
      title: t('dashboard.accountSummary'),
      accent: Colors.primary,
      route: '/invoices/summary',
    },
  ];

  // --- Current date for weekly report ---
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <ScreenWrapper backgroundColor={Colors.primary}>
      {/* Purple Header - centered title, bell left, headphones right */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/notifications')}
          style={styles.headerIconWrapper}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.textWhite} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>

        <TouchableOpacity onPress={() => router.push('/messages/support')}>
          <Ionicons name="headset-outline" size={24} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Loading indicator */}
        {isLoading && (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginVertical: Spacing.xl }}
          />
        )}

        {/* Stats Overview */}
        {stats && (
          <View style={styles.statsGrid}>
            {[
              {
                icon: 'business-outline' as const,
                value: stats.totalProperties ?? 0,
                label: l({ en: 'Total Properties', ar: 'إجمالي العقارات' }),
                color: Colors.primary,
              },
              {
                icon: 'calendar-outline' as const,
                value: stats.activeBookings ?? 0,
                label: l({ en: 'Active Bookings', ar: 'الحجوزات النشطة' }),
                color: Colors.success,
              },
              {
                icon: 'wallet-outline' as const,
                value: `${(stats.totalEarnings ?? 0).toLocaleString('en-US')} ${l({ en: 'SAR', ar: 'ريال' })}`,
                label: l({ en: 'Total Earnings', ar: 'إجمالي الأرباح' }),
                color: Colors.gold500,
              },
              {
                icon: 'star-outline' as const,
                value: stats.averageRating ?? '-',
                label: l({ en: 'Average Rating', ar: 'متوسط التقييم' }),
                color: Colors.warning,
              },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon} size={22} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weekly Report Banner */}
        <TouchableOpacity
          style={styles.weeklyBanner}
          onPress={() => router.push('/program' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.weeklyBannerContent}>
            {/* Info icon on far left */}
            <TouchableOpacity
              onPress={() => router.push('/program' as any)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>

            {/* Text in the middle-right */}
            <View style={styles.weeklyBannerTextContainer}>
              <Text style={styles.weeklyBannerTitle}>{t('dashboard.reports')}</Text>
              <Text style={styles.weeklyBannerSubtitle}>
                {l({ en: 'Weekly performance report', ar: 'تقرير أداء أسبوع' })} {dateStr}
              </Text>
            </View>

            {/* Chart icon on far right */}
            <View style={styles.weeklyBannerIcon}>
              <Ionicons name="bar-chart-outline" size={28} color={Colors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Ambassador Section */}
        <View style={styles.sectionRow}>
          <TouchableOpacity onPress={() => router.push('/program' as any)}>
            <Text style={styles.sectionLink}>{l({ en: 'View All', ar: 'الكل' })}</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>{l({ en: 'Hostn Ambassador', ar: 'سفير هوستن' })}</Text>
        </View>

        <TouchableOpacity
          style={styles.ambassadorCard}
          onPress={() => router.push('/program' as any)}
          activeOpacity={0.85}
        >
          {/* Gradient simulation with overlay */}
          <View style={styles.ambassadorGradientOverlay} />
          <View style={styles.ambassadorInner}>
            <View style={styles.ambassadorHeaderRow}>
              <Ionicons
                name="ribbon-outline"
                size={28}
                color={Colors.textWhite}
              />
            </View>
            <Text style={styles.ambassadorTitle}>
              {ambassadorStatus?.nameAr ?? 'سفير اساسي'}
            </Text>
            <Text style={styles.ambassadorDesc}>
              {ambassadorStatus?.bonusPoints != null
                ? `${ambassadorStatus.bonusPoints} نقطة`
                : 'تابع مؤشرات الأداء وارقى إلى مستويات أعلى'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Points Section */}
        <View style={styles.sectionRow}>
          <View />
          <Text style={styles.sectionTitle}>{l({ en: 'Your Unit Points', ar: 'نقاط وحدتك' })}</Text>
        </View>
        <Card style={styles.pointsCard}>
          <View style={styles.pointsContent}>
            <View style={styles.pointsTextContainer}>
              <Text style={styles.pointsMainText}>{l({ en: 'Updated daily', ar: 'تتحدث يومياً' })}</Text>
              <Text style={styles.pointsNote}>
                {l({ en: 'Points are added within 24 hours of listing the property', ar: 'تضاف النقاط خلال 24 ساعة من تاريخ عرض العقار' })}
              </Text>
            </View>
            <View style={styles.pointsIconCircle}>
              <Ionicons name="trending-up-outline" size={22} color={Colors.primary} />
            </View>
          </View>
        </Card>

        {/* Quick Access Cards - Fixed Row */}
        <View style={styles.quickCardsRow}>
          {quickCards.map((card) => (
            <TouchableOpacity
              key={card.title}
              style={styles.quickCard}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: card.accent + '20' }]}>
                <Ionicons name={card.icon} size={24} color={card.accent} />
              </View>
              <Text style={styles.quickCardTitle}>{card.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Bookings */}
        <SectionHeader
          title={t('dashboard.recentBookings')}
          onViewAll={() => router.push('/(tabs)/reservations' as any)}
        />
        {bookingsQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.base }} />
        ) : recentBookings.length > 0 ? (
          recentBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/reservations/${booking.id}` as any)}
            />
          ))
        ) : (
          <EmptyState message={l({ en: 'No recent bookings', ar: 'لا توجد حجوزات حديثة' })} icon="calendar-outline" />
        )}

        {/* Upcoming Guests */}
        <SectionHeader
          title={t('dashboard.upcomingGuests')}
          onViewAll={() => router.push('/(tabs)/reservations' as any)}
        />
        {upcomingQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.base }} />
        ) : upcomingGuests.length > 0 ? (
          upcomingGuests.slice(0, 5).map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/reservations/${booking.id}` as any)}
            />
          ))
        ) : (
          <EmptyState message={l({ en: 'No upcoming guests', ar: 'لا يوجد لديك ضيوف قادمين' })} icon="heart-outline" />
        )}

        {/* Recent Transfers */}
        <SectionHeader
          title={t('dashboard.recentTransfers')}
          onViewAll={() => router.push('/financial' as any)}
        />
        {transfersQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.base }} />
        ) : recentTransfers.length > 0 ? (
          recentTransfers.map((transfer) => (
            <TransferCard key={transfer.id} transfer={transfer} />
          ))
        ) : (
          <EmptyState message={l({ en: 'No recent transfers', ar: 'لا توجد حوالات حديثة' })} icon="swap-horizontal-outline" />
        )}

        {/* Recent Reviews */}
        <SectionHeader
          title={t('dashboard.recentReviews')}
          onViewAll={() => router.push('/reviews' as any)}
        />
        {reviewsQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.base }} />
        ) : recentReviews.length > 0 ? (
          recentReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        ) : (
          <EmptyState message={l({ en: 'No recent reviews', ar: 'لا توجد تقييمات حديثة' })} icon="star-outline" />
        )}

        {/* Recent Reports */}
        <SectionHeader title={t('dashboard.recentReports')} />
        <EmptyState message={l({ en: 'No reports', ar: 'لا توجد لديك بلاغات' })} icon="flag-outline" />

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <NpsSurveyModal visible={showNps} onDismiss={() => setShowNps(false)} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  /* ---- Header ---- */
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconWrapper: {
    position: 'relative',
    padding: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  badgeText: {
    ...Typography.tiny,
    color: Colors.textWhite,
    fontWeight: '700',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textWhite,
    textAlign: 'center',
    flex: 1,
  },

  /* ---- Content area ---- */
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.base,
    marginTop: -Spacing.md,
  },

  /* ---- Stats Grid ---- */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    width: '48%' as any,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.card,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  /* ---- Weekly Report Banner ---- */
  weeklyBanner: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  weeklyBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyBannerTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: Spacing.sm,
  },
  weeklyBannerTitle: {
    ...Typography.subtitle,
    color: Colors.primary,
    marginBottom: 2,
  },
  weeklyBannerSubtitle: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  weeklyBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---- Section row (title + link) ---- */
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  sectionLink: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },

  /* ---- Ambassador Card ---- */
  ambassadorCard: {
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    position: 'relative',
  },
  ambassadorGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary800,
    opacity: 0.3,
    borderRadius: Radius.lg,
  },
  ambassadorInner: {
    padding: Spacing.lg,
    alignItems: 'flex-end',
  },
  ambassadorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
    width: '100%',
  },
  ambassadorTitle: {
    ...Typography.h3,
    color: Colors.textWhite,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'right',
  },
  ambassadorDesc: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },

  /* ---- Points Section ---- */
  pointsCard: {
    marginBottom: Spacing.lg,
  },
  pointsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pointsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  pointsMainText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  pointsNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },

  /* ---- Quick Access Cards - Fixed Row ---- */
  quickCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    ...Shadows.card,
  },
  quickCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickCardTitle: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },

  /* ---- Error state ---- */
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  retryText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
