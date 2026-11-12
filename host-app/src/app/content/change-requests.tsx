import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, TEXT_START } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import type { ChangeRequest } from '../../types';

const statusConfig: Record<
  ChangeRequest['status'],
  { bg: string; text: string; label: string }
> = {
  approved: { bg: '#dcfce7', text: '#059669', label: 'معتمد' },
  pending: { bg: '#fef3c7', text: '#f59e0b', label: 'قيد المراجعة' },
  rejected: { bg: '#fecaca', text: '#dc2626', label: 'مرفوض' },
};

export default function ChangeRequestsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['change-requests'],
    queryFn: () => hostService.getChangeRequests(),
    retry: false,
  });

  const requests: ChangeRequest[] = data?.data || [];

  const renderRequest = useCallback(
    ({ item }: { item: ChangeRequest }) => {
      const config = statusConfig[item.status] || statusConfig.pending;
      return (
        <Card style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestType}>{item.type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: config.text }]} />
              <Text style={[styles.statusText, { color: config.text }]}>
                {config.label}
              </Text>
            </View>
          </View>
          <View style={styles.requestDetails}>
            <Text style={styles.propertyName}>{item.propertyName}</Text>
            {item.unitName && (
              <Text style={styles.unitName}>{item.unitName}</Text>
            )}
          </View>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.date}>{item.createdAt}</Text>
        </Card>
      );
    },
    [],
  );

  return (
    <ScreenWrapper>
      <HeaderBar title="طلبات التغيير" showBack />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              message="لا توجد طلبات تغيير"
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  requestCard: {
    marginBottom: Spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  requestType: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: Spacing.sm,
  },
  propertyName: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
  },
  unitName: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
    marginTop: 2,
  },
  description: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  date: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: TEXT_START,
  },
});
