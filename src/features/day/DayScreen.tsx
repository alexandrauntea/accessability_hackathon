// Owner: Alexandra. Today's calendar + tasks, re-planned by AI around the check-in.
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { planDay, breakdownTask } from '@/src/shared/api';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { todayISO, hhmm } from '@/src/shared/dates';
import { getTodayCheckin } from '@/src/features/checkin/checkinRepo';
import { getCalendar, setMockPersona } from '@/src/integrations/calendar';
import { getTasks, setMockTaskPersona } from '@/src/integrations/tasks';
import { config } from '@/src/shared/config';
import { useGoogleCalendarAuth } from './useGoogleCalendarAuth';
import { saveDayPlan } from './dayRepo';
import type { CalendarEvent, Checkin, DayPlan, WorkTask } from '@/src/shared/types';

const ACTION_LABEL: Record<string, string> = {
  keep: 'Keep', move: 'Move', shorten: 'Shorten', make_async: 'Make async', split: 'Split', drop_today: 'Not today', add_break: 'Break', focus_block: 'Focus block',
};

export default function DayScreen() {
  const { profile } = useProfile();
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [firstStep, setFirstStep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMockPersona(profile?.demoPersona); setMockTaskPersona(profile?.demoPersona);
    const [c, e, t] = await Promise.all([getTodayCheckin(), getCalendar().getEvents(todayISO()), getTasks()]);
    setCheckin(c); setEvents(e); setTasks(t);
  }, [profile?.demoPersona]);
  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));
  const google = useGoogleCalendarAuth(() => load());

  async function adapt(hardDay = false) {
    setBusy(true); setError(null);
    try {
      const p = await planDay({ date: todayISO(), checkin, categories: profile?.categories ?? [], events, tasks, workHours: profile?.workHours ?? { start: '09:00', end: '17:30' }, hardDay });
      setPlan(p); await saveDayPlan(p);
    } catch { setError('Could not adapt the day right now. Your original schedule is unchanged.'); }
    finally { setBusy(false); }
  }

  async function starter(t: WorkTask) {
    const r = await breakdownTask({ task: t, capacity: checkin?.capacity ?? 'medium' });
    setFirstStep({ ...firstStep, [t.id]: r.firstStep });
  }

  const spoken = plan ? plan.summary : `You have ${events.length} meetings and ${tasks.length} tasks today.`;
  const showGoogle = Platform.OS === 'web' && !config.mockCalendar && google.ready;

  return (
    <Screen title="My day" speakText={spoken}>
      {!checkin ? <Card><AppText>Tip: do your check-in first so the plan matches how you feel.</AppText></Card> : null}
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
          <AiBadge why="based on today's check-in, calendar and tasks" />
          <AppText>{plan.summary}</AppText>
          {plan.items.map((i) => (
            <View key={i.id} accessible accessibilityLabel={`${i.start ?? ''} ${i.title}. ${ACTION_LABEL[i.action]}. Why: ${i.reason}`} style={{ gap: 2, paddingVertical: 6 }}>
              <AppText style={{ fontWeight: '700' }}>{i.start ? `${i.start}–${i.end} · ` : ''}{i.title} — {ACTION_LABEL[i.action]}</AppText>
              <AppText variant="muted">Why: {i.reason}</AppText>
              {i.firstStep ? <AppText>First 5 minutes: {i.firstStep}</AppText> : null}
            </View>
          ))}
          {plan.suggestedMessages?.map((m, k) => <AppText key={k}>Draft {m.channel} to {m.to}: “{m.text}”</AppText>)}
        </Card>
      ) : null}

      <Card>
        <AppText variant="h2">Calendar ({getCalendar().name})</AppText>
        {events.map((e) => (
          <View key={e.id} style={{ gap: 4, paddingVertical: 4 }}>
            <AppText>{hhmm(e.start)}–{hhmm(e.end)} · {e.title}</AppText>
            <AppButton kind="secondary" label="Speak for me here" accessibilityLabel={`Prepare a contribution for ${e.title}`}
              onPress={() => router.push({ pathname: '/speak', params: { meeting: e.title } })} />
          </View>
        ))}
      </Card>
      <Card>
        <AppText variant="h2">Tasks</AppText>
        {tasks.map((t) => (
          <View key={t.id} style={{ gap: 4, paddingVertical: 4 }}>
            <AppText>{t.id} · {t.title} ({t.status}{t.daysInStatus ? `, ${t.daysInStatus} days` : ''})</AppText>
            {firstStep[t.id] ? <AppText>First step: {firstStep[t.id]}</AppText> : (
              <AppButton kind="secondary" label="Help me start" accessibilityLabel={`Help me start ${t.title}`} onPress={() => starter(t)} />
            )}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
