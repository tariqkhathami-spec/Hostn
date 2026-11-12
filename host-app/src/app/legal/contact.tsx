import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows, DirectionalIcon } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import type { SupportInfo } from '../../types';

const FALLBACK_SUPPORT: SupportInfo = {
  hoursStart: '10 صباحاً',
  hoursEnd: '12 منتصف الليل',
  days: 'طوال أيام الأسبوع',
  phone: '0500407888',
};

export default function ContactScreen() {
  const router = useRouter();

  const { data } = useQuery<{ data: SupportInfo }>({
    queryKey: ['supportInfo'],
    queryFn: hostService.getSupportInfo,
    retry: false,
  });

  // The server only returns the contact details it actually has (no working
  // hours yet), so fill the gaps from the defaults instead of replacing them.
  const support: SupportInfo = { ...FALLBACK_SUPPORT, ...(data?.data ?? {}) };
  const formattedPhone = support.phone || '0500407888';

  return (
    <ScreenWrapper>
      <HeaderBar title={'تواصل معنا'} showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="happy-outline" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{'نخدمك بعيوننا'}</Text>
          <Text style={styles.hoursText}>
            {'ساعات العمل: '}{support.hoursStart}{' - '}{support.hoursEnd}
          </Text>
        </View>

        {/* The host's own account manager, when one is assigned */}
        {(support as any).accountManager?.name ? (
          <TouchableOpacity
            style={managerStyles.card}
            activeOpacity={0.7}
            disabled={!(support as any).accountManager.phone}
            onPress={() => Linking.openURL(`tel:${(support as any).accountManager.phone}`)}
          >
            <View style={managerStyles.icon}>
              <Ionicons name="person-circle-outline" size={34} color={Colors.primary} />
            </View>
            <View style={managerStyles.text}>
              <Text style={managerStyles.label}>{'مدير حسابك'}</Text>
              <Text style={managerStyles.name}>{(support as any).accountManager.name}</Text>
              {(support as any).accountManager.phone ? (
                <Text style={managerStyles.phone}>{`\u2066${(support as any).accountManager.phone}\u2069`}</Text>
              ) : null}
            </View>
            {(support as any).accountManager.phone ? (
              <Ionicons name="call-outline" size={22} color={Colors.primary} />
            ) : null}
          </TouchableOpacity>
        ) : null}

        {/* Action Cards */}
        <View style={styles.cardsContainer}>
          {/* Chat Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.chatCard]}
            onPress={() => router.push('/messages/support' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconCircle, { backgroundColor: Colors.primary100 }]}>
              <Ionicons name="chatbubbles-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{'المحادثات'}</Text>
            <Text style={styles.cardDescription}>{'تحدث معنا مباشرة'}</Text>
            <View style={[styles.cardButton, { backgroundColor: Colors.primary }]}>
              <Text style={styles.cardButtonText}>{'ابدأ محادثة'}</Text>
              <Ionicons name={DirectionalIcon.arrowForward} size={16} color={Colors.textWhite} />
            </View>
          </TouchableOpacity>

          {/* Call Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.callCard]}
            onPress={() => Linking.openURL(`tel:${support.phone || '0500407888'}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="call-outline" size={32} color={Colors.success} />
            </View>
            <Text style={styles.cardTitle}>{'مركز الاتصال'}</Text>
            <Text style={styles.cardPhone}>{formattedPhone}</Text>
            <View style={[styles.cardButton, { backgroundColor: Colors.success }]}>
              <Text style={styles.cardButtonText}>{'اتصل الآن'}</Text>
              <Ionicons name="call" size={16} color={Colors.textWhite} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const managerStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary100,
  },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, alignItems: 'flex-start' },
  label: { ...Typography.caption, color: Colors.textSecondary },
  name: { ...Typography.bodyBold, color: Colors.textPrimary },
  phone: { ...Typography.small, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    ...Typography.h2,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  hoursText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: Spacing.base,
    marginTop: Spacing.lg,
  },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
  },
  chatCard: {
    borderStartWidth: 4,
    borderStartColor: Colors.primary,
  },
  callCard: {
    borderStartWidth: 4,
    borderStartColor: Colors.success,
  },
  cardIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  cardDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  cardPhone: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    letterSpacing: 2,
    textAlign: 'center',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    width: '100%',
  },
  cardButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
