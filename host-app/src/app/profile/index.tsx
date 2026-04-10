import React, { useState } from 'react';
import { formatPhoneDisplay } from '../../utils/format';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';
import { useAuthStore } from '../../store/authStore';

interface ActionCard {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['hostProfile'],
    queryFn: () => hostService.getProfile(),
    retry: false,
  });

  const profile = profileData?.data;

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/(auth)/phone-entry' as any);
  };

  const actionCards: ActionCard[] = [
    {
      label: '\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0644\u0641',
      icon: 'create-outline',
      onPress: () => router.push('/profile/edit' as any),
    },
    {
      label: '\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629',
      icon: 'help-circle-outline',
      onPress: () => setSupportModalVisible(true),
    },
    {
      label: '\u0642\u064A\u0645\u0646\u0627',
      icon: 'star-outline',
      onPress: () => Linking.openURL('https://apps.apple.com'),
    },
    {
      label: '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C',
      icon: 'log-out-outline',
      onPress: () => setLogoutModalVisible(true),
    },
  ];

  if (isLoading) {
    return (
      <ScreenWrapper backgroundColor={Colors.surface}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor={Colors.surface}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Purple Gradient Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)}
          >
            <Ionicons name="chevron-forward" size={28} color={Colors.textWhite} />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            {profile?.avatar ? (
              <Ionicons name="person" size={40} color={Colors.textWhite} />
            ) : (
              <Ionicons name="person" size={40} color={Colors.textWhite} />
            )}
          </View>
          <Text style={styles.headerName}>{profile?.name || ''}</Text>
          <Text style={styles.headerEmail}>{profile?.email || ''}</Text>
          <Text style={styles.headerPhone}>{formatPhoneDisplay(profile?.phone || '')}</Text>
        </View>

        {/* 2x2 Action Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {actionCards.slice(0, 2).map((card) => (
              <TouchableOpacity
                key={card.label}
                style={styles.gridCard}
                onPress={card.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={card.icon} size={28} color={Colors.primary} />
                <Text style={styles.gridLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.gridRow}>
            {actionCards.slice(2, 4).map((card) => (
              <TouchableOpacity
                key={card.label}
                style={styles.gridCard}
                onPress={card.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={card.icon}
                  size={28}
                  color={card.icon === 'log-out-outline' ? Colors.error : Colors.primary}
                />
                <Text
                  style={[
                    styles.gridLabel,
                    card.icon === 'log-out-outline' && { color: Colors.error },
                  ]}
                >
                  {card.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {'\u0647\u0644 \u062A\u0631\u064A\u062F \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C\u061F'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>{'\u0625\u0644\u063A\u0627\u0621'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonConfirmText}>{'\u0646\u0639\u0645'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Support Contact Modal */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.supportHeader}>
              <Text style={styles.modalTitle}>
                {'\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627'}
              </Text>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.supportOption}
              onPress={() => {
                setSupportModalVisible(false);
                router.push('/messages/support' as any);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={24} color={Colors.primary} />
              <Text style={styles.supportOptionText}>
                {'\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A'}
              </Text>
              <Ionicons name="chevron-back" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportOption}
              onPress={() => {
                setSupportModalVisible(false);
                Linking.openURL('tel:920007858');
              }}
            >
              <Ionicons name="call-outline" size={24} color={Colors.primary} />
              <Text style={styles.supportOptionText}>
                {'\u0645\u0631\u0643\u0632 \u0627\u0644\u0627\u062A\u0635\u0627\u0644'}
              </Text>
              <Ionicons name="chevron-back" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.base,
    zIndex: 10,
    padding: Spacing.xs,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerName: {
    ...Typography.h3,
    color: Colors.textWhite,
    marginBottom: Spacing.xs,
  },
  headerEmail: {
    ...Typography.small,
    color: Colors.primary200,
    marginBottom: Spacing.xs,
  },
  headerPhone: {
    ...Typography.small,
    color: Colors.primary200,
  },
  gridContainer: {
    padding: Spacing.base,
    gap: Spacing.md,
    marginTop: Spacing.base,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.card,
  },
  gridLabel: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.surfaceAlt,
  },
  modalButtonCancelText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.error,
  },
  modalButtonConfirmText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
  supportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  supportOptionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
});
