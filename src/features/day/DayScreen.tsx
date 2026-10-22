// Owner: Alexandra. Today's calendar + tasks, re-planned by AI around the check-in.
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { AiBadge, AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { planDay, breakdownTask, composeContribution } from '@/src/shared/api';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { todayISO, hhmm } from '@/src/shared/dates';
import { getTodayCheckin, listCheckins } from '@/src/features/checkin/checkinRepo';
import { getCalendar, setMockPersona } from '@/src/integrations/calendar';
import { getTasks, setMockTaskPersona } from '@/src/integrations/tasks';
import { config } from '@/src/shared/config';
import { useGoogleCalendarAuth } from './useGoogleCalendarAuth';
import { saveDayPlan, getDayPlan } from './dayRepo';
import { analyzeWeekPattern, WeekPatternAnalysis } from './weekPattern';
import type { CalendarEvent, Checkin, DayPlan, WorkTask } from '@/src/shared/types';

const ACTION_LABEL: Record<string, string> = {
  keep: 'Keep', move: 'Move', shorten: 'Shorten', make_async: 'Make async', split: 'Split', drop_today: 'Not today', add_break: 'Break', focus_block: 'Focus block',
};

export default function DayScreen() {
  const { profile } = useProfile();
  const feedback = useFeedback();
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [firstStep, setFirstStep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<WeekPatternAnalysis | null>(null);
  const [draftingMessage, setDraftingMessage] = useState(false);
  const [draftedMessage, setDraftedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMockPersona(profile?.demoPersona); setMockTaskPersona(profile?.demoPersona);
    const [c, e, t, saved, recentCheckins] = await Promise.all([
      getTodayCheckin(),
      getCalendar().getEvents(todayISO()),
      getTasks(),
      getDayPlan(todayISO()).catch(() => null),
      listCheckins(60).catch(() => []),
    ]);
    setCheckin(c); setEvents(e); setTasks(t);
    if (saved) setPlan(saved);

    // Load upcoming events for the next 5 days for the Week ahead card
    try {
      const upcomingDates = [1, 2, 3, 4, 5].map((i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return todayISO(d);
      });
      const upcomingEventsNested = await Promise.all(
        upcomingDates.map((dateStr) => getCalendar().getEvents(dateStr).catch(() => []))
      );
      const upcomingEvents = upcomingEventsNested.flat();
      const analysis = analyzeWeekPattern(recentCheckins, profile?.trackedMetrics ?? [], upcomingEvents);
      setPatternAnalysis(analysis);
    } catch {
      // Non-blocking
    }
  }, [profile?.demoPersona, profile?.trackedMetrics]);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));
  const google = useGoogleCalendarAuth(() => load());

  async function adapt(hardDay = false) {
    setBusy(true); setError(null);
    try {
      const p = await planDay({
        date: todayISO(),
        checkin,
        categories: profile?.categories ?? [],
        events,
        tasks,
        workHours: profile?.workHours ?? { start: '09:00', end: '17:30' },
        hardDay,
        weekdayPattern: patternAnalysis?.pattern,
      });
      setPlan(p);
      await saveDayPlan(p);
      await feedback.confirm();
    } catch (err) {
      console.error('Failed to adapt day:', err);
      setError('Could not adapt the day right now. Your original schedule is unchanged.');
    } finally {
      setBusy(false);
    }
  }

  async function starter(t: WorkTask) {
    const r = await breakdownTask({ task: t, capacity: checkin?.capacity ?? 'medium' });
    setFirstStep((prev) => ({ ...prev, [t.id]: r.firstStep }));
    await feedback.confirm();
  }

  async function handleDraftMoveMessage() {
    if (!patternAnalysis?.suggestion?.draftMessage) return;
    setDraftingMessage(true);
    try {
      const res = await composeContribution({
        draft: patternAnalysis.suggestion.draftMessage,
        mode: 'clarify',
        meetingTitle: patternAnalysis.suggestion.meetingTitle,
      });
      setDraftedMessage(res.text || res.spoken);
      await feedback.confirm();
    } catch {
      setDraftedMessage(patternAnalysis.suggestion.draftMessage);
    } finally {
      setDraftingMessage(false);
    }
  }

  const spoken = plan
    ? `Adapted plan: capacity ${checkin?.capacityScore ?? 'unknown'} of 10. ${plan.summary}`
    : `My day: ${events.length} meetings and ${tasks.length} tasks scheduled today.`;
  const showGoogle = Platform.OS === 'web' && !config.mockCalendar && google.ready;

  return (
    <Screen title="My day" speakText={spoken}>
      {!checkin ? <Card><AppText>Tip: do your check-in first so the plan matches your current capacity.</AppText></Card> : null}
      <View style={{ gap: 8 }}>
        <AppButton label="Adapt my day" hint="AI re-plans meetings and tasks around today's capacity" onPress={() => adapt(false)} busy={busy} />
        <AppButton kind="secondary" label="It's a hard day" hint="Fewer meetings, small clear tasks, messages drafted for you" onPress={() => adapt(true)} />
        {showGoogle ? <AppButton kind="secondary" label="Connect Google Calendar" onPress={google.connect} /> : null}
      </View>
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}

      {plan ? (
        <Card ai>
          <AppText variant="h2">Adapted plan (capacity {checkin?.capacityScore ?? '?'}/10{plan.mode === 'hard_day' ? ', hard-day mode' : ''})</AppText>
          {plan.notificationLevel === 'reduced' ? <AppText>Notifications reduced for today: only messages from your manager and meeting reminders.</AppText> : null}
          <AiBadge why="Based on today's check-in capacity, calendar events and tasks" />
          <AppText>{plan.summary}</AppText>
          {plan.items.map((i) => (
            <View
              key={i.id}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${i.start ? i.start + ' to ' + i.end + ', ' : ''}${i.title}. Action: ${ACTION_LABEL[i.action] ?? i.action}. Why: ${i.reason}${i.firstStep ? '. First step: ' + i.firstStep : ''}`}
              style={{ gap: 2, paddingVertical: 6 }}
            >
              <AppText style={{ fontWeight: '700' }}>
                {i.start ? `${i.start}–${i.end} · ` : ''}{i.title} — {ACTION_LABEL[i.action] ?? i.action}
              </AppText>
              <AppText variant="muted">Why: {i.reason}</AppText>
              {i.firstStep ? (
                <View style={{ gap: 4, marginTop: 2 }}>
                  <AiBadge why="5-minute starter step for task initiation" />
                  <AppText>First 5 minutes: {i.firstStep}</AppText>
                </View>
              ) : null}
            </View>
          ))}
          {plan.suggestedMessages?.map((m, k) => (
            <View key={k} style={{ marginTop: 4, paddingVertical: 4 }}>
              <AppText variant="muted">Draft {m.channel} to {m.to}:</AppText>
              <AppText style={{ fontStyle: 'italic' }}>“{m.text}”</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Week ahead capacity card */}
      <Card>
        <AppText variant="h2">Week ahead</AppText>
        {!patternAnalysis || !patternAnalysis.hasEnoughData ? (
          <AppText variant="muted">Not enough data yet (need 2 weeks)</AppText>
        ) : patternAnalysis.suggestion ? (
          <View style={{ gap: 8 }}>
            <AppText>{patternAnalysis.suggestion.text}</AppText>
            {patternAnalysis.suggestion.meetingTitle ? (
              <AppButton
                kind="secondary"
                label={draftingMessage ? 'Drafting message...' : 'Draft a message'}
                hint="AI drafts a polite message to reschedule meeting"
                accessibilityLabel="Draft a message to reschedule meeting with AI"
                onPress={handleDraftMoveMessage}
                disabled={draftingMessage}
              />
            ) : null}
            {draftedMessage ? (
              <View style={{ gap: 8, marginTop: 4, padding: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                <AiBadge why="Drafted with AI clarify mode to propose rescheduling without disclosing health details" />
                <AppText style={{ fontStyle: 'italic' }}>“{draftedMessage}”</AppText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <AppButton
                    kind="secondary"
                    label="Copy message"
                    accessibilityLabel="Copy drafted message to clipboard"
                    onPress={async () => {
                      await Clipboard.setStringAsync(draftedMessage);
                      await feedback.confirm();
                    }}
                  />
                  <AppButton
                    kind="secondary"
                    label="Open in Speak for me"
                    accessibilityLabel="Open this meeting in Speak for me"
                    onPress={() => router.push({ pathname: '/speak', params: { meeting: patternAnalysis.suggestion?.meetingTitle } })}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <AppText variant="muted">Your capacity is evenly distributed this week with no low-energy bottlenecks.</AppText>
        )}
      </Card>

      <Card>
        <AppText variant="h2">Calendar ({getCalendar().name})</AppText>
        {events.map((e) => (
          <View key={e.id} style={{ gap: 4, paddingVertical: 4 }}>
            <AppText>{hhmm(e.start)}–{hhmm(e.end)} · {e.title}{e.movable ? '' : ' (fixed)'}</AppText>
            <AppButton
              kind="secondary"
              label="Speak for me here"
              accessibilityLabel={`Prepare a contribution for ${e.title}`}
              onPress={() => router.push({ pathname: '/speak', params: { meeting: e.title } })}
            />
          </View>
        ))}
      </Card>

      <Card>
        <AppText variant="h2">Tasks</AppText>
        {tasks.map((t) => (
          <View key={t.id} style={{ gap: 4, paddingVertical: 4 }}>
            <AppText>{t.id} · {t.title} ({t.status}{t.daysInStatus ? `, ${t.daysInStatus} days` : ''})</AppText>
            {firstStep[t.id] ? (
              <View style={{ gap: 4 }}>
                <AiBadge why="5-minute starter step for task initiation" />
                <AppText>First step: {firstStep[t.id]}</AppText>
              </View>
            ) : (
              <AppButton
                kind="secondary"
                label="Help me start"
                accessibilityLabel={`Help me start ${t.title}`}
                onPress={() => starter(t)}
              />
            )}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
