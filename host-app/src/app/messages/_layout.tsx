import React from 'react';
import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: true,
        headerTitle: '',
        headerTransparent: true,
        headerTintColor: '#14644b',
      }}
    />
  );
}
