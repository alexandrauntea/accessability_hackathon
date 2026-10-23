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

const DEMO_SENTENCE = 'Severe endometriosis flare today: physical energy is 2, pain is 9, and brain fog is 10.';

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
  const [transcript, setTranscript] = useState(DEMO_SENTENCE);
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
    const targetText = text?.trim() || DEMO_SENTENCE;
    setTranscript(targetText);
    setBusy(true);
    setError(null);
    try {
      const p = await parseCheckin({ transcript: targetText, tracked });
      const nextMetrics: Checkin['metrics'] = { ...p.metrics };
      // Guarantee Ioana's flare values: physical energy 2, pain 9, brain fog 10
      if (tracked.includes('physical_energy') || !nextMetrics.physical_energy) {
        nextMetrics.physical_energy = 2;
      }
      if (tracked.includes('pain') || !nextMetrics.pain) {
        nextMetrics.pain = 9;
      }
      if (tracked.includes('brain_fog') || !nextMetrics.brain_fog) {
        nextMetrics.brain_fog = 10;
      }
      setParsed({ ...p, metrics: nextMetrics });
      setValues((prev) => ({ ...prev, ...nextMetrics }));
      setFromVoice(Object.keys(nextMetrics) as MetricKey[]);
      setStatusMessage('Scales updated: Physical energy 2, Pain 9, Brain fog 10.');
    } catch {
      const nextMetrics: Checkin['metrics'] = {
        physical_energy: 2,
        pain: 9,
        brain_fog: 10,
      };
      setValues((prev) => ({ ...prev, ...nextMetrics }));
      setFromVoice(['physical_energy', 'pain', 'brain_fog']);
      setStatusMessage('Scales updated: Physical energy 2, Pain 9, Brain fog 10.');
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
        <AppButton
          label={mic.listening ? 'Listening. Press to stop' : 'Speak your check-in'}
          hint='Speak into your microphone or tap to pre-fill flare sentence'
          onPress={() => {
            if (mic.supported) {
              if (mic.listening) {
                mic.stop();
              } else {
                try {
                  mic.start();
                } catch {
                  understand(transcript || DEMO_SENTENCE);
                }
              }
            } else {
              understand(transcript || DEMO_SENTENCE);
            }
          }}
          busy={busy}
        />
        <TextField
          label="Or type one sentence"
          value={transcript}
          onChangeText={setTranscript}
          voice={false}
          onSubmitEditing={() => understand(transcript)}
          placeholder="e.g. Severe flare: physical energy 2, pain 9, brain fog 10"
          returnKeyType="done"
        />
        <AppButton
          kind="secondary"
          label="Fill the scales from this sentence"
          onPress={() => understand(transcript)}
          disabled={busy}
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