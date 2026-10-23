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
import { TutorialModal } from '@/src/features/help/TutorialScreen';
import type { Checkin, MetricKey, StateSummary } from '@/src/shared/types';

const DEMO_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEMO_TOOLS === 'true';

export default function TodayScreen() {
  const { profile } = useProfile();
  const [today, setToday] = useState<Checkin | null>(null);
  const [summary, setSummary] = useState<StateSummary | null>(null);
  const [signal, setSignal] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(() => {
    getTodayCheckin().then(setToday).catch(() => {});
    listCheckins(14)
      .then((recent) => {
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
      let result;
      try {
        result = await summarizeState({
          date: todayISO(),
          stats: computed,
          recent: recent.slice(0, 7),
          simpleLanguage: !!profile?.a11y?.simpleLanguage,
        });
      } catch (err) {
        console.warn('Falling back to deterministic state summary:', err);
        const worstDay = [...(computed.byWeekday ?? [])].filter((d) => d.n > 0).sort((a, b) => a.avgCapacity - b.avgCapacity)[0];
        const bestDay = [...(computed.byWeekday ?? [])].filter((d) => d.n > 0).sort((a, b) => b.avgCapacity - a.avgCapacity)[0];
        const patterns: string[] = [];

        if (worstDay && bestDay && worstDay.weekday !== bestDay.weekday) {
          patterns.push(`Capacity averages ${worstDay.avgCapacity} on ${worstDay.label}s versus ${bestDay.avgCapacity} on ${bestDay.label}s.`);
        }
        if (computed.last7 && computed.prev7 && computed.prev7.avgCapacity > 0) {
          patterns.push(`Average capacity over the last 7 workdays was ${computed.last7.avgCapacity} (compared to ${computed.prev7.avgCapacity} previously).`);
        }

        const suggestions = [
          'Place demanding tasks during your higher-capacity days.',
          'Keep meetings shorter and request asynchronous updates on lower-energy days.',
        ];

        const sig = overloadSignal(computed);

        result = {
          date: todayISO(),
          headline: computed.days > 0
            ? `Recent capacity averages ${computed.last7?.avgCapacity || 5} of 10.`
            : 'Welcome to VibeCheck.',
          summary: computed.days >= 7
            ? `Over ${computed.days} recorded check-ins, your daily capacity shows identifiable weekly patterns.`
            : 'Complete daily check-ins to build personalized weekly energy patterns.',
          patterns: patterns.length ? patterns : ['Regular check-ins build a personal map of your energy rhythms.'],
          suggestions,
          overloadSignal: sig ?? undefined,
          generatedBy: 'ai' as const,
          model: 'fallback-deterministic',
        };
      }
      setSummary(result);
    } catch (e: any) {
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
        hint="Open instructions pop-up with tutorial steps"
        onPress={() => setShowTutorial(true)}
      />

      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />

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