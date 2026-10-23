import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, space } from '../theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label = 'View selection',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  label?: string;
}) {
  const { c, radius } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        backgroundColor: c.accentSoft,
        borderRadius: radius.pill,
        padding: space.xs,
        borderWidth: 1,
        borderColor: c.border,
        alignSelf: 'center',
        maxWidth: 360,
        width: '100%',
      }}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${opt.label}${on ? ', selected' : ''}`}
            onPress={() => onChange(opt.value)}
            onKeyDown={(e: any) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault?.();
                onChange(opt.value);
              }
            }}
            style={(s: any) => ({
              flex: 1,
              minHeight: MIN_TOUCH - 8,
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
              borderRadius: radius.pill,
              backgroundColor: on ? c.accent : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.xs,
              cursor: 'pointer',
              outlineStyle: s.focused ? 'solid' : undefined,
              outlineWidth: s.focused ? 3 : 0,
              outlineColor: c.focus,
              outlineOffset: 2,
            } as any)}
          >
            {opt.icon ? (
              <Ionicons
                name={opt.icon}
                size={16}
                color={on ? c.onPrimary : c.onAccentSoft}
                aria-hidden={true}
                importantForAccessibility="no"
              />
            ) : null}
            <AppText
              style={{
                color: on ? c.onPrimary : c.onAccentSoft,
                fontWeight: on ? '700' : '600',
                fontSize: 14,
              }}
            >
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}