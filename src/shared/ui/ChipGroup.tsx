import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, space } from '../theme/tokens';

/** Multi-select chips; selected state is announced, not only shown by colour. */
export function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  const { c, radius } = useTheme();
  return (
    <View accessibilityRole="list" accessibilityLabel={label} style={{ gap: space.xs, width: '100%', maxWidth: '100%', alignSelf: 'stretch' }}>
      <AppText variant="h2">{label}</AppText>
      <View style={{ gap: space.sm, width: '100%', maxWidth: '100%', alignSelf: 'stretch' }}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              onKeyDown={(e: any) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault?.();
                  onToggle(o.value);
                }
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, selected: on }}
              accessibilityLabel={`${o.label}, ${on ? 'checked' : 'not checked'}`}
              style={(s: any) => ({
                minHeight: 48,
                alignSelf: 'stretch',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: on ? c.accent : c.border,
                backgroundColor: on ? c.accentSoft : c.surface,
                cursor: 'pointer',
                outlineStyle: s.focused ? 'solid' : undefined,
                outlineWidth: s.focused ? 3 : 0,
                outlineColor: c.focus,
                outlineOffset: 2,
              } as any)}
            >
              <View style={{ width: 28, minWidth: 28, maxWidth: 28, height: 28, borderRadius: radius.sm, borderWidth: 1.5, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: space.sm, flexShrink: 0 }} aria-hidden={true} importantForAccessibility="no">
                {on ? <Ionicons name="checkmark" size={18} color={c.onPrimary} aria-hidden={true} importantForAccessibility="no" /> : null}
              </View>
              <View style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
                <AppText style={{ color: on ? c.onAccentSoft : c.text, fontWeight: on ? '700' : '400', flexWrap: 'wrap', flexShrink: 1 }}>
                  {o.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}