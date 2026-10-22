import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

export function Card({ style, ai, ...rest }: ViewProps & { ai?: boolean }) {
  const { c, radius } = useTheme();
  return <View {...rest} style={[{ backgroundColor: ai ? c.aiTint : c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.sm }, style]} />;
}
