import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n';
import { Colors, Typography, Shadows } from '../../constants/theme';
import api from '../../services/api';
import type { TranslationKey } from '../../i18n';

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; titleKey: TranslationKey; icon: TabIcon; iconFocused: TabIcon }[] = [
  { name: 'index', titleKey: 'tab.search', icon: 'search-outline', iconFocused: 'search' },
  { name: 'favorites', titleKey: 'tab.favorites', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'bookings', titleKey: 'tab.bookings', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'conversations', titleKey: 'tab.chat', icon: 'chatbubble-outline', iconFocused: 'chatbubble' },
  { name: 'more', titleKey: 'tab.more', icon: 'menu-outline', iconFocused: 'menu' },
];

interface BadgeCounts {
  bookings: number;
  messages: number;
  support: number;
}

export default function TabsLayout() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [badges, setBadges] = useState<BadgeCounts>({ bookings: 0, messages: 0, support: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      const [summaryRes, messagesRes] = await Promise.allSettled([
        api.get('/notifications/unread-summary'),
        api.get('/messages/unread-count'),
      ]);

      const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;
      const messagesData = messagesRes.status === 'fulfilled' ? messagesRes.value.data : null;

      setBadges({
        bookings: summary?.bookings ?? 0,
        messages: messagesData?.count ?? 0,
        support: summary?.support ?? 0,
      });
    } catch {
      // Silently fail — badges are non-critical
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    intervalRef.current = setInterval(fetchBadges, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBadges]);

  // Clear badge when navigating to the corresponding tab
  useEffect(() => {
    if (pathname === '/bookings' || pathname === '/(tabs)/bookings') {
      setBadges(prev => ({ ...prev, bookings: 0 }));
    } else if (pathname === '/conversations' || pathname === '/(tabs)/conversations') {
      setBadges(prev => ({ ...prev, messages: 0 }));
    } else if (pathname === '/more' || pathname === '/(tabs)/more') {
      setBadges(prev => ({ ...prev, support: 0 }));
    }
  }, [pathname]);

  const getBadge = (tabName: string): number | undefined => {
    let count = 0;
    if (tabName === 'bookings') count = badges.bookings;
    else if (tabName === 'conversations') count = badges.messages;
    else if (tabName === 'more') count = badges.support;
    return count > 0 ? count : undefined;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          ...Typography.tiny,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          ...Shadows.bottomBar,
        },
        tabBarBadgeStyle: {
          backgroundColor: Colors.error,
          fontSize: 11,
          minWidth: 18,
          height: 18,
          lineHeight: 16,
          borderRadius: 9,
        },
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color} />
            ),
            tabBarBadge: getBadge(tab.name),
          }}
        />
      ))}
    </Tabs>
  );
}
