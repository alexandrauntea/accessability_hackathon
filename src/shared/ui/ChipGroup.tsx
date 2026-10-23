import React from 'react';
import { Pressable, View } from 'react-native';
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
    <View accessibilityRole="list" accessibilityLabel={label} style={{ gap: space.xs }}>
      <AppText variant="h2">{label}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
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
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.label}, ${on ? 'checked' : 'not checked'}`}
              style={(s: any) => ({
                minHeight: MIN_TOUCH,
                minWidth: MIN_TOUCH,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                justifyContent: 'center',
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
              <AppText
                style={{
                  color: on ? c.onAccentSoft : c.text,
                  fontWeight: on ? '700' : '400',
                }}
              >
                {on ? '✓ ' : ''}
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}