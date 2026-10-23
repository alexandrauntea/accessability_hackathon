import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type BadgeKind = 'accent' | 'success' | 'warning' | 'error' | 'neutral';

export function StatCard({
  icon,
  value,
  label,
  badgeText,
  badgeKind = 'accent',
  style,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  badgeText?: string;
  badgeKind?: BadgeKind;
  style?: ViewStyle;
}) {
  const { c, radius, a11y } = useTheme();
  const isPlain = a11y.highContrast || a11y.lowSensory;

  const bgBadge =
    badgeKind === 'success'
      ? c.successSoft
      : badgeKind === 'warning'
      ? c.warningSoft
      : badgeKind === 'error'
      ? c.errorSoft
      : badgeKind === 'neutral'
      ? c.surface
      : c.accentSoft;

  const textBadge =
    badgeKind === 'success'
      ? c.successText
      : badgeKind === 'warning'
      ? c.warningText
      : badgeKind === 'error'
      ? c.errorText
      : badgeKind === 'neutral'
      ? c.textMuted
      : c.onAccentSoft;

  const iconColor =
    badgeKind === 'warning'
      ? c.warningText
      : badgeKind === 'error'
      ? c.errorText
      : badgeKind === 'success'
      ? c.successText
      : c.accent;

  const spoken = `${label}: ${value}${badgeText ? `, ${badgeText}` : ''}`;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={spoken}
      style={[
        {
          flex: 1,
          minWidth: 100,
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: space.md,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.xs,
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
    >
      <Ionicons name={icon} size={22} color={iconColor} aria-hidden={true} importantForAccessibility="no" />
      <AppText
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: c.text,
          textAlign: 'center',
        }}
      >
        {value}
      </AppText>
      <AppText
        variant="small"
        style={{
          color: c.textMuted,
          textAlign: 'center',
          fontWeight: '500',
        }}
      >
        {label}
      </AppText>
      {badgeText ? (
        <View
          style={{
            paddingHorizontal: space.sm,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: bgBadge,
            borderWidth: 1,
            borderColor: textBadge,
            marginTop: 2,
          }}
        >
          <AppText
            variant="small"
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: textBadge,
              textAlign: 'center',
            }}
          >
            {badgeText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}