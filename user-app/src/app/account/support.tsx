import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supportService } from '../../services/support.service';
import { formatDate } from '../../utils/format';
import { Colors, Typography, Spacing, Radius, Shadows, BACK_ICON } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import type { SupportTicket } from '../../types';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved';

const STATUS_COLORS: Record<SupportTicket['status'], string> = {
  open: Colors.info,
  in_progress: Colors.warning,
  resolved: Colors.success,
  closed: Colors.textTertiary,
};

const PRIORITY_COLORS: Record<SupportTicket['priority'], string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.error,
};

export default function SupportScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('support.all') },
    { key: 'open', label: t('support.open') },
    { key: 'in_progress', label: t('support.inProgress') },
    { key: 'resolved', label: t('support.resolved') },
  ];

  const STATUS_LABELS: Record<SupportTicket['status'], string> = {
    open: t('support.open'),
    in_progress: t('support.inProgress'),
    resolved: t('support.resolved'),
    closed: t('support.resolved'),
  };

  const CATEGORY_LABELS: Record<SupportTicket['category'], string> = {
    payment: t('support.cat.payment'),
    booking: t('support.cat.booking'),
    complaint: t('support.cat.complaint'),
    technical: t('support.cat.technical'),
    account: t('support.cat.account'),
    other: t('support.cat.other'),
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['supportTickets'],
    queryFn: () => supportService.getTickets(),
    // Replies and status changes come from the support team, so keep the
    // list fresh while it is open and whenever the guest returns to it.
    refetchInterval: 20000,
  });
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const tickets = data ?? [];
  const filtered =
    activeFilter === 'all'
      ? tickets
      : tickets.filter((t) => t.status === activeFilter);

  const renderTicket = ({ item }: { item: SupportTicket }) => (
    <Pressable
      style={styles.ticketCard}
      onPress={() => router.push(`/account/ticket/${item._id}` as any)}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[item.status] + '18' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: STATUS_COLORS[item.status] },
            ]}
          >
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      {/* What the ticket is about: the latest message, and who wrote it */}
      {(() => {
        const last = item.messages?.[item.messages.length - 1];
        if (!last?.text) return null;
        const fromSupport = last.sender === 'admin';
        return (
          <View style={styles.previewRow}>
            {fromSupport && (
              <View style={styles.replyBadge}>
                <Text style={styles.replyBadgeText}>{language === 'ar' ? 'رد من الدعم' : 'Support replied'}</Text>
              </View>
            )}
            <Text style={styles.previewText} numberOfLines={2}>
              {fromSupport ? '' : language === 'ar' ? 'أنت: ' : 'You: '}
              {last.text}
            </Text>
          </View>
        );
      })()}

      <View style={styles.ticketMeta}>
        <Text style={styles.ticketNumber}>#{String(item._id).slice(-6).toUpperCase()}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{CATEGORY_LABELS[item.category]}</Text>
        </View>
        <View
          style={[
            styles.priorityDot,
            { backgroundColor: PRIORITY_COLORS[item.priority] },
          ]}
        />
        <Text style={styles.priorityText}>
          {t(`support.pri.${item.priority}` as any)}
        </Text>
        <Text style={styles.ticketDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={BACK_ICON} size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('support.title')}</Text>
        <Pressable
          onPress={() => router.push('/account/new-ticket' as any)}
          hitSlop={12}
        >
          <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeFilter === tab.key && styles.tabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeFilter === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={Colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>{t('support.noTickets')}</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'all'
              ? t('support.noTicketsSub')
              : `${t('support.noTickets')}`}
          </Text>
          <Pressable
            style={styles.newTicketButton}
            onPress={() => router.push('/account/new-ticket' as any)}
          >
            <Text style={styles.newTicketButtonText}>{t('support.newTicket')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  loader: { flex: 1, justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  ticketSubject: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  previewRow: {
    marginBottom: Spacing.sm,
    gap: 6,
  },
  previewText: {
    ...Typography.small,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  replyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  replyBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  ticketNumber: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  ticketDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginLeft: 'auto',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  newTicketButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  newTicketButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
});
