import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';

export default function PrivacyScreen() {
  return (
    <ScreenWrapper>
      <HeaderBar title="Privacy Policy" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly: name, phone number, email address, payment information, and profile details. We also collect usage data, device information, and location data when you use our services.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information to: provide and improve our services, process bookings and payments, communicate with you, ensure platform safety, and comply with legal obligations.
        </Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.body}>
          We share your information with: hosts (for bookings), payment processors, service providers, and when required by law. We never sell your personal data to third parties.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.body}>
          We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. Payment data is processed by PCI-compliant partners.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to access, correct, or delete your personal data. You can update your profile information at any time through the app settings. To delete your account, contact support.
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
        <Text style={styles.body}>
          Our mobile app uses analytics to improve user experience. You can opt out of analytics collection through your device settings.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.body}>
          We retain your data for as long as your account is active and as required by applicable regulations. Booking records are retained for legal and tax compliance purposes.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact</Text>
        <Text style={styles.body}>
          For privacy inquiries, contact our Data Protection Officer at privacy@hostn.co
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  heading: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  updated: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
