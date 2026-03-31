import React from 'react';
import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Terms of Use</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Terms of Use</Text>
        <Text style={styles.body}>
          Welcome to Hostn. By using our platform, you agree to these terms and conditions. Please read them carefully before using our services.
        </Text>
        <Text style={styles.subheading}>1. Account Registration</Text>
        <Text style={styles.body}>
          You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials.
        </Text>
        <Text style={styles.subheading}>2. Booking & Payments</Text>
        <Text style={styles.body}>
          All bookings are subject to availability and host approval. Payments are processed securely through our payment partners. Cancellation policies vary by property.
        </Text>
        <Text style={styles.subheading}>3. User Conduct</Text>
        <Text style={styles.body}>
          Users must comply with all applicable laws and respect the properties they rent. Any damage to properties may result in additional charges.
        </Text>
        <Text style={styles.subheading}>4. Liability</Text>
        <Text style={styles.body}>
          Hostn acts as a platform connecting guests with hosts. We are not responsible for the condition of properties or the conduct of users.
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
