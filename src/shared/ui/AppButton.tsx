import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, space } from '../theme/tokens';

interface Props extends PressableProps { label: string; hint?: string; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean }

/** Every button: role, label, hint, 48px target, visible focus ring for keyboard users. */
export function AppButton({ label, hint, kind = 'primary', busy, disabled, style, ...rest }: Props) {
  const { c, radius } = useTheme();
  const filled = kind !== 'secondary';
  const bg = kind === 'danger' ? c.danger : kind === 'primary' ? c.primary : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled || busy, busy }}
      disabled={disabled || busy}
      onKeyDown={(e: any) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault?.();
          if (!disabled && !busy && rest.onPress) {
            rest.onPress(e);
          }
        }
        (rest as any).onKeyDown?.(e);
      }}
      style={(state: any) => [{
        minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, paddingHorizontal: space.md, paddingVertical: space.sm,
        borderRadius: radius.sm, backgroundColor: bg, borderWidth: 2, borderColor: filled ? bg : c.border,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1,
        cursor: disabled || busy ? 'default' : 'pointer',
        outlineStyle: state.focused ? 'solid' : undefined, outlineWidth: state.focused ? 3 : 0, outlineColor: c.focus, outlineOffset: 2,
      } as any, typeof style === 'function' ? style(state) : style]}
      {...rest}
    >
      <AppText style={{ color: filled ? c.onPrimary : c.text, fontWeight: '700' }}>{busy ? 'Working…' : label}</AppText>
    </Pressable>
  );
}