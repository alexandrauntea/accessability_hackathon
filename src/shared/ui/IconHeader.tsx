import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function IconHeader({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
}) {
  const { c, layout } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons name={icon} size={20} color={c.accent} aria-hidden={true} importantForAccessibility="no" />
        <AppText variant="h2" style={{ fontWeight: '700' }}>
          {title}
        </AppText>
      </View>
      {subtitle ? <AppText variant="muted" style={{ maxWidth: layout.maxWidth.reading }}>{subtitle}</AppText> : null}
    </View>
  );
}