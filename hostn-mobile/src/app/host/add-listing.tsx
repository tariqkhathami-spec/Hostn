import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';

export default function AddListingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'chalet',
    city: '',
    basePrice: '',
    bedrooms: '1',
    bathrooms: '1',
    maxGuests: '4',
  });

  const handleSubmit = async () => {
    if (!form.title || !form.city || !form.basePrice) {
      Alert.alert('Error', 'Please fill in title, city, and price');
      return;
    }

    setLoading(true);
    try {
      await api.post('/properties', {
        title: form.title,
        description: form.description,
        type: form.type,
        location: { city: form.city },
        pricing: { basePrice: Number(form.basePrice) },
        details: {
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          maxGuests: Number(form.maxGuests),
        },
      });
      showToast('Property created!', 'success');
      router.back();
    } catch {
      showToast('Failed to create listing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, field, ...props }: { label: string; value: string; field: string; [key: string]: unknown }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => setForm((f) => ({ ...f, [field]: text }))}
        placeholderTextColor={Colors.textSecondary}
        {...props}
      />
    </View>
  );

  return (
    <ScreenWrapper>
      <Stack.Screen options={{ headerShown: true, title: 'Add Listing', headerBackTitle: 'Back' }} />

      <ScrollView style={styles.container}>
        <Field label="Title" value={form.title} field="title" placeholder="Property name" />
        <Field label="Description" value={form.description} field="description" placeholder="Describe your property" multiline numberOfLines={3} />
        <Field label="City" value={form.city} field="city" placeholder="e.g. Riyadh" />
        <Field label="Price per night (SAR)" value={form.basePrice} field="basePrice" placeholder="500" keyboardType="numeric" />
        <Field label="Bedrooms" value={form.bedrooms} field="bedrooms" keyboardType="numeric" />
        <Field label="Bathrooms" value={form.bathrooms} field="bathrooms" keyboardType="numeric" />
        <Field label="Max Guests" value={form.maxGuests} field="maxGuests" keyboardType="numeric" />

        <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxxl }}>
          <Button title="Create Listing" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { ...Typography.small, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
});
