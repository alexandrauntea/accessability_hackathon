import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'body' | 'small' | 'title' | 'h2' | 'muted';
export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { c, font, family } = useTheme();
  const size = variant === 'muted' ? font.small : font[variant];
  const heading = variant === 'title' || variant === 'h2';
  return (
    <Text
      {...rest}
      accessibilityRole={heading ? 'header' : rest.accessibilityRole}
      // aria-level gives screen readers a real heading outline on web
      {...(heading ? { 'aria-level': variant === 'title' ? 1 : 2 } : {})}
      style={[{ color: variant === 'muted' ? c.textMuted : c.text, fontSize: size, lineHeight: size * 1.5, fontFamily: family, fontWeight: heading ? '700' : '400' }, style]}
    />
  );
}
