import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useLanguage } from '../../i18n';
import { useRequireAuth } from '../../hooks/useRequireAuth';

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
}

/** Shown in place of account-only content while the visitor is signed out. */
export default function LoginPrompt({ icon, message }: Props) {
  const { t } = useLanguage();
  const requireAuth = useRequireAuth();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={Colors.textTertiary} />
      <Text style={styles.title}>{t('auth.loginRequiredTitle')}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={() => requireAuth()}>
        <Text style={styles.buttonText}>{t('auth.login')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  title: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center' },
  message: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  buttonText: { ...Typography.bodyBold, color: Colors.white },
});
