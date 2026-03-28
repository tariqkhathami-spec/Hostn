import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectSocket, setQueryClient, disconnectSocket } from '../services/socket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

// Register queryClient with socket service so events can invalidate caches
setQueryClient(queryClient);

// Force RTL for Arabic-first app
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  // Connect socket on mount, disconnect on unmount
  useEffect(() => {
    connectSocket();
    return () => { disconnectSocket(); };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="property" />
            <Stack.Screen name="financial" />
            <Stack.Screen name="reviews" />
            <Stack.Screen name="reservations" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="program" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="pricing" />
            <Stack.Screen name="invoices" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="legal" />
            <Stack.Screen name="permits" />
            <Stack.Screen name="protection" />
            <Stack.Screen name="suggestions" />
            <Stack.Screen name="content" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
