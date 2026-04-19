// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { COLORS } from '@/constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: COLORS.bgSecondary,
          borderTopColor: '#1A3A5C',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 0 : 4,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: '#546E7A',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chart',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={(focused ? 'map' : 'map-outline') as IoniconName}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={(focused ? 'navigate' : 'navigate-outline') as IoniconName}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Weather',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={(focused ? 'cloud' : 'cloud-outline') as IoniconName}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
