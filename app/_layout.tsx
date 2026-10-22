// SHARED (frozen). Providers + stack. Feature owners never edit this file.
import React from 'react';
import { Stack } from 'expo-router';
import { useFonts, AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/shared/hooks/useAuth';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { ThemeProvider, useTheme } from '@/src/shared/theme/ThemeProvider';

function Themed({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  return <ThemeProvider prefs={profile?.a11y}>{children}</ThemeProvider>;
}

function AppStack() {
  const { c, motion } = useTheme(); // low-sensory / reduce-motion => no screen transitions
  return (
    <Stack screenOptions={{ headerShown: false, animation: motion ? 'default' : 'none', headerStyle: { backgroundColor: c.surface }, headerTintColor: c.text, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkin" options={{ presentation: 'modal', headerShown: true, title: 'Daily check-in' }} />
      <Stack.Screen name="request/[id]" options={{ headerShown: true, title: 'Support request' }} />
      <Stack.Screen name="speak" options={{ headerShown: true, title: 'Speak for me' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useFonts({ AtkinsonHyperlegible_400Regular });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Themed>
          <AppStack />
        </Themed>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
