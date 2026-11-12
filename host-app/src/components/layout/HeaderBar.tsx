import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, DirectionalIcon } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWrapperTopInset } from './ScreenWrapper';

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
  // Paint the header colour behind the status bar as well.
  const topInset = useWrapperTopInset();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor, marginTop: -topInset, paddingTop: topInset + Spacing.md }]}>
      <StatusBar style={textColor === Colors.textWhite ? 'light' : 'dark'} />
      <View style={styles.start}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name={DirectionalIcon.back} size={24} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <View style={styles.end}>{rightActions}</View>
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
  start: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    ...Typography.subtitle,
    flex: 1,
    textAlign: 'center',
  },
  end: {
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
