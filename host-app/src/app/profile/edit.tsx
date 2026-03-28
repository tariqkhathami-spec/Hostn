import React, { useState, useEffect } from 'react';
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
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
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

  const updateEmailMutation = useMutation({
    mutationFn: (newEmail: string) => hostService.updateEmail(newEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostProfile'] });
      Alert.alert(
        '\u062A\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062B',
        '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D',
        [{ text: '\u062D\u0633\u0646\u0627', onPress: () => router.back() }],
      );
    },
    onError: () => {
      Alert.alert(
        '\u062E\u0637\u0623',
        '\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A',
      );
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
          title={'\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A'}
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
        title={'\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A'}
        showBack
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Name - Read Only */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {'\u0627\u0644\u0627\u0633\u0645'}
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
              {'\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A'}
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
              {'\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644'}
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profile?.phone || ''}
              editable={false}
            />
          </View>

          {/* ID Number - Read Only */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {'\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629'}
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profile?.nationalId || ''}
              editable={false}
            />
          </View>

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
                {'\u062D\u0641\u0638'}
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
    textAlign: 'right',
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
