// Owner: Andreea. Capacity by weekday + per-metric comparison. Bars are decorative; every value is also text.
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { space } from '@/src/shared/theme/tokens';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { METRICS } from '@/src/shared/metrics';
import { listCheckins } from '@/src/features/checkin/checkinRepo';
import { DemoPersonaPicker } from '@/src/features/checkin/seedDemo';
import { buildInsightsSpeakText, computeStats, findLowestWeekday, overloadSignal } from './stats';
import type { Stats } from '@/src/shared/types';

const DEMO_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO_TOOLS === 'true';

export default function InsightsScreen() {
  const { c, radius, motion } = useTheme();
  const { profile } = useProfile();
  const [stats, setStats] = useState<Stats | null>(null);

  const refreshStats = useCallback(() => {
    listCheckins(60)
      .then((cs) => setStats(computeStats(cs, profile?.trackedMetrics ?? [])))
      .catch(() => {});
  }, [profile?.trackedMetrics?.join()]);

  useFocusEffect(refreshStats);

  if (!stats) {
    return (
      <Screen title="Insights">
        <AppText>Loading…</AppText>
      </Screen>
    );
  }

  // Fewer than 14 check-ins gate
  if (stats.days < 14) {
    const gateSpoken = `Not enough data yet (need 2 weeks). You have ${stats.days} check-in${stats.days === 1 ? '' : 's'} recorded. You need at least 14 check-ins to see patterns.`;
    return (
      <Screen title="Insights" speakText={gateSpoken}>
        <Card>
          <AppText variant="h2">Not enough data yet (need 2 weeks)</AppText>
          <AppText>
            You have {stats.days} {stats.days === 1 ? 'check-in' : 'check-ins'} recorded. You need at least 2 weeks of check-ins (14 days) to uncover capacity and symptom patterns.
          </AppText>
          <AppButton label="Check in today" hint="Go to check-in screen" onPress={() => router.push('/checkin')} />
        </Card>
        {DEMO_TOOLS ? <DemoPersonaPicker onSeeded={refreshStats} /> : null}
      </Screen>
    );
  }

  const lowest = findLowestWeekday(stats.byWeekday);
  const signal = overloadSignal(stats);
  const spoken = buildInsightsSpeakText(stats);

  return (
    <Screen title="Insights" speakText={spoken}>
      <Card>
        <AppText variant="body">{spoken}</AppText>
      </Card>

      {signal ? (
        <Card>
          <AppText variant="h2">Early overload signal</AppText>
          <AppText>{signal}</AppText>
          <AppButton kind="secondary" label="Draft a workload request" onPress={() => router.push('/support')} />
        </Card>
      ) : null}

      <Card>
        <AppText variant="h2">Daily capacity by weekday (average, 1–10)</AppText>
        <View accessibilityRole="list" style={{ gap: space.md }}>
          {stats.byWeekday.map((d) => {
            const isLowest = lowest !== null && d.n > 0 && d.weekday === lowest.weekday;
            const hasData = d.n > 0;
            const textValue = hasData
              ? `${d.label}: average ${d.avgCapacity} of 10`
              : `${d.label}: no check-ins yet`;
            const barPercent = hasData ? Math.min(100, Math.max(0, d.avgCapacity * 10)) : 0;
            const a11yLabel = hasData
              ? `${d.label}: average ${d.avgCapacity} of 10${isLowest ? ', lowest day' : ''}, based on ${d.n} check-in${d.n === 1 ? '' : 's'}`
              : `${d.label}: no check-ins yet`;

            return (
              <View
                key={d.weekday}
                accessible
                accessibilityRole="text"
                accessibilityLabel={a11yLabel}
                style={{ gap: space.xs }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: space.xs,
                  }}
                >
                  <AppText style={{ fontWeight: isLowest ? '700' : '400' }}>
                    {textValue}
                    {isLowest ? ' (lowest)' : ''}
                  </AppText>
                  {isLowest ? (
                    <View
                      style={{
                        paddingHorizontal: space.sm,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: radius.sm,
                        backgroundColor: c.surface,
                      }}
                    >
                      <AppText variant="small" style={{ fontWeight: '700' }}>
                        lowest
                      </AppText>
                    </View>
                  ) : null}
                </View>

                <View
                  aria-hidden={true}
                  importantForAccessibility="no"
                  style={{
                    height: 16,
                    width: '100%',
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderWidth: 1,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                  }}
                >
                  {hasData ? (
                    <View
                      style={{
                        height: '100%',
                        width: `${barPercent}%`,
                        backgroundColor: isLowest ? c.warn : c.primary,
                        borderRadius: radius.sm,
                        ...(motion && Platform.OS === 'web'
                          ? ({ transition: 'width 0.3s ease-in-out' } as any)
                          : {}),
                      }}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <AppText variant="h2">Last 7 days vs previous 7 days</AppText>
        <View
          accessible
          accessibilityLabel={`Overall capacity: last 7 days average ${stats.last7.avgCapacity} of 10, previous 7 days average ${stats.prev7.avgCapacity} of 10`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: space.xs,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
            flexWrap: 'wrap',
            gap: space.xs,
          }}
        >
          <AppText style={{ fontWeight: '600' }}>Daily capacity</AppText>
          <AppText>
            {stats.last7.avgCapacity} of 10{' '}
            <AppText variant="muted">(was {stats.prev7.avgCapacity} of 10)</AppText>
          </AppText>
        </View>

        {stats.tracked.map((k) => {
          const m = METRICS[k];
          const lastVal = stats.last7.avg[k];
          const prevVal = stats.prev7.avg[k];
          const label = m?.label ?? k;
          return (
            <View
              key={k}
              accessible
              accessibilityLabel={`${label}: last 7 days average ${typeof lastVal === 'number' ? lastVal : 'no data'} of 10, previous 7 days average ${typeof prevVal === 'number' ? prevVal : 'no data'} of 10`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: space.xs,
                flexWrap: 'wrap',
                gap: space.xs,
              }}
            >
              <AppText>{label}</AppText>
              <AppText>
                {typeof lastVal === 'number' ? `${lastVal} of 10` : '—'}{' '}
                <AppText variant="muted">
                  (was {typeof prevVal === 'number' ? `${prevVal} of 10` : '—'})
                </AppText>
              </AppText>
            </View>
          );
        })}

        {typeof stats.last7.lateNights === 'number' ? (
          <View
            accessible
            accessibilityLabel={`Late nights: worked after 8 pm on ${stats.last7.lateNights} of the last 7 workdays`}
            style={{ paddingTop: space.xs, borderTopWidth: 1, borderTopColor: c.border }}
          >
            <AppText variant="muted">
              Worked after 8 pm: {stats.last7.lateNights} of the last 7 workdays
            </AppText>
          </View>
        ) : null}

        {typeof stats.sleepCapacityCorrelation === 'number' ? (
          <View
            accessible
            accessibilityLabel={`Sleep and capacity correlation: ${stats.sleepCapacityCorrelation}`}
            style={{ paddingTop: space.xs }}
          >
            <AppText variant="muted">
              Sleep & capacity correlation: {stats.sleepCapacityCorrelation > 0 ? `+${stats.sleepCapacityCorrelation}` : stats.sleepCapacityCorrelation}
            </AppText>
          </View>
        ) : null}
      </Card>

      {DEMO_TOOLS ? <DemoPersonaPicker onSeeded={refreshStats} /> : null}
    </Screen>
  );
}
