import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { formatPhone } from '../../utils/format';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const updateProfile = useMutation({
    mutationFn: () => authService.updateProfile({ firstName, lastName, email }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile.');
    },
  });

  const upgradeToHost = useMutation({
    mutationFn: () => authService.upgradeToHost(),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      Alert.alert('Success', 'You are now a host! You can start listing your properties.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upgrade account.');
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => authService.deleteAccount(),
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)/phone');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete account.');
    },
  });

  const handleBecomeHost = () => {
    Alert.alert(
      'Become a Host',
      'Would you like to upgrade your account to a host? You will be able to list and manage properties.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => upgradeToHost.mutate() },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all associated data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Permanently', style: 'destructive', onPress: () => deleteAccount.mutate() },
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
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderField('First Name', firstName, setFirstName)}
        {renderField('Last Name', lastName, setLastName)}
        {renderField('Email', email, setEmail, { keyboard: 'email-address' })}

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>
              {user?.phone ? formatPhone(user.phone) : ''}
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
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </Pressable>

        {/* Account Actions */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account</Text>

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
                  <Text style={styles.hostButtonText}>Become a Host</Text>
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
                <Text style={styles.deleteButtonText}>Delete Account</Text>
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
