// Owner: Alexandra. AAC for work: for people who are non-speaking (always or under stress) in meetings.
// Plain language, adult phrases (no emojis, no childish icons). Works on Expo web & Expo Go.
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AiBadge, AppButton, AppText, Card, Screen, TextField } from '@/src/shared/ui';
import { composeContribution } from '@/src/shared/api';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { getTodayCheckin } from '@/src/features/checkin/checkinRepo';
import { getTasks } from '@/src/integrations/tasks';
import type { Checkin, MeetingContribution, WorkTask } from '@/src/shared/types';

const CUSTOM_STORAGE_KEY = 'vibecheck_custom_phrases';

// Plain, adult, work-appropriate quick phrases (no icons, no emojis).
const STANDARD_QUICK = [
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
  const [newCustomPhrase, setNewCustomPhrase] = useState('');
  const [customPhrases, setCustomPhrases] = useState<string[]>([]);
  const [out, setOut] = useState<MeetingContribution | null>(null);
  const [busy, setBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(0.95);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);

  useEffect(() => {
    getTodayCheckin().then(setCheckin).catch(() => {});
    getTasks().then(setTasks).catch(() => {});

    // Load custom phrases from local storage with try/catch
    AsyncStorage.getItem(CUSTOM_STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) setCustomPhrases(parsed);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  function speak(textToSpeak: string) {
    const clean = textToSpeak.trim();
    if (!clean) return;

    stopSpeaking();
    setIsSpeaking(true);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = 'en-US';
        u.rate = rate;
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
        return;
      } catch {
        // Fallback to expo-speech
      }
    }

    try {
      Speech.speak(clean, {
        language: 'en-US',
        rate,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  }

  function stopSpeaking() {
    setIsSpeaking(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    try {
      Speech.stop();
    } catch {}
  }

  async function copyToChat(textToCopy: string) {
    const clean = textToCopy.trim();
    if (!clean) return;
    await Clipboard.setStringAsync(clean);
    await confirm();
  }

  async function addCustomPhrase() {
    const clean = newCustomPhrase.trim();
    if (!clean || customPhrases.includes(clean)) return;
    const updated = [...customPhrases, clean];
    setCustomPhrases(updated);
    setNewCustomPhrase('');
    try {
      await AsyncStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
      await confirm();
    } catch {}
  }

  async function deleteCustomPhrase(phraseToDelete: string) {
    const updated = customPhrases.filter((p) => p !== phraseToDelete);
    setCustomPhrases(updated);
    try {
      await AsyncStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
      await confirm();
    } catch {}
  }

  const hasCompose = typeof composeContribution === 'function';

  async function compose(mode: 'clarify' | 'calm' | 'status_update') {
    setBusy(true);
    try {
      let res: MeetingContribution;
      try {
        res = await composeContribution({
          draft,
          meetingTitle: meeting,
          mode,
          checkin: checkin ? { capacityScore: checkin.capacityScore } : null,
          tasks: tasks.map(({ id, title, status }) => ({ id, title, status })),
        });
      } catch (callErr) {
        // Resilient client-side fallback if server/AI quota unavailable
        if (mode === 'status_update') {
          const active = tasks.filter((t) => t.status !== 'done');
          const inProg = active.filter((t) => t.status === 'in_progress').map((t) => t.title).join(', ');
          const blocked = active.filter((t) => t.status === 'blocked').map((t) => t.title).join(', ');
          let text = 'For my update today: ';
          if (inProg) text += `I am currently progressing on ${inProg}. `;
          if (blocked) text += `I need alignment on ${blocked} to unblock next steps. `;
          if (!inProg && !blocked) text += 'My assigned tasks are on track and I am ready for the next priorities.';
          res = {
            text: text.slice(0, 400),
            why: 'Structured directly from your active tasks (in progress and blocked).',
            spoken: text.slice(0, 400),
            chat: text.slice(0, 400),
          };
        } else if (mode === 'calm') {
          const text = draft.trim()
            ? `Regarding our discussion on ${meeting || 'the project'}: I wanted to check in calmly to make sure we are aligned on the priorities and deliverables. ${draft}`
            : `Hi team, I would like to check in on our current progress and ensure we are aligned on next steps.`;
          res = {
            text: text.slice(0, 400),
            why: 'Reframed calmly to communicate priorities and reduce anxiety.',
            spoken: text.slice(0, 400),
            chat: text.slice(0, 400),
          };
        } else {
          let text = draft.trim();
          if (!text) {
            text = 'I agree with this direction and will follow up with the completed items by the end of today.';
          } else {
            const clean = text.replace(/^[a-z]/, (c) => c.toUpperCase());
            if (/nu cred|i don't think|maybe|cred ca|not sure/i.test(clean)) {
              text = `Regarding this point: ${clean.replace(/^[., ]+/, '')} I would recommend that we align on these details before proceeding.`;
            } else if (/help|ajutor|blocat|blocked|issue|problema/i.test(clean)) {
              text = `I wanted to raise a key item: ${clean}. Could we coordinate for a few minutes to align on the next steps?`;
            } else {
              text = `Regarding ${meeting || 'our discussion'}: ${clean}${clean.endsWith('.') ? '' : '.'} I will ensure this is tracked with the team.`;
            }
          }
          res = {
            text: text.slice(0, 400),
            why: 'Clarified into a direct, professional statement suitable for meetings.',
            spoken: text.slice(0, 400),
            chat: text.slice(0, 400),
          };
        }
      }
      setOut(res);
      if (res.text) {
        setDraft(res.text); // Keeps text editable before Speak/Copy
      }
      await confirm();
    } finally {
      setBusy(false);
    }
  }

  const screenTitle = meeting ? `Speak for me: ${meeting}` : 'Speak for me';
  const speakHelp = 'Speak for me in meetings. Choose a quick phrase, or write your message to read aloud or copy.';

  return (
    <Screen title={screenTitle} speakText={speakHelp}>
      <Card>
        <AppText variant="h2">Quick phrases</AppText>
        <AppText variant="muted">Press a phrase to read it aloud immediately.</AppText>
        <View style={{ gap: 8, marginTop: 4 }}>
          {STANDARD_QUICK.map((q) => (
            <AppButton
              key={q}
              kind="secondary"
              label={q}
              accessibilityLabel={`Speak: ${q}`}
              onPress={() => speak(q)}
            />
          ))}
        </View>

        {customPhrases.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <AppText variant="h2">My saved phrases</AppText>
            <View style={{ gap: 8, marginTop: 4 }}>
              {customPhrases.map((cp) => (
                <View key={cp} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      kind="secondary"
                      label={cp}
                      accessibilityLabel={`Speak: ${cp}`}
                      onPress={() => speak(cp)}
                    />
                  </View>
                  <AppButton
                    kind="secondary"
                    label="Delete"
                    accessibilityLabel={`Delete phrase: ${cp}`}
                    onPress={() => deleteCustomPhrase(cp)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 16, gap: 8 }}>
          <TextField
            label="Add a personal quick phrase"
            value={newCustomPhrase}
            onChangeText={setNewCustomPhrase}
            voice={false}
          />
          <AppButton
            kind="secondary"
            label="Save phrase"
            accessibilityLabel="Save phrase to your personal quick phrases"
            onPress={addCustomPhrase}
            disabled={!newCustomPhrase.trim()}
          />
        </View>
      </Card>

      <Card>
        <AppText variant="h2">Compose message</AppText>
        <TextField
          label="Your point or question (rough notes are fine)"
          value={draft}
          onChangeText={setDraft}
          multiline
          voice={false}
        />

        <View style={{ gap: 8, marginTop: 4 }}>
          <AppButton
            label="Speak"
            accessibilityLabel={`Speak: ${draft || 'nothing entered'}`}
            onPress={() => speak(draft)}
            disabled={!draft.trim()}
          />
          {isSpeaking ? (
            <AppButton
              kind="secondary"
              label="Stop speaking"
              accessibilityLabel="Stop speaking"
              onPress={stopSpeaking}
            />
          ) : null}
          <AppButton
            kind="secondary"
            label="Copy for the meeting chat"
            accessibilityLabel="Copy current text for the meeting chat"
            onPress={() => copyToChat(draft)}
            disabled={!draft.trim()}
          />
        </View>

        {hasCompose ? (
          <View style={{ gap: 8, marginTop: 16 }}>
            <AppText variant="muted">AI assistance:</AppText>
            <AppButton
              kind="secondary"
              label="Make it clear and professional"
              hint="Clarifies notes into a direct, professional message"
              accessibilityLabel="Make message clear and professional with AI"
              onPress={() => compose('clarify')}
              disabled={!draft.trim()}
              busy={busy}
            />
            <AppButton
              kind="secondary"
              label="Calm phrasing for manager"
              hint="Reframes a question or update calmly to reduce anxiety"
              accessibilityLabel="Reframe draft with calm phrasing for manager with AI"
              onPress={() => compose('calm')}
              disabled={!draft.trim()}
              busy={busy}
            />
            <AppButton
              kind="secondary"
              label="Build my status update from tasks"
              hint="Summarizes your active tasks without health data"
              accessibilityLabel="Build status update from tasks with AI"
              onPress={() => compose('status_update')}
              busy={busy}
            />
          </View>
        ) : null}
      </Card>

      {out ? (
        <Card ai>
          <AiBadge why={out.why || "Rewritten from your words and task list; you can edit it before speaking or copying"} />
          <AppText style={{ fontSize: font.h2, lineHeight: font.h2 * 1.5 }}>{out.text || out.spoken}</AppText>
          <View style={{ gap: 8, marginTop: 8 }}>
            <AppButton
              label="Speak"
              accessibilityLabel={`Speak: ${out.text || out.spoken}`}
              onPress={() => speak(out.text || out.spoken)}
            />
            <AppButton
              kind="secondary"
              label="Copy for the meeting chat"
              accessibilityLabel="Copy AI formatted text for meeting chat"
              onPress={() => copyToChat(out.chat || out.text)}
            />
            <AppButton
              kind="secondary"
              label={`Speech speed: ${rate === 0.8 ? 'slow' : rate === 1.1 ? 'fast' : 'normal'}`}
              accessibilityLabel={`Speech speed is currently ${rate === 0.8 ? 'slow' : rate === 1.1 ? 'fast' : 'normal'}. Press to change.`}
              onPress={() => setRate(rate === 0.95 ? 1.1 : rate === 1.1 ? 0.8 : 0.95)}
            />
          </View>
          <AppText variant="muted">
            Tip: in Meet, Teams or Zoom, share this tab with audio or use laptop speaker so colleagues hear your voice.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}