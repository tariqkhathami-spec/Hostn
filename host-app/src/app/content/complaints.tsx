import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import EmptyState from '../../components/ui/EmptyState';

export default function ComplaintsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => hostService.getComplaints(),
    retry: false,
  });

  const complaints: any[] = data?.data || [];

  if (isError) {
    return (
      <ScreenWrapper>
        <HeaderBar title="البلاغات والشكاوى" showBack />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>حدث خطأ في تحميل البلاغات</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="البلاغات والشكاوى" showBack />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item, index) => item?.id ?? String(index)}
          renderItem={({ item }) => (
            <View style={styles.complaintCard}>
              <View style={styles.complaintHeader}>
                <Text style={styles.complaintTitle}>{item.title || item.subject || 'بلاغ'}</Text>
                {item.status && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                )}
              </View>
              {(item.description || item.body) && (
                <Text style={styles.complaintBody} numberOfLines={3}>
                  {item.description || item.body}
                </Text>
              )}
              {(item.createdAt || item.date) && (
                <Text style={styles.complaintDate}>{item.createdAt || item.date}</Text>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              message="لا توجد لديك بلاغات"
              submessage="لم يتم تسجيل أي بلاغات أو شكاوى"
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
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  complaintCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  complaintHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  complaintTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  complaintBody: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  complaintDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
});
