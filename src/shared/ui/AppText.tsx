import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'body' | 'small' | 'title' | 'h2' | 'muted';
export function AppText({ variant = 'body', style, readable, ...rest }: TextProps & { variant?: Variant; readable?: boolean }) {
  const { c, font, family, layout } = useTheme();
  const size = variant === 'muted' ? font.small : font[variant];
  const heading = variant === 'title' || variant === 'h2';
  return (
    <Text
      {...rest}
      accessibilityRole={heading ? 'header' : rest.accessibilityRole}
      {...(heading ? { 'aria-level': variant === 'title' ? 1 : 2 } : {})}
      style={[
        {
          color: variant === 'muted' ? c.textMuted : c.text,
          fontSize: size,
          lineHeight: Math.round(size * 1.5),
          fontFamily: family,
          fontWeight: variant === 'title' ? '700' : variant === 'h2' ? '600' : '400',
          fontStyle: 'normal',
          ...(readable ? { maxWidth: layout.maxWidth.reading } : {}),
        },
        style,
      ]}
    />
  );
}