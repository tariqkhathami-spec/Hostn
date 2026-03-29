import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import { showToast } from '../../components/ui/Toast';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { supportService } from '../../services/support.service';

const CATEGORIES = [
  { value: 'payment', label: 'Payment' },
  { value: 'booking', label: 'Booking' },
  { value: 'technical', label: 'Technical' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

export default function SupportScreen() {
  const [category, setCategory] = useState<Category>('technical');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState('');

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter a message.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await supportService.createTicket(subject.trim(), message.trim(), category);
      setTicketRef(result?.data?._id ?? result?._id ?? '');
      setSubmitted(true);
      showToast('success', 'Ticket submitted!', "We'll get back to you soon.");
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? 'Failed to submit ticket. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScreenWrapper>
        <HeaderBar title="Support" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Ticket Submitted!</Text>
          <Text style={styles.successSubtitle}>
            We'll get back to you soon. You can also reach us directly.
          </Text>
          {ticketRef ? (
            <Text style={styles.ticketRef}>Reference: {ticketRef}</Text>
          ) : null}
          <View style={[styles.contactCard, Shadows.card]}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
            <Text style={styles.contactText}>9200 07858</Text>
          </View>
          <Text style={styles.hoursText}>Available 10AM - 12AM</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="Support" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contact Info */}
        <View style={[styles.contactSection, Shadows.card]}>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={22} color={Colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone Support</Text>
              <Text style={styles.contactValue}>9200 07858</Text>
            </View>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="time-outline" size={22} color={Colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Working Hours</Text>
              <Text style={styles.contactValue}>10:00 AM - 12:00 AM</Text>
            </View>
          </View>
        </View>

        {/* Submit Request Form */}
        <Text style={styles.sectionTitle}>Submit a Request</Text>

        {/* Category Picker */}
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                category === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat.value && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <Text style={styles.fieldLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief description of your issue"
          placeholderTextColor={Colors.textLight}
          value={subject}
          onChangeText={setSubject}
          maxLength={200}
        />

        {/* Message */}
        <Text style={styles.fieldLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          placeholder="Describe your issue in detail..."
          placeholderTextColor={Colors.textLight}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={2000}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Ticket</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  contactSection: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  contactInfo: {
    marginLeft: Spacing.md,
  },
  contactLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  contactValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.textWhite,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  messageInput: {
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  successIcon: {
    marginBottom: Spacing.base,
  },
  successTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  ticketRef: {
    ...Typography.small,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  contactText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  hoursText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
});
