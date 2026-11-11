import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { t } from '../../utils/i18n';
import { authService } from '../../services/auth.service';
import { toWesternDigits } from '../../utils/format';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizePhone = (raw: string): string => {
    let cleaned = toWesternDigits(raw).replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  };

  const isValidPhone = (): boolean => {
    const cleaned = normalizePhone(phone);
    return cleaned.length === 9 && cleaned.startsWith('5');
  };

  const handleSendOtp = async () => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length < 9) {
      Alert.alert(t('common.error'), 'يرجى إدخال رقم جوال صحيح');
      return;
    }

    setLoading(true);
    try {
      await authService.sendOtp(cleaned);
      router.push({ pathname: '/(auth)/otp-verify', params: { phone: cleaned } });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'حدث خطأ أثناء إرسال رمز التحقق';
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Purple header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Hostn</Text>
        <Text style={styles.tagline}>{t('auth.login')}</Text>
      </View>

      {/* Form area */}
      <View style={styles.formContainer}>
        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.phone')}</Text>
          <View style={styles.phoneRow}>
            <View style={styles.inputFlex}>
              <TextInput
                placeholder="5XXXXXXXX"
                value={phone}
                onChangeText={(text) => setPhone(toWesternDigits(text))}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.phoneInput}
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            </View>
            <View style={styles.prefixContainer}>
              <Text style={styles.prefixText}>966+</Text>
            </View>
          </View>

          <Button
            title={t('auth.login')}
            onPress={handleSendOtp}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!isValidPhone()}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    color: Colors.primary200,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  form: {
    gap: Spacing.base,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    minHeight: 52,
    justifyContent: 'center',
  },
  phoneInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    textAlign: 'right',
    fontSize: 18,
  },
  prefixContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
