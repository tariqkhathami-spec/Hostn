import React, { useEffect } from 'react';
import { Text, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useLanguage } from '../../i18n';

const BLOG_URL = 'https://hostn.co/blog';

export default function BlogScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supported = await Linking.canOpenURL(BLOG_URL);
        if (!supported) throw new Error('unsupported');
        await Linking.openURL(BLOG_URL);
        // Small delay so the OS has time to switch contexts before we pop the screen.
        setTimeout(() => {
          if (!cancelled) router.back();
        }, 400);
      } catch {
        if (cancelled) return;
        Alert.alert(
          isArabic ? 'تعذر فتح المدونة' : 'Could not open blog',
          language
            ? 'يرجى المحاولة لاحقاً أو التحقق من الاتصال بالإنترنت.'
            : 'Please try again later or check your connection.',
          [{ text: isArabic ? 'حسناً' : 'OK', onPress: () => router.back() }]
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.label}>{isArabic ? 'فتح المدونة...' : 'Opening blog...'}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  label: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
});
