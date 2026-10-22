// Owner: Andreea. Capacity by weekday + per-metric comparison. Bars are decorative; every value is also text.
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { METRICS } from '@/src/shared/metrics';
import { listCheckins } from '@/src/features/checkin/checkinRepo';
import { computeStats, overloadSignal } from './stats';
import type { Stats } from '@/src/shared/types';

export default function InsightsScreen() {
  const { c } = useTheme();
  const { profile } = useProfile();
  const [stats, setStats] = useState<Stats | null>(null);
  useFocusEffect(useCallback(() => {
    listCheckins(60).then((cs) => setStats(computeStats(cs, profile?.trackedMetrics ?? []))).catch(() => {});
  }, [profile?.trackedMetrics?.join()]));

  if (!stats) return <Screen title="Insights"><AppText>Loading…</AppText></Screen>;
  const days = stats.byWeekday.filter((d) => d.n > 0);
  const worst = [...days].sort((a, b) => a.avgCapacity - b.avgCapacity)[0];
  const best = [...days].sort((a, b) => b.avgCapacity - a.avgCapacity)[0];
  const signal = overloadSignal(stats);
  const spoken = worst && best
    ? `Over ${stats.days} check-ins, capacity is lowest on ${worst.label}s, ${worst.avgCapacity} of 10, and highest on ${best.label}s, ${best.avgCapacity} of 10.`
    : 'Not enough check-ins yet.';

  return (
    <Screen title="Insights" speakText={spoken}>
      <AppText>{spoken}</AppText>
      {signal ? (
        <Card>
          <AppText variant="h2">Early overload signal</AppText>
          <AppText>{signal}</AppText>
          <AppButton kind="secondary" label="Draft a workload request" onPress={() => router.push('/support')} />
        </Card>
      ) : null}
      <Card>
        <AppText variant="h2">Daily capacity by weekday (average, 1–10)</AppText>
        {stats.byWeekday.map((d) => (
          <View key={d.weekday} accessible accessibilityLabel={`${d.label}: capacity ${d.avgCapacity} of 10, from ${d.n} check-ins`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText style={{ width: 56 }}>{d.label.slice(0, 3)}</AppText>
            <View style={{ height: 20, width: `${d.avgCapacity * 6.5}%`, backgroundColor: c.primary }} />
            <AppText>{d.avgCapacity}</AppText>
          </View>
        ))}
      </Card>
      <Card>
        <AppText variant="h2">Last 7 check-ins vs the 7 before</AppText>
        <AppText>Capacity {stats.last7.avgCapacity} (was {stats.prev7.avgCapacity})</AppText>
        {stats.tracked.map((k) => <AppText key={k}>{METRICS[k].label} {stats.last7.avg[k]} (was {stats.prev7.avg[k]})</AppText>)}
        <AppText>Worked after 8 pm: {stats.last7.lateNights} of the last 7</AppText>
      </Card>
    </Screen>
  );
}
