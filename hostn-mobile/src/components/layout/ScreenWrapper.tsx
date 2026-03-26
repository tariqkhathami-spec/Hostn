import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  statusBarStyle?: 'light' | 'dark';
  backgroundColor?: string;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function ScreenWrapper({
  children,
  style,
  statusBarStyle = 'dark',
  backgroundColor = Colors.background,
  safeAreaEdges = ['top'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={safeAreaEdges}>
      <StatusBar style={statusBarStyle} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
