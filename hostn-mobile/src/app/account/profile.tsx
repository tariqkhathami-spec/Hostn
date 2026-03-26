import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const updates: { name?: string; avatar?: string } = {};
      if (name.trim() !== user?.name) updates.name = name.trim();

      const updatedUser = await authService.updateProfile(updates);
      if (updatedUser) {
        setUser(updatedUser);
      }
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to update profile.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePhoto = () => {
    // Placeholder for image picker integration
    Alert.alert('Change Photo', 'Image picker will be integrated in a future update.');
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <ScreenWrapper>
      <HeaderBar title="Profile" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.changePhotoOverlay} onPress={handleChangePhoto}>
              <Ionicons name="camera" size={18} color={Colors.textWhite} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <Input
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="Enter your email (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Phone"
            value={user?.phone ?? ''}
            editable={false}
            style={styles.readOnlyInput}
          />
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button title="Save" onPress={handleSave} loading={isSaving} />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.h1,
    color: Colors.textWhite,
  },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  changePhotoText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Form
  form: {
    marginBottom: Spacing.xl,
  },
  readOnlyInput: {
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
  },

  // Button
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
