import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import HeaderBar from '../../components/layout/HeaderBar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { paymentService } from '../../services/payment.service';
import type { SavedPaymentMethod } from '../../types';

const CARD_BRAND_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  visa: 'card-outline',
  mastercard: 'card-outline',
  mada: 'card-outline',
  amex: 'card-outline',
};

export default function PaymentMethodsScreen() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentService.getSavedMethods(),
  });

  const handleDelete = (method: SavedPaymentMethod) => {
    Alert.alert(
      'Delete Card',
      `Remove card ending in ${method.cardLast4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(method._id);
            try {
              await paymentService.deleteMethod(method._id);
              queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            } catch {
              Alert.alert('Error', 'Failed to delete card.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (method: SavedPaymentMethod) => {
    if (method.isDefault) return;
    try {
      await paymentService.setDefaultMethod(method._id);
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    } catch {
      Alert.alert('Error', 'Failed to update default card.');
    }
  };

  const handleAddCard = async () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      Alert.alert('Error', 'Please fill in all card details.');
      return;
    }

    setIsAdding(true);
    try {
      const cleanedNumber = cardNumber.replace(/\s/g, '');
      const [month, year] = cardExpiry.split('/');

      // Detect card brand
      let cardBrand = 'visa';
      if (cleanedNumber.startsWith('5')) cardBrand = 'mastercard';
      else if (cleanedNumber.startsWith('3')) cardBrand = 'amex';

      await paymentService.addMethod({
        provider: 'moyasar',
        tokenId: `tok_${Date.now()}`,
        cardBrand,
        cardLast4: cleanedNumber.slice(-4),
        expiryMonth: parseInt(month, 10),
        expiryYear: parseInt(`20${year}`, 10),
      });

      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    } catch {
      Alert.alert('Error', 'Failed to add card.');
    } finally {
      setIsAdding(false);
    }
  };

  const renderCard = ({ item }: { item: SavedPaymentMethod }) => (
    <View style={styles.cardItem}>
      <TouchableOpacity
        style={styles.radioContainer}
        onPress={() => handleSetDefault(item)}
      >
        <View style={styles.radioOuter}>
          {item.isDefault && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>

      <Ionicons
        name={CARD_BRAND_ICONS[item.cardBrand] ?? 'card-outline'}
        size={24}
        color={Colors.primary}
      />

      <View style={styles.cardInfo}>
        <Text style={styles.cardBrand}>
          {item.cardBrand.toUpperCase()} **** {item.cardLast4}
        </Text>
        <Text style={styles.cardExpiry}>
          Expires {String(item.expiryMonth).padStart(2, '0')}/{item.expiryYear}
        </Text>
        {item.isDefault && (
          <Text style={styles.defaultBadge}>Default</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => handleDelete(item)}
        disabled={deletingId === item._id}
      >
        {deletingId === item._id ? (
          <ActivityIndicator size="small" color={Colors.error} />
        ) : (
          <Text style={styles.deleteText}>Delete</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <HeaderBar title="Payment Methods" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <HeaderBar title="Payment Methods" />
      <View style={styles.container}>
        <FlatList
          data={methods ?? []}
          renderItem={renderCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !showAddForm ? (
              <EmptyState
                icon="card-outline"
                title="No saved cards"
                subtitle="Add a payment method to speed up checkout"
              />
            ) : null
          }
          ListFooterComponent={
            <>
              {showAddForm ? (
                <View style={styles.addForm}>
                  <Text style={styles.addFormTitle}>Add New Card</Text>
                  <Input
                    label="Card Number"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '').slice(0, 16);
                      const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
                      setCardNumber(formatted);
                    }}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                  <View style={styles.cardRow}>
                    <View style={styles.cardHalf}>
                      <Input
                        label="Expiry Date"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/\D/g, '').slice(0, 4);
                          if (cleaned.length >= 3) {
                            setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
                          } else {
                            setCardExpiry(cleaned);
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>
                    <View style={styles.cardHalf}>
                      <Input
                        label="CVV"
                        placeholder="123"
                        value={cardCvv}
                        onChangeText={(text) =>
                          setCardCvv(text.replace(/\D/g, '').slice(0, 4))
                        }
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                  <View style={styles.addFormActions}>
                    <Button
                      title="Add Card"
                      onPress={handleAddCard}
                      loading={isAdding}
                    />
                    <Button
                      title="Cancel"
                      variant="text"
                      onPress={() => {
                        setShowAddForm(false);
                        setCardNumber('');
                        setCardExpiry('');
                        setCardCvv('');
                      }}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddForm(true)}
                >
                  <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Add New Card</Text>
                </TouchableOpacity>
              )}
            </>
          }
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },

  // Card Item
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  radioContainer: {
    padding: Spacing.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  cardExpiry: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  defaultBadge: {
    ...Typography.tiny,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  deleteText: {
    ...Typography.small,
    color: Colors.error,
    fontWeight: '600',
  },

  // Add Form
  addForm: {
    marginTop: Spacing.xl,
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
  },
  addFormTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cardHalf: {
    flex: 1,
  },
  addFormActions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderStyle: 'dashed',
  },
  addButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
});
