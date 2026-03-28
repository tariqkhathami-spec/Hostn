import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../../components/ui/Button';
import { Colors, Spacing } from '../../constants/theme';
import { t } from '../../utils/i18n';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Centered content */}
      <View style={styles.centerContent}>
        {/* Logo text */}
        <Text style={styles.logoText}>
          <Text style={styles.logoMain}>Host</Text>
          <Text style={styles.logoAccent}>n</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{t('auth.welcome')}</Text>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title={t('auth.register')}
            onPress={() => {
              Alert.alert('التسجيل', 'سيتم إطلاق التسجيل قريباً');
            }}
            variant="primary"
            size="lg"
            fullWidth
          />

          <Button
            title={t('auth.login')}
            onPress={() => router.push('/(auth)/phone-login')}
            variant="outline"
            size="lg"
            fullWidth
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {'تبي تحجز شقة, شاليه, وغيرها من بيوت العطلات ؟'}
        </Text>
        <Text style={styles.footerLink}>
          {'حمل من هنا تطبيق الضيوف'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: Spacing.sm,
  },
  logoMain: {
    color: '#2d3748',
    fontSize: 48,
    fontWeight: '300',
  },
  logoAccent: {
    color: '#f59e0b',
    fontSize: 48,
    fontWeight: '300',
  },
  subtitle: {
    fontSize: 16,
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.base,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
