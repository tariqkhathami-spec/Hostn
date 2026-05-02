import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { contactService } from '../../services/contact.service';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

export default function ContactScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim() && email.trim() && subject.trim() && message.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await contactService.submit({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      Alert.alert(t('contact.successTitle'), t('contact.successBody'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const status = error?.response?.status;
      let body: string;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        body = t('contact.error4xx');
      } else if (typeof status === 'number' && status >= 500) {
        body = t('contact.error5xx');
      } else {
        body = t('contact.errorBody');
      }
      Alert.alert(t('common.error'), body);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('account.contactUs')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Contact Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>{t('contact.email')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>{t('contact.phone')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>{t('contact.hours')}</Text>
            </View>
          </View>

          {/* Form */}
          <Text style={styles.formHeading}>{t('contact.formHeading')}</Text>

          <Text style={styles.label}>{t('contact.name')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('contact.namePlaceholder')}
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>{t('profile.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('contact.emailPlaceholder')}
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('contact.subject')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('contact.subjectPlaceholder')}
            placeholderTextColor={Colors.textTertiary}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.label}>{t('contact.message')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('contact.messagePlaceholder')}
            placeholderTextColor={Colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>{t('contact.send')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  infoCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.base,
    gap: Spacing.md, marginBottom: Spacing.xl, ...Shadows.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  infoText: { ...Typography.small, color: Colors.textPrimary },
  formHeading: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.base },
  label: { ...Typography.smallBold, color: Colors.textPrimary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Typography.body, color: Colors.textPrimary,
  },
  textArea: { height: 120, paddingTop: Spacing.md },
  submitButton: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.base, alignItems: 'center', marginTop: Spacing.xl,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { ...Typography.bodyBold, color: Colors.white },
});
