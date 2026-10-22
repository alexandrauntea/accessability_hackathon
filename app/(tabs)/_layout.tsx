// SHARED (frozen). All five tabs pre-wired; each points at a feature folder.
import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/shared/theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const { c, font, motion } = useTheme();
  const { profile } = useProfile();
  if (profile && !profile.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      animation: motion ? 'shift' : 'none',
      tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.textMuted,
      tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 64 },
      tabBarLabelStyle: { fontSize: Math.max(14, font.small - 2) },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sunny-outline'), tabBarAccessibilityLabel: 'Today: check-in and summary' }} />
      <Tabs.Screen name="day" options={{ title: 'My day', tabBarIcon: icon('calendar-outline'), tabBarAccessibilityLabel: 'My day: adapted schedule and tasks' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('stats-chart-outline'), tabBarAccessibilityLabel: 'Insights: patterns over time' }} />
      <Tabs.Screen name="support" options={{ title: 'Support', tabBarIcon: icon('chatbubbles-outline'), tabBarAccessibilityLabel: 'Support: ask for an adjustment' }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person-circle-outline'), tabBarAccessibilityLabel: 'Me: profile, privacy and accessibility settings' }} />
    </Tabs>
  );
}
