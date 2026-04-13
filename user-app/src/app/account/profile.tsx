import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatPhone } from '../../utils/format';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useLanguage();

  // Map `name` field to firstName/lastName when they're not set
  const derivedFirstName = user?.firstName || (user?.name ? user.name.split(' ')[0] : '');
  const derivedLastName = user?.lastName || (user?.name ? user.name.split(' ').slice(1).join(' ') : '');

  const [firstName, setFirstName] = useState(derivedFirstName);
  const [lastName, setLastName] = useState(derivedLastName);
  const [email, setEmail] = useState(user?.email ?? '');

  const updateProfile = useMutation({
    mutationFn: () => authService.updateProfile({ firstName, lastName, email }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      Alert.alert(t('common.success'), t('common.success'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.somethingWrong'));
    },
  });

  const upgradeToHost = useMutation({
    mutationFn: () => authService.upgradeToHost(),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      Alert.alert(t('common.success'), t('common.success'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.somethingWrong'));
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => authService.deleteAccount(),
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)/phone');
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('common.somethingWrong'));
    },
  });

  const handleBecomeHost = () => {
    Alert.alert(
      t('profile.becomeHost'),
      t('profile.becomeHostMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.upgrade'), onPress: () => upgradeToHost.mutate() },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccount'),
              t('profile.deleteConfirmFinal'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('profile.deletePermanently'), style: 'destructive', onPress: () => deleteAccount.mutate() },
              ]
            );
          },
        },
      ]
    );
  };

  const renderField = (label: string, value: string, onChangeText: (t: string) => void, opts?: { keyboard?: 'email-address' }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={opts?.keyboard}
        autoCapitalize={opts?.keyboard === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderField(t('profile.firstName'), firstName, setFirstName)}
        {renderField(t('profile.lastName'), lastName, setLastName)}
        {renderField(t('profile.email'), email, setEmail, { keyboard: 'email-address' })}

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.phone')}</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>
              {user?.phone ? formatPhone(user.phone, '+966') : ''}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.saveButton}
          onPress={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveText}>{t('profile.save')}</Text>
          )}
        </Pressable>

        {/* Account Actions */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>{t('account.title')}</Text>

          {user?.role === 'guest' && (
            <Pressable
              style={styles.hostButton}
              onPress={handleBecomeHost}
              disabled={upgradeToHost.isPending}
            >
              {upgradeToHost.isPending ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="home-outline" size={20} color={Colors.white} />
                  <Text style={styles.hostButtonText}>{t('profile.becomeHost')}</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteButtonText}>{t('profile.deleteAccount')}</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { padding: Spacing.xl, gap: Spacing.base },
  field: { gap: Spacing.xs },
  label: { ...Typography.smallBold, color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Typography.body, color: Colors.textPrimary,
  },
  inputDisabled: { backgroundColor: Colors.surface },
  disabledText: { ...Typography.body, color: Colors.textTertiary },
  saveButton: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.base,
    borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  saveText: { ...Typography.bodyBold, color: Colors.white },
  // Account section
  accountSection: {
    marginTop: Spacing.xxl,
    gap: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  hostButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hostButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  deleteButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
});
