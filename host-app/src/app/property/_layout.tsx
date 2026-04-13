import React from 'react';
import { Stack } from 'expo-router';

export default function PropertyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: true,
        headerTitle: '',
        headerTransparent: true,
        headerTintColor: '#6d28d9',
      }}
    >
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="add-unit" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="duplicate" options={{ headerShown: false }} />
      <Stack.Screen name="edit-unit" options={{ headerShown: false }} />
      <Stack.Screen name="unit-pricing" options={{ headerShown: false }} />
    </Stack>
  );
}
