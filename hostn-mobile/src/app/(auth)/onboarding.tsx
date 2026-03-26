import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Discover Saudi Arabia',
    subtitle: 'Find the perfect vacation rental — chalets, villas, apartments, and more across the Kingdom.',
    icon: 'location-outline' as const,
  },
  {
    id: '2',
    title: 'Book with Confidence',
    subtitle: 'Verified properties, secure payments, and 24/7 support for a worry-free stay.',
    icon: 'shield-checkmark-outline' as const,
  },
  {
    id: '3',
    title: 'Your Next Adventure Awaits',
    subtitle: 'From Riyadh to Jeddah, Abha to NEOM — explore unique stays across Saudi Arabia.',
    icon: 'sparkles-outline' as const,
  },
];

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const router = useRouter();
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      pagerRef.current?.setPage(currentPage + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setOnboardingComplete();
    router.replace('/(auth)/phone-entry');
  };

  return (
    <ScreenWrapper style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.iconContainer}>
              <Ionicons name={slide.icon} size={80} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </PagerView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentPage === index && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          title={currentPage === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: Spacing.base,
  },
  skipText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
});
