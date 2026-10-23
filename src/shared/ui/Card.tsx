import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

export function Card({ style, ai, ...rest }: ViewProps & { ai?: boolean }) {
  const { c, radius, a11y } = useTheme();
  const isPlain = a11y.highContrast || a11y.lowSensory;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: ai ? c.accentSoft : c.surface,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: space.cardPadding,
          gap: space.cardInnerGap,
          ...(isPlain
            ? {}
            : {
                shadowColor: '#1F1A2E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }),
        },
        style,
      ]}
    />
  );
}