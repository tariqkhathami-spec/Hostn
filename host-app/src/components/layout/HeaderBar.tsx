import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useRouter } from 'expo-router';

interface Props {
  title: string;
  showBack?: boolean;
  fallbackRoute?: string;
  rightActions?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}

export default function HeaderBar({
  title,
  showBack = false,
  fallbackRoute = '/(tabs)/dashboard',
  rightActions,
  backgroundColor = Colors.primary,
  textColor = Colors.textWhite,
}: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-forward" size={24} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <View style={styles.right}>{rightActions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    ...Typography.subtitle,
    flex: 1,
    textAlign: 'center',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
});
