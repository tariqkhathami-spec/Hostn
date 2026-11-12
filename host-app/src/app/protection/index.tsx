import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { hostService } from '../../services/host.service';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

const coverageItems = [
  { icon: 'shield-checkmark-outline' as const, title: 'أضرار وسرقة', description: 'تغطية الأضرار المادية وحالات السرقة' },
  { icon: 'brush-outline' as const, title: 'تنظيف غير اعتيادي', description: 'تكاليف التنظيف الإضافية بعد الإقامة' },
  { icon: 'flame-outline' as const, title: 'حريق', description: 'تغطية أضرار الحريق إن وجدت' },
];

const processSteps = [
  { number: 1, title: 'توثيق الأدلة', description: 'التقط صوراً واضحة للأضرار' },
  { number: 2, title: 'تقديم المطالبة', description: 'أرسل المطالبة مع الأدلة' },
  { number: 3, title: 'مراجعة الطلب', description: 'يتم مراجعة طلبك من الفريق' },
  { number: 4, title: 'إيداع التعويض', description: 'يتم إيداع المبلغ في حسابك' },
];

export default function ProtectionScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['protectionProgram'],
    queryFn: hostService.getProtectionProgram,
    retry: false,
  });

  // Only numbers the API returns are shown. The programme limits come back
  // as null until they are defined on the server, and are then left out.
  const program: any = (data as any)?.data ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const tier = (value: number | null, unit: string, label: string) =>
    value === null ? null : { amount: value.toLocaleString('en-US'), unit, label };
  const usageTiers = [
    tier(num(program.claimsThisYear), 'مطالبة', 'مطالباتك هذا العام'),
    tier(num(program.openClaims), 'مطالبة', 'قيد المراجعة'),
    tier(num(program.totalCompensated), 'ريال', 'إجمالي التعويضات'),
  ].filter((t): t is { amount: string; unit: string; label: string } => t !== null);
  const limitTiers = [
    tier(num(program.maxPerClaim), 'ريال', 'الحد الأقصى لكل مطالبة'),
    tier(num(program.maxCompensationPerYear), 'ريال', 'الحد الأقصى سنوياً'),
    tier(num(program.maxClaimsPerYear), 'مطالبات', 'عدد المطالبات سنوياً'),
  ].filter((t): t is { amount: string; unit: string; label: string } => t !== null);

  const handleClaims = () => {
    Alert.alert(
      'مركز المطالبات',
      'هذه الميزة قيد التطوير. للإبلاغ عن مطالبة الآن، يرجى التواصل مع الدعم.',
      [
        { text: 'إغلاق', style: 'cancel' },
        { text: 'تواصل مع الدعم', onPress: () => router.push('/messages/support' as any) },
      ]
    );
  };

  const handleTerms = () => {
    router.push('/legal/terms' as any);
  };

  return (
    <ScreenWrapper>
      <HeaderBar title="برنامج حماية المضيف" showBack />
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          message="حدث خطأ في تحميل البيانات"
          submessage="حاول مرة أخرى لاحقاً"
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Program Description */}
          <Card style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
              <Text style={styles.descriptionTitle}>حماية شاملة لممتلكاتك</Text>
            </View>
            <Text style={styles.descriptionText}>
              برنامج حماية المضيف يوفر لك تغطية مالية ضد الأضرار التي قد تحدث أثناء
              إقامة الضيوف في وحدتك. يشمل البرنامج تعويضات عن الأضرار المادية والسرقة
              وتكاليف التنظيف غير الاعتيادية.
            </Text>
          </Card>

          {/* Coverage Section */}
          <Text style={styles.sectionTitle}>التغطيات المتاحة</Text>
          {coverageItems.map((item, index) => (
            <Card key={index} style={styles.coverageCard}>
              <View style={styles.coverageRow}>
                <View style={styles.coverageIconWrap}>
                  <Ionicons name={item.icon} size={24} color={Colors.primary} />
                </View>
                <View style={styles.coverageInfo}>
                  <Text style={styles.coverageTitle}>{item.title}</Text>
                  <Text style={styles.coverageDesc}>{item.description}</Text>
                </View>
              </View>
            </Card>
          ))}

          {/* Claims Process */}
          <Text style={styles.sectionTitle}>خطوات تقديم المطالبة</Text>
          <Card style={styles.processCard}>
            {processSteps.map((step, index) => (
              <View key={step.number} style={styles.stepRow}>
                <View style={styles.stepIndicator}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>{step.number}</Text>
                  </View>
                  {index < processSteps.length - 1 && (
                    <View style={styles.stepLine} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* This host's real claim figures for the year */}
          {usageTiers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>مطالباتك هذا العام</Text>
              <View style={styles.tiersRow}>
                {usageTiers.map((t) => (
                  <Card key={t.label} style={styles.tierCard}>
                    <Text style={styles.tierAmount}>{t.amount}</Text>
                    <Text style={styles.tierUnit}>{t.unit}</Text>
                    <Text style={styles.tierLabel}>{t.label}</Text>
                  </Card>
                ))}
              </View>
            </>
          )}

          {/* Compensation limits — only when the API defines them */}
          {limitTiers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>حدود التعويض</Text>
              <View style={styles.tiersRow}>
                {limitTiers.map((t) => (
                  <Card key={t.label} style={styles.tierCard}>
                    <Text style={styles.tierAmount}>{t.amount}</Text>
                    <Text style={styles.tierUnit}>{t.unit}</Text>
                    <Text style={styles.tierLabel}>{t.label}</Text>
                  </Card>
                ))}
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title="مركز المطالبات"
              onPress={handleClaims}
              variant="primary"
              size="lg"
              fullWidth
            />
            <Button
              title="الشروط والأحكام"
              onPress={handleTerms}
              variant="outline"
              size="lg"
              fullWidth
            />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionCard: {
    marginBottom: Spacing.lg,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  descriptionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    flex: 1,
  },
  descriptionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    lineHeight: 24,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  coverageCard: {
    marginBottom: Spacing.md,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coverageIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverageInfo: {
    flex: 1,
  },
  coverageTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
  },
  coverageDesc: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginTop: 2,
  },
  processCard: {
    marginBottom: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    ...Typography.smallBold,
    color: Colors.white,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.primary200,
    marginVertical: Spacing.xs,
    minHeight: 24,
  },
  stepContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  stepTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
  },
  stepDesc: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
    marginTop: 2,
  },
  tiersRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  tierCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  tierAmount: {
    ...Typography.h2,
    color: Colors.primary,
  },
  tierUnit: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tierLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
