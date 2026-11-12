import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { formatRelativeDate } from '../../utils/format';
import { hostService } from '../../services/host.service';
import type { Conversation } from '../../types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';

const FILTER_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'confirmed', label: 'حجوزات مؤكدة' },
  { key: 'check_in_today', label: 'دخول اليوم' },
  { key: 'check_out_today', label: 'خروج اليوم' },
  { key: 'in_hosting', label: 'في الاستضافة الآن' },
  { key: 'inquiries', label: 'إستفسارات' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

export default function MessagesScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

  const queryParams = useMemo(
    () => ({
      status: activeFilter === 'all' ? undefined : activeFilter,
      search: debouncedSearch || undefined,
    }),
    [activeFilter, debouncedSearch],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['conversations', queryParams],
    queryFn: () => hostService.getConversations(queryParams),
    retry: false,
  });

  const conversations: Conversation[] = data?.data ?? [];

  const renderFilterTab = useCallback(
    (tab: (typeof FILTER_TABS)[number]) => {
      const isActive = activeFilter === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          style={[styles.filterTab, isActive && styles.filterTabActive]}
          onPress={() => setActiveFilter(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeFilter],
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => router.push(`/messages/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.unitName} numberOfLines={1}>
              {item.unitName}
            </Text>
            <Text style={styles.dateText}>{formatRelativeDate(item.lastMessageDate)}</Text>
          </View>
          <Text style={styles.guestName} numberOfLines={1}>
            {item.guestName}
          </Text>
          <View style={styles.lastMessageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <>
        {/* Support card */}
        <TouchableOpacity
          style={styles.supportCard}
          onPress={() => router.push('/messages/support')}
          activeOpacity={0.7}
        >
          <View style={styles.supportAccent} />
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>هوستن</Text>
            <Text style={styles.supportSubtitle}>مدير الحساب</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      </>
    ),
    [router],
  );

  return (
    <ScreenWrapper>
      <HeaderBar title={t('messages.title')} />

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {FILTER_TABS.map(renderFilterTab)}
      </ScrollView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('messages.search')}
            placeholderTextColor={Colors.textTertiary}
            value={searchText}
            onChangeText={handleSearchChange}
            textAlign="right"
          />
        </View>
      </View>

      {/* Conversations list */}
      {isError ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
          <Text style={{ ...Typography.body, color: Colors.textTertiary, marginTop: Spacing.md }}>حدث خطأ في تحميل البيانات</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              message={t('messages.noConversations')}
            />
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textWhite,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.small,
    color: Colors.textPrimary,
    writingDirection: 'rtl',
    padding: 0,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  supportAccent: {
    width: 4,
    height: 40,
    backgroundColor: Colors.warning,
    borderRadius: Radius.xs,
    marginLeft: Spacing.md,
  },
  supportContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  supportTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
  },
  supportSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginTop: 2,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  guestName: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginBottom: 4,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    ...Typography.small,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
