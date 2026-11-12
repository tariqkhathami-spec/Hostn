import React, { useState, useEffect } from 'react';
import { formatPhoneDisplay } from '../../utils/format';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import { hostService } from '../../services/host.service';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['hostProfile'],
    queryFn: () => hostService.getProfile(),
    retry: false,
  });

  const profile = profileData?.data;

  useEffect(() => {
    if (profile?.email) {
      setEmail(profile.email);
    }
  }, [profile?.email]);

  const emailChanged = email !== (profile?.email || '');
  // Accounts that already have an email and password must confirm the
  // current password before the email can change (server rule).
  const [needPassword, setNeedPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const updateEmailMutation = useMutation({
    mutationFn: (newEmail: string) => hostService.updateEmail(newEmail, currentPassword || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostProfile'] });
      Alert.alert(
        'تم التحديث',
        'تم تحديث البريد الإلكتروني بنجاح',
        [{ text: 'حسنا', onPress: () => router.canGoBack() ? router.back() : router.replace('/profile' as any) }],
      );
    },
    onError: (error: any) => {
      if (error?.response?.data?.code === 'CURRENT_PASSWORD_REQUIRED') {
        setNeedPassword(true);
        Alert.alert('تأكيد', 'أدخل كلمة المرور الحالية لتغيير البريد الإلكتروني');
        return;
      }
      Alert.alert('خطأ', error?.response?.data?.message || 'فشل تحديث البريد الإلكتروني');
    },
  });

  const handleSave = () => {
    if (emailChanged) {
      updateEmailMutation.mutate(email);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar
          title={'تعديل الملف الشخصي'}
          showBack
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar
        title={'تعديل الملف الشخصي'}
        showBack
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Name - Read Only */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {'الاسم'}
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profile?.name || ''}
              editable={false}
            />
          </View>

          {/* Email - Editable */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {'البريد الإلكتروني'}
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          {/* Phone - Read Only */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {'رقم الجوال'}
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formatPhoneDisplay(profile?.phone || '')}
              editable={false}
            />
          </View>

          {needPassword && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{'كلمة المرور الحالية'}</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!emailChanged || updateEmailMutation.isPending) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!emailChanged || updateEmailMutation.isPending}
            activeOpacity={0.7}
          >
            {updateEmailMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textWhite} />
            ) : (
              <Text style={styles.saveButtonText}>
                {'حفظ'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  formContainer: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceAlt,
    color: Colors.textTertiary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
