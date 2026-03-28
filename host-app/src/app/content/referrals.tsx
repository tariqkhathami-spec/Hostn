import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import type { ReferralLink } from '../../types';

const STEPS = [
  { number: 1, title: 'شارك رابط الإحالة', icon: 'share-outline' as const },
  { number: 2, title: 'يسجل الضيف عبر الرابط', icon: 'person-add-outline' as const },
  { number: 3, title: 'يحجز الضيف', icon: 'calendar-outline' as const },
  { number: 4, title: 'تحصل على مكافأة', icon: 'gift-outline' as const },
];

export default function ReferralsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['referral-links'],
    queryFn: () => hostService.getReferralLinks(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => hostService.createReferralLink(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-links'] });
    },
  });

  const links: ReferralLink[] = data?.data || [];
  const activeLink = links[0];

  const handleShareLink = useCallback(async () => {
    if (activeLink?.url) {
      try {
        await Share.share({ message: activeLink.url });
      } catch {
        // User cancelled sharing
      }
    }
  }, [activeLink]);

  return (
    <ScreenWrapper>
      <HeaderBar title="رابط الإحالة وأكواد الخصم" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Steps */}
        <Text style={styles.sectionTitle}>كيف تعمل الإحالة؟</Text>
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <View key={step.number} style={styles.stepItem}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>{step.number}</Text>
              </View>
              <Ionicons
                name={step.icon}
                size={24}
                color={Colors.primary}
                style={styles.stepIcon}
              />
              <Text style={styles.stepTitle}>{step.title}</Text>
              {index < STEPS.length - 1 && <View style={styles.stepConnector} />}
            </View>
          ))}
        </View>

        {/* Referral Link Section */}
        <Text style={styles.sectionTitle}>رابط الإحالة الخاص بك</Text>

        {isError ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={{ ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm }}>حدث خطأ في تحميل روابط الإحالة</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : activeLink ? (
          <Card style={styles.linkCard}>
            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1}>
                {activeLink.url}
              </Text>
              <TouchableOpacity
                onPress={handleShareLink}
                style={styles.copyButton}
              >
                <Ionicons name="copy-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeLink.clicks}</Text>
                <Text style={styles.statLabel}>النقرات</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeLink.bookings}</Text>
                <Text style={styles.statLabel}>الحجوزات</Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyLinkCard}>
            <Ionicons
              name="link-outline"
              size={40}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyLinkText}>
              لا يوجد رابط إحالة حالياً
            </Text>
            <Button
              title="إنشاء رابط جديد"
              onPress={() => createMutation.mutate()}
              loading={createMutation.isPending}
              style={styles.createButton}
            />
          </Card>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.base,
    marginTop: Spacing.lg,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    ...Typography.smallBold,
    color: Colors.textWhite,
  },
  stepIcon: {
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stepConnector: {
    position: 'absolute',
    top: 14,
    left: -20,
    width: 40,
    height: 1,
    backgroundColor: Colors.border,
  },
  linkCard: {
    marginBottom: Spacing.base,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  linkText: {
    ...Typography.small,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary50,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  emptyLinkCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyLinkText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  createButton: {
    minWidth: 180,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
});
