// Owner: Alexandra. AAC for work: for people who are non-speaking (always or under stress) in meetings.
// Write or build a contribution -> AI makes it clear and professional -> read aloud (TTS) and/or copy for the meeting chat.
// Works with any platform (Meet, Teams, Zoom): no meeting API needed.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { AiBadge, AppButton, AppText, Card, Screen, TextField } from '@/src/shared/ui';
import { composeContribution } from '@/src/shared/api';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { getTodayCheckin } from '@/src/features/checkin/checkinRepo';
import { getTasks } from '@/src/integrations/tasks';
import type { Checkin, MeetingContribution, WorkTask } from '@/src/shared/types';

// Plain, adult, work-appropriate quick phrases (no icons, no emojis).
const QUICK = [
  'I agree with this.',
  'I need a minute to think before I answer.',
  'Could you share that in writing after the meeting?',
  'I have a question about the deadline.',
  'I will follow up by email today.',
  'I prefer to answer in the chat.',
];

export default function SpeakForMeScreen() {
  const { meeting } = useLocalSearchParams<{ meeting?: string }>();
  const { font } = useTheme();
  const { confirm } = useFeedback();
  const [draft, setDraft] = useState('');
  const [out, setOut] = useState<MeetingContribution | null>(null);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(0.95);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  useEffect(() => { getTodayCheckin().then(setCheckin).catch(() => {}); getTasks().then(setTasks).catch(() => {}); }, []);

  async function compose(mode: 'polish' | 'status_update') {
    setBusy(true);
    try {
      setOut(await composeContribution({ draft, meetingTitle: meeting, mode, checkin: checkin ? { capacityScore: checkin.capacityScore } : null,
        tasks: tasks.map(({ id, title, status }) => ({ id, title, status })) }));
    } finally { setBusy(false); }
  }
  const speak = (t: string) => { Speech.stop(); Speech.speak(t, { language: 'en-US', rate }); };
  const copy = async (t: string) => { await Clipboard.setStringAsync(t); await confirm(); };

  return (
    <Screen title={meeting ? `Speak for me: ${meeting}` : 'Speak for me'} speakText="Choose a quick phrase, or write your point. I can read it aloud in the meeting and copy it for the chat.">
      <Card>
        <AppText variant="h2">Quick phrases</AppText>
        <AppText variant="muted">Pressing one reads it aloud immediately.</AppText>
        {QUICK.map((q) => <AppButton key={q} kind="secondary" label={q} onPress={() => speak(q)} />)}
      </Card>

      <Card>
        <TextField label="Your point (rough is fine)" value={draft} onChangeText={setDraft} multiline voice={false} />
        <AppButton label="Make it clear and professional" onPress={() => compose('polish')} disabled={!draft.trim()} busy={busy} />
        <AppButton kind="secondary" label="Build my status update from Jira" hint="Uses your open tasks; health data is not included" onPress={() => compose('status_update')} busy={busy} />
      </Card>

      {out ? (
        <Card ai>
          <AiBadge why="rewritten from your words and task list; check it says what you mean" />
          <AppText style={{ fontSize: font.h2, lineHeight: font.h2 * 1.5 }}>{out.spoken}</AppText>
          <View style={{ gap: 8 }}>
            <AppButton label="Read aloud in the meeting" onPress={() => speak(out.spoken)} />
            <AppButton kind="secondary" label="Copy for the meeting chat" onPress={() => copy(out.chat)} />
            <AppButton kind="secondary" label={`Speech speed: ${rate === 0.8 ? 'slow' : rate === 1.1 ? 'fast' : 'normal'}`}
              onPress={() => setRate(rate === 0.95 ? 1.1 : rate === 1.1 ? 0.8 : 0.95)} />
          </View>
          <AppText variant="muted">Tip: in Meet or Teams, share this tab with audio, or keep the laptop speaker on, so others hear the voice.</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
