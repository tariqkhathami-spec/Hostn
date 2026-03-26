import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';

export default function TermsScreen() {
  return (
    <ScreenWrapper>
      <HeaderBar title="Terms of Use" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By accessing or using the Hostn platform, including the mobile application and website, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.body}>
          Hostn provides an online marketplace connecting guests with property hosts for short-term vacation rentals across the Kingdom of Saudi Arabia. We facilitate bookings but are not a party to the rental agreement between guests and hosts.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.body}>
          You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the platform.
        </Text>

        <Text style={styles.sectionTitle}>4. Bookings and Payments</Text>
        <Text style={styles.body}>
          All bookings are subject to availability and host confirmation. Payments are processed securely through our payment partners. Service fees are clearly displayed before booking confirmation. All amounts are in Saudi Riyals (SAR).
        </Text>

        <Text style={styles.sectionTitle}>5. Cancellation Policy</Text>
        <Text style={styles.body}>
          Cancellation policies vary by property and are displayed on each listing. Refunds are processed according to the applicable cancellation policy. Please review the policy before booking.
        </Text>

        <Text style={styles.sectionTitle}>6. User Conduct</Text>
        <Text style={styles.body}>
          Users must comply with all applicable laws and regulations. Harassment, fraud, property damage, and violations of property rules may result in account suspension or termination.
        </Text>

        <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
        <Text style={styles.body}>
          Hostn is not liable for damages arising from the use of properties, disputes between guests and hosts, or events beyond our control. Our liability is limited to the service fees paid.
        </Text>

        <Text style={styles.sectionTitle}>8. Governing Law</Text>
        <Text style={styles.body}>
          These terms are governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be resolved through the competent courts in Riyadh, Saudi Arabia.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact</Text>
        <Text style={styles.body}>
          For questions about these Terms, contact us at support@hostn.co
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
