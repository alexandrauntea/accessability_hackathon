import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, space } from '../theme/tokens';
import { anchorFor } from '../metrics';

/**
 * 1-10 scale as ten large 52px buttons (works with tremor, RA flares, switch access, keyboard).
 * Tab reaches each value, Space/Enter selects.
 * Factual anchors instead of emojis.
 */
export function ScaleInput({
  label,
  question,
  value,
  onChange,
  anchors,
  highlight,
}: {
  label: string;
  question?: string;
  value: number | undefined;
  onChange: (v: number) => void;
  anchors: { 1: string; 5: string; 10: string };
  highlight?: boolean;
}) {
  const { c, radius, font } = useTheme();
  const caption = value ? anchorFor({ anchors }, value) : 'Not set';
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={`${label}. ${question ?? ''}`} style={{ gap: space.sm }}>
      <AppText variant="h2">{label}</AppText>
      {question ? <AppText variant="muted">{question}</AppText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const on = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              onKeyDown={(e: any) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault?.();
                  onChange(n);
                }
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, selected: on }}
              accessibilityLabel={`${label}, ${n} of 10, ${anchorFor({ anchors }, n)}${on ? ', selected' : ''}`}
              style={(s: any) => ({
                width: MIN_TOUCH + 4,
                height: MIN_TOUCH + 4,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                borderWidth: on ? 2 : 1.5,
                borderColor: on ? c.accent : c.border,
                backgroundColor: on ? c.accent : c.surface,
                cursor: 'pointer',
                outlineStyle: s.focused ? 'solid' : undefined,
                outlineWidth: s.focused ? 3 : 0,
                outlineColor: c.focus,
                outlineOffset: 2,
              } as any)}
            >
              <AppText
                style={{
                  color: on ? c.onPrimary : c.text,
                  fontWeight: on ? '700' : '600',
                  fontSize: font.body,
                }}
              >
                {n}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText accessibilityLiveRegion="polite" style={{ fontWeight: highlight ? '700' : '500' }}>
        {value ? `${value}/10: ${caption}` : caption}
        {highlight ? ' (set from your voice, please confirm)' : ''}
      </AppText>
      <AppText variant="muted">
        1 = {anchors[1]} · 5 = {anchors[5]} · 10 = {anchors[10]}
      </AppText>
    </View>
  );
}