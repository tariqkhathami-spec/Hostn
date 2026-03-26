import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { authService } from '../../services/auth.service';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

export default function PhoneEntryScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isValid = /^5\d{8}$/.test(phone);

  const handleSendOTP = async () => {
    if (!isValid) {
      setError('Enter a valid 9-digit Saudi phone number starting with 5');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await authService.sendOTP(phone);
      router.push({ pathname: '/(auth)/otp-verify', params: { phone } });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>Hostn</Text>
          </View>

          <Text style={styles.heading}>Welcome!</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to get started
          </Text>

          <Input
            label="Phone Number"
            prefix="+966"
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/\D/g, '').slice(0, 9));
              setError('');
            }}
            placeholder="5XXXXXXXX"
            keyboardType="number-pad"
            maxLength={9}
            error={error}
          />
        </View>

        <View style={styles.bottom}>
          <Button
            title="Send OTP"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
  },
  heading: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
});
