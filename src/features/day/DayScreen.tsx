// Owner: Alexandra. Today's calendar + tasks, re-planned by AI around the check-in.
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AiBadge, AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { planDay, breakdownTask, composeContribution, prepareMeeting } from '@/src/shared/api';
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
import type { CalendarEvent, Checkin, DayPlan, MeetingPrep, WorkTask } from '@/src/shared/types';

const ACTION_LABEL: Record<string, string> = {
  keep: 'Keep', move: 'Move', shorten: 'Shorten', make_async: 'Make async', split: 'Split', drop_today: 'Not today', add_break: 'Break', focus_block: 'Focus block',
};

const CUSTOM_STORAGE_KEY = 'vibecheck_custom_phrases';

export default function DayScreen() {
  const { profile } = useProfile();
  const feedback = useFeedback();
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [proposedProtectedPlan, setProposedProtectedPlan] = useState<DayPlan | null>(null);
  const [firstStep, setFirstStep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<WeekPatternAnalysis | null>(null);
  const [draftingMessage, setDraftingMessage] = useState(false);
  const [draftedMessage, setDraftedMessage] = useState<string | null>(null);

  // Meeting prep states
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [prepData, setPrepData] = useState<{ meeting: CalendarEvent; data: MeetingPrep } | null>(null);
  const [savedPhrasesSuccess, setSavedPhrasesSuccess] = useState(false);

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

  async function adapt(hardDay = false, protectDay = false) {
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
        protectDay,
      });
      if (protectDay) {
        setProposedProtectedPlan(p);
      } else {
        setPlan(p);
        await saveDayPlan(p);
      }
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

  async function handlePrepareMeeting(e: CalendarEvent) {
    setPreparingId(e.id);
    try {
      const startMs = Date.parse(e.start);
      const endMs = Date.parse(e.end);
      const durationMin = !isNaN(startMs) && !isNaN(endMs) ? Math.round((endMs - startMs) / 60000) : 30;

      const res = await prepareMeeting({
        meetingTitle: e.title,
        durationMin,
        attendeesCount: e.attendees?.length ?? 3,
        tasks: tasks.map(({ id, title }) => ({ id, title })),
      });
      setPrepData({ meeting: e, data: res });
      setSavedPhrasesSuccess(false);
      await feedback.confirm();
    } catch (err) {
      console.error('Failed to prepare meeting:', err);
    } finally {
      setPreparingId(null);
    }
  }

  async function addSuggestedPhrasesToAAC() {
    if (!prepData?.data.suggestedPhrases?.length) return;
    try {
      const existingStr = await AsyncStorage.getItem(CUSTOM_STORAGE_KEY);
      const existing: string[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = Array.from(new Set([...existing, ...prepData.data.suggestedPhrases]));
      await AsyncStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
      setSavedPhrasesSuccess(true);
      await feedback.confirm();
    } catch (err) {
      console.warn('Could not save phrases to storage:', err);
    }
  }

  const spoken = plan
    ? `Adapted plan: capacity ${checkin?.capacityScore ?? 'unknown'} of 10. ${plan.summary}`
    : `My day: ${events.length} meetings and ${tasks.length} tasks scheduled today.`;

  return (
    <Screen title="My day" speakText={spoken}>
      {!checkin ? <Card><AppText>Tip: do your check-in first so the plan matches your current capacity.</AppText></Card> : null}
      <View style={{ gap: 8 }}>
        <AppButton label="Adapt my day" hint="AI re-plans meetings and tasks around today's capacity" onPress={() => adapt(false, false)} busy={busy} />
        <AppButton kind="secondary" label="Protect my day" hint="Groups meetings and clears a 2.5-3h deep work focus block" onPress={() => adapt(false, true)} busy={busy} />
        <AppButton kind="secondary" label="It's a hard day" hint="Fewer meetings, small clear tasks, messages drafted for you" onPress={() => adapt(true, false)} />
      </View>
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}

      {/* Protect my day proposal diff card */}
      {proposedProtectedPlan ? (
        <Card ai>
          <AppText variant="h2">Protect my day proposal</AppText>
          <AiBadge why="Grouped movable meetings and carved out a 3-hour deep work focus block" />
          
          <View style={{ gap: 8, marginVertical: 8 }}>
            <AppText style={{ fontWeight: '700' }}>Schedule comparison (text diff):</AppText>
            <View style={{ padding: 8, backgroundColor: 'rgba(255, 0, 0, 0.05)', borderRadius: 6, gap: 4 }}>
              <AppText style={{ fontWeight: '600', color: '#b3261e' }}>Before (current schedule):</AppText>
              <AppText variant="muted">
                {events.filter((e) => e.movable).length > 0
                  ? `Movable meetings scattered throughout the day (${events.filter((e) => e.movable).map((e) => e.title).join(', ')}), causing frequent context switching.`
                  : 'Scattered schedule without a dedicated deep work focus block.'}
              </AppText>
            </View>

            <View style={{ padding: 8, backgroundColor: 'rgba(0, 128, 0, 0.05)', borderRadius: 6, gap: 4 }}>
              <AppText style={{ fontWeight: '600', color: '#0d7a46' }}>After (protected schedule):</AppText>
              <AppText variant="muted">
                {`Movable meetings grouped together in afternoon block. Protected continuous focus block: ${proposedProtectedPlan.focusBlock?.start || '10:00'}–${proposedProtectedPlan.focusBlock?.end || '13:00'} for deep work.`}
              </AppText>
              {proposedProtectedPlan.focusBlock?.suggestedTaskIds?.length ? (
                <AppText variant="muted">
                  Suggested focus tasks: {proposedProtectedPlan.focusBlock.suggestedTaskIds.join(', ')}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                label="Accept"
                accessibilityLabel="Accept protected day plan"
                onPress={async () => {
                  setPlan(proposedProtectedPlan);
                  await saveDayPlan(proposedProtectedPlan);
                  setProposedProtectedPlan(null);
                  await feedback.confirm();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                kind="secondary"
                label="Keep as is"
                accessibilityLabel="Keep current schedule as is"
                onPress={() => {
                  setProposedProtectedPlan(null);
                }}
              />
            </View>
          </View>
        </Card>
      ) : null}

      {plan ? (
        <Card ai>
          <AppText variant="h2">Adapted plan (capacity {checkin?.capacityScore ?? '?'}/10{plan.mode === 'hard_day' ? ', hard-day mode' : ''})</AppText>
          {plan.notificationLevel === 'reduced' ? <AppText>Notifications reduced for today: only messages from your manager and meeting reminders.</AppText> : null}
          {plan.focusBlock ? (
            <View style={{ paddingVertical: 4 }}>
              <AppText style={{ fontWeight: '700', color: '#0d7a46' }}>
                Protected focus block: {plan.focusBlock.start}–{plan.focusBlock.end} ({plan.focusBlock.label})
              </AppText>
            </View>
          ) : null}
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

      {/* Meeting Briefing Card */}
      {prepData ? (
        <Card ai>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="h2">Briefing: {prepData.meeting.title}</AppText>
            <AppButton
              kind="secondary"
              label="Close"
              accessibilityLabel="Close meeting briefing"
              onPress={() => setPrepData(null)}
            />
          </View>
          <AiBadge why={prepData.data.why} />

          <View style={{ gap: 8, marginTop: 8 }}>
            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: '700' }}>Purpose:</AppText>
              <AppText>{prepData.data.purpose}</AppText>
            </View>

            <View style={{ gap: 4, padding: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
              <AppText style={{ fontWeight: '700' }}>What to expect:</AppText>
              <AppText>• Duration: {prepData.data.whatToExpect.duration}</AppText>
              <AppText>• Turn: {prepData.data.whatToExpect.speakingExpectation}</AppText>
              <AppText>• Camera: {prepData.data.whatToExpect.cameraRequired ? 'Camera expected' : 'Camera optional'}</AppText>
            </View>

            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: '700' }}>Likely questions:</AppText>
              {prepData.data.likelyQuestions.map((q, idx) => (
                <AppText key={idx} variant="muted">{idx + 1}. {q}</AppText>
              ))}
            </View>

            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: '700' }}>Your points:</AppText>
              {prepData.data.myPoints.map((pt, idx) => (
                <AppText key={idx} variant="muted">• {pt}</AppText>
              ))}
            </View>

            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: '700' }}>Suggested AAC phrases:</AppText>
              {prepData.data.suggestedPhrases.map((phrase, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
                  <AppText style={{ flex: 1, fontStyle: 'italic' }}>“{phrase}”</AppText>
                  <AppButton
                    kind="secondary"
                    label="Copy"
                    accessibilityLabel={`Copy phrase: ${phrase}`}
                    onPress={async () => {
                      await Clipboard.setStringAsync(phrase);
                      await feedback.confirm();
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ gap: 8, marginTop: 8 }}>
              <AppButton
                kind="secondary"
                label={savedPhrasesSuccess ? 'Phrases saved to Speak for me!' : 'Add phrases to Speak for me'}
                hint="Saves suggested phrases to your personal quick phrases"
                accessibilityLabel="Save suggested phrases to personal quick phrases in Speak for me"
                onPress={addSuggestedPhrasesToAAC}
                disabled={savedPhrasesSuccess}
              />
              <AppButton
                label="Open in Speak for me"
                accessibilityLabel="Open this meeting in Speak for me"
                onPress={() => router.push({ pathname: '/speak', params: { meeting: prepData.meeting.title } })}
              />
            </View>
          </View>
        </Card>
      ) : null}

      {/* Google Calendar status card (Web only) */}
      {Platform.OS === 'web' ? (
        <Card>
          <AppText variant="h2">Google Calendar</AppText>
          {google.isConnected ? (
            <View style={{ gap: 8 }}>
              <AppText style={{ color: '#0d7a46', fontWeight: '600' }}>Connected · read-only</AppText>
              <AppText variant="muted">Events are loaded directly from your Google Calendar during this session.</AppText>
              <AppButton
                kind="secondary"
                label="Disconnect calendar"
                accessibilityLabel="Disconnect Google Calendar and return to sample calendar"
                onPress={google.disconnect}
              />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <AppText variant="muted">
                Using sample calendar because:{' '}
                {!google.hasClientId
                  ? 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not configured in .env'
                  : config.mockCalendar
                  ? 'Sample calendar flag is active (EXPO_PUBLIC_MOCK_CALENDAR=true)'
                  : 'Google Calendar not connected'}
              </AppText>
              {google.ready && !config.mockCalendar ? (
                <AppButton
                  kind="secondary"
                  label="Connect Google Calendar"
                  accessibilityLabel="Connect your Google Calendar read-only"
                  onPress={google.connect}
                />
              ) : null}
            </View>
          )}
        </Card>
      ) : null}

      <Card>
        <AppText variant="h2">Calendar ({getCalendar().name})</AppText>
        {events.map((e) => (
          <View key={e.id} style={{ gap: 4, paddingVertical: 4 }}>
            <AppText>{hhmm(e.start)}–{hhmm(e.end)} · {e.title}{e.movable ? '' : ' (fixed)'}</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  kind="secondary"
                  label={preparingId === e.id ? 'Preparing...' : 'Prepare'}
                  hint="AI briefing with expected questions, points and ready phrases"
                  accessibilityLabel={`Prepare briefing for ${e.title}`}
                  onPress={() => handlePrepareMeeting(e)}
                  disabled={!!preparingId}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  kind="secondary"
                  label="Speak for me"
                  accessibilityLabel={`Speak for me in ${e.title}`}
                  onPress={() => router.push({ pathname: '/speak', params: { meeting: e.title } })}
                />
              </View>
            </View>
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
