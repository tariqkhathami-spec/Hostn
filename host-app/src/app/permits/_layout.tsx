import React from 'react';
import { Stack } from 'expo-router';

export default function PermitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackVisible: true,
        headerTitle: '',
        headerTransparent: true,
        headerTintColor: '#14644b',
      }}
    />
  );
}
