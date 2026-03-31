import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

const FAQ_DATA = [
  { q: 'How do I book a property?', a: 'Search for your destination, select dates and guests, choose a property, and tap "Book Now" to proceed to checkout.' },
  { q: 'What payment methods are accepted?', a: 'We accept Visa, Mastercard, Mada, Apple Pay, and Buy Now Pay Later options through Tabby and Tamara.' },
  { q: 'How do I cancel a booking?', a: 'Go to My Bookings, select the booking you want to cancel, and tap "Cancel Booking". Cancellation policies vary by property.' },
  { q: 'How do I contact a host?', a: 'You can message a host directly from the listing detail page by tapping "Contact Host".' },
  { q: 'Is my payment secure?', a: 'Yes, all payments are processed through Moyasar, a certified payment gateway. We never store your card details.' },
  { q: 'How do refunds work?', a: 'Refunds are processed according to the property\'s cancellation policy. Approved refunds appear in your wallet within 5-10 business days.' },
  { q: 'Can I save properties to view later?', a: 'Yes! Tap the heart icon on any listing to add it to your Favorites.' },
];

export default function FaqScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = FAQ_DATA.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>FAQ</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.map((item, i) => (
          <Pressable key={i} style={styles.faqItem} onPress={() => setExpanded(expanded === i ? null : i)}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
            </View>
            {expanded === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </Pressable>
        ))}
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, ...Typography.small, color: Colors.textPrimary },
  list: { padding: Spacing.xl, gap: Spacing.sm },
  faqItem: {
    backgroundColor: Colors.white, borderRadius: Radius.sm, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { ...Typography.smallBold, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  faqAnswer: { ...Typography.small, color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 22 },
});
