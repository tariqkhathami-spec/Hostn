import React from 'react';
import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('account.terms')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{t('account.terms')}</Text>
        <Text style={styles.body}>{t('terms.intro')}</Text>
        <Text style={styles.subheading}>{t('terms.section1')}</Text>
        <Text style={styles.body}>{t('terms.section1Body')}</Text>
        <Text style={styles.subheading}>{t('terms.section2')}</Text>
        <Text style={styles.body}>{t('terms.section2Body')}</Text>
        <Text style={styles.subheading}>{t('terms.section3')}</Text>
        <Text style={styles.body}>{t('terms.section3Body')}</Text>
        <Text style={styles.subheading}>{t('terms.section4')}</Text>
        <Text style={styles.body}>{t('terms.section4Body')}</Text>
        <Text style={styles.updated}>{t('terms.lastUpdated')}</Text>
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
