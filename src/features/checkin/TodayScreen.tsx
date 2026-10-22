// Owner: Andreea. Home: today's capacity, AI summary of the state, entry to check-in and "speak for me".
import React, { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { summarizeState } from '@/src/shared/api';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { todayISO } from '@/src/shared/dates';
import { METRICS, CAPACITY_ANCHORS, anchorFor } from '@/src/shared/metrics';
import { computeStats } from '@/src/features/insights/stats';
import { getTodayCheckin, listCheckins } from './checkinRepo';
import { DemoPersonaPicker } from './seedDemo';
import type { Checkin, MetricKey, StateSummary } from '@/src/shared/types';

const DEMO_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO_TOOLS === 'true';

export default function TodayScreen() {
  const { profile } = useProfile();
  const [today, setToday] = useState<Checkin | null>(null);
  const [summary, setSummary] = useState<StateSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { getTodayCheckin().then(setToday).catch(() => {}); }, []));

  async function summarize() {
    setBusy(true); setError(null);
    try {
      const recent = await listCheckins(42);
      setSummary(await summarizeState({ date: todayISO(), stats: computeStats(recent, profile?.trackedMetrics ?? []), recent: recent.slice(0, 7), simpleLanguage: !!profile?.a11y?.simpleLanguage }));
    } catch { setError('The summary is not available right now. Your data is safe; try again in a minute.'); }
    finally { setBusy(false); }
  }

  const metricsLine = today ? (Object.keys(today.metrics) as MetricKey[]).map((k) => `${METRICS[k].label} ${today.metrics[k]}/10`).join(' · ') : '';
  const spoken = today ? `Daily capacity ${today.capacityScore} of 10. ${metricsLine}. ${summary?.headline ?? ''}` : 'No check-in yet today.';

  return (
    <Screen title={profile?.displayName ? `Today, ${profile.displayName}` : 'Today'} speakText={spoken}>
      {!today ? (
        <Card>
          <AppText variant="h2">Check-in: about 10 seconds</AppText>
          <AppText>Rate {profile?.trackedMetrics?.length ?? 2} scales or say one sentence. The day plan adapts to it.</AppText>
          <AppButton label="Check in now" onPress={() => router.push('/checkin')} />
        </Card>
      ) : (
        <Card>
          <AppText variant="h2">Daily capacity: {today.capacityScore}/10</AppText>
          <AppText>{anchorFor({ anchors: CAPACITY_ANCHORS }, today.capacityScore)}</AppText>
          <AppText variant="muted">{metricsLine}</AppText>
          <AppButton label="Adapt my day to this" onPress={() => router.push('/day')} />
          <AppButton kind="secondary" label="Update check-in" onPress={() => router.push('/checkin')} />
        </Card>
      )}

      <AppButton kind="secondary" label="Speak for me in a meeting" hint="Write or build your contribution; VibeCheck reads it aloud and copies it for the meeting chat" onPress={() => router.push('/speak')} />

      <Card ai>
        <AppText variant="h2">Patterns in my recent check-ins</AppText>
        {summary ? (
          <>
            <AiBadge why="explains statistics computed from your last 6 weeks" />
            <AppText style={{ fontWeight: '700' }}>{summary.headline}</AppText>
            <AppText>{summary.summary}</AppText>
            {summary.patterns.map((p) => <AppText key={p}>- {p}</AppText>)}
            {summary.overloadSignal ? <AppText style={{ fontWeight: '700' }}>Signal: {summary.overloadSignal}</AppText> : null}
          </>
        ) : <AppText variant="muted">Get a short summary of your recent check-ins.</AppText>}
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        <AppButton label={summary ? 'Refresh summary' : 'Summarise my recent weeks'} onPress={summarize} busy={busy} />
      </Card>

      {DEMO_TOOLS ? <DemoPersonaPicker /> : null}
    </Screen>
  );
}
