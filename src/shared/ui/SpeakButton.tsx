import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSpeech } from '../hooks/useSpeech';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH } from '../theme/tokens';

export function SpeakButton({ text }: { text: string }) {
  const { speak, speaking } = useSpeech();
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={speaking ? 'Stop reading' : 'Read screen aloud'}
      accessibilityState={{ busy: speaking }}
      onPress={() => speak(text)}
      onKeyDown={(e: any) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault?.();
          speak(text);
        }
      }}
      style={(s: any) => ({
        minHeight: MIN_TOUCH,
        minWidth: MIN_TOUCH,
        padding: 8,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        cursor: 'pointer',
        outlineStyle: s.focused ? 'solid' : undefined,
        outlineWidth: s.focused ? 3 : 0,
        outlineColor: c.focus,
        outlineOffset: 2,
      } as any)}
    >
      <Ionicons name={speaking ? 'volume-mute-outline' : 'volume-high-outline'} size={22} color={c.accent} />
    </Pressable>
  );
}