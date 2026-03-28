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
import { t } from '../../utils/i18n';
import { hostService } from '../../services/host.service';
import type { Booking, Transfer, Review } from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showNps, setShowNps] = React.useState(false);

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
                {'\u062A\u0642\u0631\u064A\u0631 \u0623\u062F\u0627\u0621 \u0623\u0633\u0628\u0648\u0639'} {dateStr}
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
            <Text style={styles.sectionLink}>{'\u0627\u0644\u0643\u0644'}</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>{'\u0633\u0641\u064A\u0631 \u0647\u0648\u0633\u062A\u0646'}</Text>
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
              {ambassadorStatus?.nameAr ?? '\u0633\u0641\u064A\u0631 \u0627\u0633\u0627\u0633\u064A'}
            </Text>
            <Text style={styles.ambassadorDesc}>
              {ambassadorStatus?.bonusPoints != null
                ? `${ambassadorStatus.bonusPoints} \u0646\u0642\u0637\u0629`
                : '\u062A\u0627\u0628\u0639 \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0623\u062F\u0627\u0621 \u0648\u0627\u0631\u0642\u0649 \u0625\u0644\u0649 \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0623\u0639\u0644\u0649'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Points Section */}
        <View style={styles.sectionRow}>
          <View />
          <Text style={styles.sectionTitle}>{'\u0646\u0642\u0627\u0637 \u0648\u062D\u062F\u062A\u0643'}</Text>
        </View>
        <Card style={styles.pointsCard}>
          <View style={styles.pointsContent}>
            <View style={styles.pointsTextContainer}>
              <Text style={styles.pointsMainText}>{'\u062A\u062A\u062D\u062F\u062B \u064A\u0648\u0645\u064A\u0627\u064B'}</Text>
              <Text style={styles.pointsNote}>
                {'\u062A\u0636\u0627\u0641 \u0627\u0644\u0646\u0642\u0627\u0637 \u062E\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629 \u0645\u0646 \u062A\u0627\u0631\u064A\u062E \u0639\u0631\u0636 \u0627\u0644\u0639\u0642\u0627\u0631'}
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
          <EmptyState message={'\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u062C\u0648\u0632\u0627\u062A \u062D\u062F\u064A\u062B\u0629'} icon="calendar-outline" />
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
          <EmptyState message={'\u0644\u0627 \u064A\u0648\u062C\u062F \u0644\u062F\u064A\u0643 \u0636\u064A\u0648\u0641 \u0642\u0627\u062F\u0645\u064A\u0646'} icon="heart-outline" />
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
          <EmptyState message={'\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0648\u0627\u0644\u0627\u062A \u062D\u062F\u064A\u062B\u0629'} icon="swap-horizontal-outline" />
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
          <EmptyState message={'\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u062D\u062F\u064A\u062B\u0629'} icon="star-outline" />
        )}

        {/* Recent Reports */}
        <SectionHeader title={t('dashboard.recentReports')} />
        <EmptyState message={'\u0644\u0627 \u062A\u0648\u062C\u062F \u0644\u062F\u064A\u0643 \u0628\u0644\u0627\u063A\u0627\u062A'} icon="flag-outline" />

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
