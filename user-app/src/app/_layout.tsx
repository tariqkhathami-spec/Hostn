import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectSocket, setQueryClient, disconnectSocket } from '../services/socket';
import { useUIStore } from '../store/uiStore';
import { useNotificationSetup } from '../hooks/useNotifications';
import { LanguageProvider } from '../i18n';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import NetworkBanner from '../components/ui/NetworkBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

setQueryClient(queryClient);

export default function RootLayout() {
  const loadPreferences = useUIStore((s) => s.loadPreferences);

  useEffect(() => {
    loadPreferences();
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  useNotificationSetup();

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <LanguageProvider>
            <StatusBar style="dark" />
            <NetworkBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="search" />
              <Stack.Screen name="results" />
              <Stack.Screen name="filters" />
              <Stack.Screen name="listing" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="chat" />
              <Stack.Screen name="account" />
            </Stack>
            </LanguageProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
