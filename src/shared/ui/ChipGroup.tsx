import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, space } from '../theme/tokens';

/** Multi-select chips; selected state is announced, not only shown by colour. */
export function ChipGroup<T extends string>({ label, options, selected, onToggle }:
  { label: string; options: { value: T; label: string }[]; selected: T[]; onToggle: (v: T) => void }) {
  const { c, radius } = useTheme();
  return (
    <View accessibilityRole="list" accessibilityLabel={label} style={{ gap: space.xs }}>
      <AppText variant="h2">{label}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <Pressable key={o.value} onPress={() => onToggle(o.value)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={o.label}
              style={{ minHeight: MIN_TOUCH, paddingHorizontal: space.md, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 2, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : 'transparent' }}>
              <AppText style={{ color: on ? c.onPrimary : c.text }}>{on ? '✓ ' : ''}{o.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
