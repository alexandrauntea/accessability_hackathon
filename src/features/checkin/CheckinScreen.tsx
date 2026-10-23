// Owner: Andreea. 10-second check-in: only the user's 2-3 metrics, voice-first.
// Voice: "Pain is 8 today and I can't concentrate" -> parseCheckin (AI) -> scales pre-filled -> user confirms.
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, ChipGroup, ScaleInput, Screen, TextField } from '@/src/shared/ui';
import { parseCheckin } from '@/src/shared/api';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { useVoiceInput } from '@/src/shared/hooks/useVoiceInput';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { METRICS, CATEGORY_DEFAULTS, deriveCapacity, CAPACITY_ANCHORS, anchorFor } from '@/src/shared/metrics';
import { listCheckins, saveCheckin } from './checkinRepo';
import type { Checkin, MetricKey, ParsedCheckin } from '@/src/shared/types';

export default function CheckinScreen() {
  const { profile } = useProfile();
  const { confirm } = useFeedback();
  const { c } = useTheme();

  const tracked: MetricKey[] = profile?.trackedMetrics?.length
    ? profile.trackedMetrics
    : profile?.categories?.[0]
    ? CATEGORY_DEFAULTS[profile.categories[0]].metrics
    : ['physical_energy', 'pain'];

  const [values, setValues] = useState<Checkin['metrics']>({});
  const [fromVoice, setFromVoice] = useState<MetricKey[]>([]);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedCheckin | null>(null);
  const [late, setLate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [yesterday, setYesterday] = useState<Checkin | null>(null);

  useEffect(() => {
    listCheckins(1)
      .then((x) => setYesterday(x[0] ?? null))
      .catch(() => {});
  }, []);

  async function understand(text: string) {
    if (!text.trim()) return;
    setTranscript(text);
    setBusy(true);
    setError(null);
    try {
      const p = await parseCheckin({ transcript: text, tracked });
      setParsed(p);
      setValues((prev) => ({ ...prev, ...p.metrics }));
      setFromVoice(Object.keys(p.metrics) as MetricKey[]);
      setStatusMessage('Scales updated from your speech. Please review and confirm.');
    } catch {
      // Local fallback parser if cloud function fails or quota reached
      const lower = text.toLowerCase();
      const localMetrics: Partial<Record<MetricKey, number>> = {};
      if (tracked.includes('pain')) {
        const m = lower.match(/(?:pain|durere).*?([0-9]|10)/);
        if (m) localMetrics.pain = parseInt(m[1], 10);
        else if (/high pain|severe pain|durere mare|dureri mari/i.test(lower)) localMetrics.pain = 8;
        else if (/mild pain|durere mica/i.test(lower)) localMetrics.pain = 3;
      }
      if (tracked.includes('physical_energy')) {
        const m = lower.match(/(?:energy|energie).*?([0-9]|10)/);
        if (m) localMetrics.physical_energy = parseInt(m[1], 10);
        else if (/low energy|exhausted|obosit|fara energie/i.test(lower)) localMetrics.physical_energy = 2;
        else if (/good energy|fresh|energie buna/i.test(lower)) localMetrics.physical_energy = 8;
      }
      if (tracked.includes('brain_fog')) {
        const m = lower.match(/(?:brain fog|fog|ceata).*?([0-9]|10)/);
        if (m) localMetrics.brain_fog = parseInt(m[1], 10);
        else if (/brain fog|can't think|ceata/i.test(lower)) localMetrics.brain_fog = 7;
      }
      if (tracked.includes('focus')) {
        const m = lower.match(/(?:focus|concentrare).*?([0-9]|10)/);
        if (m) localMetrics.focus = parseInt(m[1], 10);
        else if (/can't focus|nu ma pot concentra/i.test(lower)) localMetrics.focus = 3;
        else if (/good focus/i.test(lower)) localMetrics.focus = 8;
      }
      if (tracked.includes('anxiety')) {
        const m = lower.match(/(?:anxiety|anxietate).*?([0-9]|10)/);
        if (m) localMetrics.anxiety = parseInt(m[1], 10);
        else if (/anxious|panicked/i.test(lower)) localMetrics.anxiety = 8;
      }

      if (Object.keys(localMetrics).length > 0) {
        setValues((prev) => ({ ...prev, ...localMetrics }));
        setFromVoice(Object.keys(localMetrics) as MetricKey[]);
        setStatusMessage('Scales updated from your speech. Please review and confirm.');
        setError(null);
      } else {
        setError('Could not parse voice input right now. Please rate the scales below manually.');
      }
    } finally {
      setBusy(false);
    }
  }

  const mic = useVoiceInput(understand);

  async function save(source: Checkin['source'], metrics = values) {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveCheckin({
        metrics,
        symptoms: parsed?.symptoms ?? [],
        notes: parsed?.notes || transcript || undefined,
        workedLateYesterday: late,
        source,
      });
      await confirm(); // vibration on phone + discreet sound (respects user prefs in Me)
      setStatusMessage(`Check-in saved. Daily capacity: ${saved.capacityScore} of 10 — ${anchorFor({ anchors: CAPACITY_ANCHORS }, saved.capacityScore)}`);
      setTimeout(() => {
        router.back();
      }, 500);
    } catch {
      setError('Could not save check-in. Your entries are kept; please try again.');
    } finally {
      setBusy(false);
    }
  }

  const complete = tracked.every((k) => typeof values[k] === 'number');
  const preview = complete ? deriveCapacity(values) : null;

  return (
    <Screen
      title="Daily check-in"
      speakText={`Rate ${tracked.map((k) => METRICS[k].label).join(', ')} from 1 to 10, or press Speak and say it in one sentence.`}
    >
      {/* Permanent, large voice entry */}
      <Card>
        {mic.supported ? (
          <AppButton
            label={mic.listening ? 'Listening. Press to stop' : 'Speak your check-in'}
            hint='For example: "Pain is 8 today and I cannot concentrate"'
            onPress={mic.listening ? mic.stop : mic.start}
            busy={busy}
          />
        ) : (
          <AppText variant="muted">
            {Platform.OS === 'web'
              ? 'Voice input is not supported in this browser.'
              : 'Tap the field, then the microphone on your keyboard, and say how today is.'}
          </AppText>
        )}
        <TextField
          label="Or type one sentence"
          value={transcript}
          onChangeText={setTranscript}
          voice={false}
          onSubmitEditing={() => understand(transcript)}
          returnKeyType="done"
        />
        <AppButton
          kind="secondary"
          label="Fill the scales from this sentence"
          onPress={() => understand(transcript)}
          disabled={!transcript.trim() || busy}
          busy={busy}
        />
        {parsed ? (
          <>
            <AiBadge why={`Extracted from what you said: "${transcript}"`} />
            {parsed.unclear.length ? (
              <AppText>Not sure about: {parsed.unclear.join('; ')}. Please set those manually.</AppText>
            ) : null}
          </>
        ) : null}
      </Card>

      {tracked.map((k) => (
        <ScaleInput
          key={k}
          label={METRICS[k].label}
          question={METRICS[k].question}
          anchors={METRICS[k].anchors}
          value={values[k]}
          highlight={fromVoice.includes(k)}
          onChange={(v) => {
            setValues({ ...values, [k]: v });
            setFromVoice(fromVoice.filter((x) => x !== k));
          }}
        />
      ))}

      <ChipGroup
        label="Yesterday"
        options={[{ value: 'late', label: 'I worked after 8 pm' }]}
        selected={late ? ['late'] : []}
        onToggle={() => setLate(!late)}
      />

      {preview ? (
        <Card accessibilityLiveRegion="polite">
          <AppText variant="h2">
            Daily capacity: {preview.capacityScore} of 10 — {anchorFor({ anchors: CAPACITY_ANCHORS }, preview.capacityScore)}
          </AppText>
          <AppText variant="muted">
            Average of your scales. Shared with your employer only if you include it in a request you send.
          </AppText>
        </Card>
      ) : null}

      {statusMessage ? (
        <View accessibilityLiveRegion="polite">
          <AppText style={{ color: c.good, fontWeight: '700' }}>{statusMessage}</AppText>
        </View>
      ) : null}

      {error ? (
        <AppText accessibilityRole="alert" style={{ color: c.danger, fontWeight: '700' }}>
          {error}
        </AppText>
      ) : null}

      <View style={{ gap: 8 }}>
        <AppButton
          label={fromVoice.length ? 'Confirm and save' : 'Save check-in'}
          onPress={() => save(fromVoice.length ? 'voice' : 'manual')}
          disabled={!complete || busy}
          busy={busy}
        />
        <AppButton
          kind="secondary"
          label="Same as yesterday"
          hint={yesterday ? `Pre-fills scales from ${yesterday.date}` : 'No previous check-in available'}
          disabled={!yesterday || busy}
          onPress={() => {
            if (yesterday) {
              setValues({ ...yesterday.metrics });
              setLate(yesterday.workedLateYesterday);
              setStatusMessage('Pre-filled scales from yesterday. Please review and save.');
            }
          }}
        />
      </View>
    </Screen>
  );
}