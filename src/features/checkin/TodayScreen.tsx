// Owner: Andreea. Home: today's capacity, AI summary of the state, entry to check-in and "speak for me".
import React, { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { summarizeState } from '@/src/shared/api';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { todayISO } from '@/src/shared/dates';
import { METRICS, CAPACITY_ANCHORS, anchorFor } from '@/src/shared/metrics';
import { computeStats, overloadSignal } from '@/src/features/insights/stats';
import { getTodayCheckin, listCheckins } from './checkinRepo';
import { DemoPersonaPicker } from './seedDemo';
import type { Checkin, MetricKey, StateSummary } from '@/src/shared/types';

const DEMO_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO_TOOLS === 'true';

export default function TodayScreen() {
  const { profile } = useProfile();
  const [today, setToday] = useState<Checkin | null>(null);
  const [summary, setSummary] = useState<StateSummary | null>(null);
  const [signal, setSignal] = useState<string | null>(null);
  const [totalCheckins, setTotalCheckins] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(() => {
    getTodayCheckin().then(setToday).catch(() => {});
    listCheckins(14)
      .then((recent) => {
        setTotalCheckins(recent.length);
        const computed = computeStats(recent, profile?.trackedMetrics ?? []);
        setSignal(overloadSignal(computed));
      })
      .catch(() => {});
  }, [profile?.trackedMetrics?.join()]);

  useFocusEffect(refreshToday);

  async function summarize() {
    setBusy(true);
    setError(null);
    try {
      const recent = await listCheckins(42);
      const computed = computeStats(recent, profile?.trackedMetrics ?? []);
      const result = await summarizeState({
        date: todayISO(),
        stats: computed,
        recent: recent.slice(0, 7),
        simpleLanguage: !!profile?.a11y?.simpleLanguage,
      });
      setSummary(result);
    } catch {
      setError('The summary is not available right now. Your data is safe; try again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  const metricsLine = today
    ? (Object.keys(today.metrics) as MetricKey[])
        .filter((k) => typeof today.metrics[k] === 'number')
        .map((k) => `${METRICS[k]?.label ?? k} ${today.metrics[k]}/10`)
        .join(' · ')
    : '';

  const spoken = today
    ? `Daily capacity ${today.capacityScore} of 10. ${metricsLine}.${signal ? ` Warning: ${signal}` : ''} ${summary?.headline ?? ''}`
    : 'No check-in yet today. Rate your scales in about 10 seconds.';

  return (
    <Screen title={profile?.displayName ? `Today, ${profile.displayName}` : 'Today'} speakText={spoken}>
      {totalCheckins === 0 ? (
        <Card>
          <AppText variant="h2">New here? See how VibeCheck works (1 minute)</AppText>
          <AppText>
            Take a quick 1-minute tour of your 10-second check-in, daily capacity score, and privacy.
          </AppText>
          <AppButton
            label="See how VibeCheck works"
            hint="Open the 1-minute interactive tutorial"
            onPress={() => router.push('/tutorial')}
          />
        </Card>
      ) : null}

      {!today ? (
        <Card>
          <AppText variant="h2">Daily check-in: about 10 seconds</AppText>
          <AppText>Rate {profile?.trackedMetrics?.length ?? 2} scales or say one sentence. Your workday adapts to it.</AppText>
          <AppButton label="Check in now" hint="Rate your personal scales for today" onPress={() => router.push('/checkin')} />
        </Card>
      ) : (
        <Card>
          <AppText variant="h2">Daily capacity: {today.capacityScore} of 10</AppText>
          <AppText>{anchorFor({ anchors: CAPACITY_ANCHORS }, today.capacityScore)}</AppText>
          {metricsLine ? <AppText variant="muted">{metricsLine}</AppText> : null}
          <AppButton label="Adapt my day to this" hint="View your AI-adapted schedule and tasks" onPress={() => router.push('/day')} />
          <AppButton kind="secondary" label="Update check-in" hint="Adjust your ratings for today" onPress={() => router.push('/checkin')} />
        </Card>
      )}

      {signal ? (
        <Card>
          <AppText variant="h2">Workload pacing warning</AppText>
          <AppText>{signal}</AppText>
          <AppButton
            kind="secondary"
            label="Talk about workload"
            hint="Draft an accommodation or workload redistribution request in Support"
            onPress={() => router.push('/support')}
          />
        </Card>
      ) : null}

      <AppButton
        kind="secondary"
        label="Speak for me in a meeting"
        hint="Write or build your contribution; VibeCheck reads it aloud and copies it for the meeting chat"
        onPress={() => router.push('/speak')}
      />

      <Card ai>
        <AppText variant="h2">Summary of your recent weeks</AppText>
        {summary ? (
          <>
            <AiBadge why="Based on your last 6 weeks of check-ins; numbers computed by the app" />
            <AppText style={{ fontWeight: '700' }}>{summary.headline}</AppText>
            <AppText>{summary.summary}</AppText>
            {summary.patterns.map((p) => (
              <AppText key={p}>• {p}</AppText>
            ))}
            {summary.overloadSignal ? (
              <AppText style={{ fontWeight: '700' }}>Signal: {summary.overloadSignal}</AppText>
            ) : null}
          </>
        ) : (
          <AppText variant="muted">Get an AI-grounded summary of patterns across your recent weeks.</AppText>
        )}
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        <AppButton
          label={summary ? 'Refresh summary' : 'Summarise my recent weeks'}
          hint="Calculates patterns across your check-in history"
          onPress={summarize}
          busy={busy}
        />
      </Card>

      <AppButton
        kind="secondary"
        label="How to use VibeCheck"
        hint="Open the 1-minute guide to VibeCheck"
        onPress={() => router.push('/tutorial')}
      />

      {DEMO_TOOLS ? (
        <DemoPersonaPicker
          onSeeded={() => {
            refreshToday();
            summarize();
          }}
        />
      ) : null}
    </Screen>
  );
}