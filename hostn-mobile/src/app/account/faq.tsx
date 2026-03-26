import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';

const FAQ_DATA = [
  {
    question: 'How do I book a property?',
    answer: 'Search for your desired destination, select dates and guests, choose a property, and complete the checkout with your preferred payment method.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept Mada, Visa, Mastercard, Tabby (pay in 4 installments), and Tamara (buy now, pay later). All payments are processed securely.',
  },
  {
    question: 'How do I cancel a booking?',
    answer: 'Go to My Bookings, select the booking you want to cancel, and tap "Cancel Booking". Refund policies depend on the property\'s cancellation policy.',
  },
  {
    question: 'How do I contact the host?',
    answer: 'You can message the host directly from the property listing page by tapping "Contact Host", or from your conversations tab after booking.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Yes, all payments are processed through secure, PCI-compliant payment gateways. We never store your full card details on our servers.',
  },
  {
    question: 'How does the wallet work?',
    answer: 'Your Hostn wallet can receive refunds and promotional credits. You can use your wallet balance to pay for future bookings.',
  },
  {
    question: 'What is the Hostn Guarantee?',
    answer: 'The Hostn Guarantee protects guests with verified properties, secure payments, and 24/7 customer support for a worry-free stay.',
  },
  {
    question: 'How do I become a host?',
    answer: 'Download the Hostn Host app, create a host account, and list your property. Our team will review and approve your listing.',
  },
  {
    question: 'What if I have a problem during my stay?',
    answer: 'Contact our Guest Experience team through the Support section in the app, or message your host directly. We\'re available 24/7.',
  },
];

export default function FAQScreen() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = FAQ_DATA.filter(
    (item) =>
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScreenWrapper>
      <HeaderBar title="FAQ" />
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {filtered.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => setExpanded(expanded === index ? null : index)}
          >
            <View style={styles.questionRow}>
              <Text style={styles.question}>{item.question}</Text>
              <Ionicons
                name={expanded === index ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </View>
            {expanded === index && (
              <Text style={styles.answer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  item: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  question: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  answer: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 24,
  },
});
