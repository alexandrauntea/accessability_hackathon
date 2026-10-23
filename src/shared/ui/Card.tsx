import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { useCardGrid } from './Screen';

export function Card({ style, ai, fullWidth = false, ...rest }: ViewProps & { ai?: boolean; fullWidth?: boolean }) {
  const inGrid = useCardGrid();
  const isGridItem = Boolean(inGrid && !fullWidth);
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
          width: isGridItem ? undefined : '100%',
          flexBasis: isGridItem ? '48%' : 'auto',
          flexGrow: isGridItem ? 1 : 0,
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
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