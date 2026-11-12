import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows, TEXT_START } from '../../constants/theme';
import type { Unit } from '../../types';

interface Props {
  unit: Unit;
  onPress: () => void;
}

export default function UnitCard({ unit, onPress }: Props) {
  const isListed = unit.status === 'listed';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      {/* Small thumbnail placeholder */}
      <View style={styles.thumbnail}>
        <Ionicons name="bed-outline" size={20} color={Colors.textTertiary} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {unit.name}
        </Text>
        <Text style={styles.code} numberOfLines={1}>
          {unit.code}
        </Text>

        {/* Status toggle text */}
        <View style={[styles.statusBadge, isListed ? styles.statusListed : styles.statusUnlisted]}>
          <View style={[styles.statusDot, { backgroundColor: isListed ? Colors.success : Colors.textTertiary }]} />
          <Text style={[styles.statusText, { color: isListed ? Colors.success : Colors.textTertiary }]}>
            {isListed ? 'معروض' : 'غير معروض'}
          </Text>
        </View>
      </View>

      {/* Chevron for navigation */}
      <View style={styles.chevron}>
        <Ionicons name="chevron-back" size={20} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...Typography.smallBold,
    color: Colors.textPrimary,
    textAlign: TEXT_START,
  },
  code: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: TEXT_START,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: Spacing.xs,
    marginTop: 2,
  },
  statusListed: {
    backgroundColor: '#dcfce7',
  },
  statusUnlisted: {
    backgroundColor: Colors.surfaceAlt,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.tiny,
    fontWeight: '600',
  },
  chevron: {
    paddingRight: Spacing.xs,
  },
});
