import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import type { Article } from '../../types';

const CATEGORIES = [
  { key: '', label: 'الكل' },
  { key: 'about_chalets', label: 'عن الاستراحة' },
  { key: 'new_in_saudi', label: 'جديد في السعودية' },
  { key: 'hosting_tips', label: 'نصائح الاستضافة' },
  { key: 'regulations', label: 'الأنظمة والقوانين' },
];

export default function ArticlesScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['articles', category, debouncedSearch],
    queryFn: () =>
      hostService.getArticles({
        category: category || undefined,
        search: debouncedSearch || undefined,
      }),
    retry: false,
  });

  const articles: Article[] = data?.data || [];

  const renderArticle = useCallback(
    ({ item }: { item: Article }) => (
      <Card
        style={styles.articleCard}
        onPress={() => Linking.openURL(item.url)}
      >
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.articleExcerpt} numberOfLines={2}>
          {item.excerpt}
        </Text>
        <View style={styles.articleFooter}>
          <Text style={styles.articleDate}>{item.publishedDate}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(item.url)}
            style={styles.readMoreButton}
          >
            <Text style={styles.readMoreText}>اقرأ المزيد</Text>
            <Ionicons name="chevron-back" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>
    ),
    [],
  );

  return (
    <ScreenWrapper>
      <HeaderBar title="المقالات" showBack />
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث في المقالات"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={handleSearchChange}
            textAlign="right"
          />
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryPill,
                category === cat.key && styles.categoryPillActive,
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isError ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={{ ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm }}>حدث خطأ في تحميل المقالات</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              message="لا توجد مقالات"
              submessage="لم يتم العثور على مقالات مطابقة للبحث"
            />
          }
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
  },
  searchIcon: {
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  categoriesContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: Colors.textWhite,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  articleCard: {
    marginBottom: Spacing.sm,
  },
  articleTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  articleExcerpt: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readMoreText: {
    ...Typography.smallBold,
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
