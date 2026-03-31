import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../constants/theme';

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; title: string; icon: TabIcon; iconFocused: TabIcon }[] = [
  { name: 'index', title: 'Search', icon: 'search-outline', iconFocused: 'search' },
  { name: 'favorites', title: 'Favorites', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'bookings', title: 'Bookings', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'conversations', title: 'Chat', icon: 'chatbubble-outline', iconFocused: 'chatbubble' },
  { name: 'more', title: 'More', icon: 'menu-outline', iconFocused: 'menu' },
];

export default function TabsLayout() {
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
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
