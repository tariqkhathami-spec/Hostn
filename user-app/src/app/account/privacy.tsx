import React from 'react';
import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.body}>
          At Hostn, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information.
        </Text>
        <Text style={styles.subheading}>Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly, such as your name, phone number, email, and payment details. We also collect usage data to improve our services.
        </Text>
        <Text style={styles.subheading}>How We Use Your Information</Text>
        <Text style={styles.body}>
          Your information is used to process bookings, communicate with you, improve our platform, and comply with legal obligations.
        </Text>
        <Text style={styles.subheading}>Data Security</Text>
        <Text style={styles.body}>
          We use industry-standard encryption and security measures to protect your data. Payment information is processed through certified payment gateways.
        </Text>
        <Text style={styles.subheading}>Your Rights</Text>
        <Text style={styles.body}>
          You have the right to access, correct, or delete your personal information. Contact us at support@hostn.co for any privacy-related requests.
        </Text>
        <Text style={styles.updated}>Last updated: March 2026</Text>
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
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  heading: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.base },
  subheading: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  body: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
  updated: { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.xxl },
});
