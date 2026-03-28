import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';

interface Module {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const MODULES: Module[] = [
  {
    id: 1,
    title: 'السياحة السعودية',
    description:
      'تعرف على قطاع السياحة في المملكة العربية السعودية والفرص المتاحة للمضيفين في سوق الضيافة المتنامي.',
    icon: '\u{1F3D6}',
  },
  {
    id: 2,
    title: 'استخدام المنصة',
    description:
      'تعلم كيفية إدارة عقاراتك وحجوزاتك واستقبال الضيوف من خلال منصة هوستن بكل سهولة.',
    icon: '\u{1F4F1}',
  },
  {
    id: 3,
    title: 'معايير الخدمة',
    description:
      'اكتشف معايير الخدمة المطلوبة لتقديم تجربة ضيافة مميزة تضمن رضا الضيوف وتقييمات عالية.',
    icon: '\u{2B50}',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingCompleted } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [showCompletion, setShowCompletion] = useState(false);
  const [loading, setLoading] = useState(false);

  const allCompleted = completedModules.size === MODULES.length;

  const handleMarkDone = (moduleId: number) => {
    const updated = new Set(completedModules);
    updated.add(moduleId);
    setCompletedModules(updated);

    // Advance to next uncompleted or show completion
    if (updated.size === MODULES.length) {
      setShowCompletion(true);
    } else {
      // Move to next step
      const nextStep = MODULES.findIndex((m) => !updated.has(m.id));
      if (nextStep >= 0) {
        setCurrentStep(nextStep);
      }
    }
  };

  const handleFinishOnboarding = async () => {
    setLoading(true);
    try {
      // Try to notify backend, but don't block on failure
      await authService.completeOnboarding().catch(() => {});
      setOnboardingCompleted();
      router.replace('/(tabs)/dashboard');
    } catch {
      // Even if API fails, complete onboarding locally and proceed
      setOnboardingCompleted();
      router.replace('/(tabs)/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Completion screen
  if (showCompletion) {
    return (
      <View style={styles.completionContainer}>
        <View style={styles.completionGradient}>
          <Text style={styles.completionIcon}>{'\u{1F389}'}</Text>
          <Text style={styles.completionTitle}>{t('onboarding.congratulations')}</Text>
          <Text style={styles.completionSubtitle}>{t('onboarding.completed')}</Text>

          <View style={styles.completionButtonContainer}>
            <Button
              title={t('auth.next')}
              onPress={handleFinishOnboarding}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            />
          </View>
        </View>
      </View>
    );
  }

  const currentModule = MODULES[currentStep];
  const isCurrentDone = completedModules.has(currentModule.id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('onboarding.title')}</Text>
        <Text style={styles.headerSubtitle}>حياك الله في البرنامج التعريفي</Text>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          {MODULES.map((m, i) => (
            <View
              key={m.id}
              style={[
                styles.progressDot,
                completedModules.has(m.id) && styles.progressDotCompleted,
                i === currentStep && !completedModules.has(m.id) && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>
          {completedModules.size} / {MODULES.length}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Step navigation */}
        <View style={styles.stepsRow}>
          {MODULES.map((m, i) => (
            <Pressable
              key={m.id}
              style={[
                styles.stepTab,
                i === currentStep && styles.stepTabActive,
                completedModules.has(m.id) && styles.stepTabCompleted,
              ]}
              onPress={() => setCurrentStep(i)}
            >
              <Text
                style={[
                  styles.stepTabText,
                  i === currentStep && styles.stepTabTextActive,
                  completedModules.has(m.id) && styles.stepTabTextCompleted,
                ]}
              >
                {completedModules.has(m.id) ? '\u2713' : `${i + 1}`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Current module card */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>{currentModule.icon}</Text>
          <Text style={styles.cardTitle}>{currentModule.title}</Text>
          <Text style={styles.cardDescription}>{currentModule.description}</Text>

          {isCurrentDone ? (
            <View style={styles.doneTag}>
              <Text style={styles.doneTagText}>{'\u2713'} تم</Text>
            </View>
          ) : (
            <Button
              title="تم"
              onPress={() => handleMarkDone(currentModule.id)}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
        </View>

        {/* Other modules preview */}
        {MODULES.filter((_, i) => i !== currentStep).map((m) => (
          <Pressable
            key={m.id}
            style={[
              styles.miniCard,
              completedModules.has(m.id) && styles.miniCardCompleted,
            ]}
            onPress={() => setCurrentStep(MODULES.indexOf(m))}
          >
            <Text style={styles.miniCardIcon}>{m.icon}</Text>
            <View style={styles.miniCardContent}>
              <Text style={styles.miniCardTitle}>{m.title}</Text>
              {completedModules.has(m.id) && (
                <Text style={styles.miniCardDone}>{'\u2713'} تم</Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.primary200,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: Colors.gold,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: Colors.success,
  },
  progressText: {
    ...Typography.small,
    color: Colors.primary200,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  stepTab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary50,
  },
  stepTabCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  stepTabText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  stepTabTextActive: {
    color: Colors.primary,
  },
  stepTabTextCompleted: {
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
    alignItems: 'center',
    ...Shadows.card,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },
  doneTag: {
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  doneTagText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  miniCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  miniCardCompleted: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  miniCardIcon: {
    fontSize: 28,
  },
  miniCardContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  miniCardTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  miniCardDone: {
    ...Typography.small,
    color: Colors.success,
    marginTop: Spacing.xs,
  },

  // Completion screen
  completionContainer: {
    flex: 1,
  },
  completionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
  },
  completionIcon: {
    fontSize: 80,
    marginBottom: Spacing.xl,
  },
  completionTitle: {
    ...Typography.h1,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  completionSubtitle: {
    ...Typography.body,
    color: Colors.primary200,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  completionButtonContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
});
