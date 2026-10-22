// Owner: Alina. First run, 4 short steps: consent -> who I am -> pick 2-3 metrics -> how the app should look/sound.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { AppButton, AppText, Card, ChipGroup, Screen, TextField } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { CATEGORY_DEFAULTS, METRICS } from '@/src/shared/metrics';
import type { MetricKey, UserCategory } from '@/src/shared/types';

export default function OnboardingScreen() {
  const { profile, update } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [cats, setCats] = useState<UserCategory[]>([]);
  const [metrics, setMetrics] = useState<MetricKey[]>([]);
  if (!profile) return <Screen title="Welcome"><AppText>Loading…</AppText></Screen>;
  const a = profile.a11y;

  const toggleCat = (c: UserCategory) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    setCats(next);
    setMetrics(Array.from(new Set(next.flatMap((x) => CATEGORY_DEFAULTS[x].metrics))).slice(0, 3)); // sensible default
  };
  const toggleMetric = (m: MetricKey) =>
    setMetrics(metrics.includes(m) ? metrics.filter((x) => x !== m) : metrics.length >= 3 ? metrics : [...metrics, m]);

  async function finish() {
    await update({ displayName: name, categories: cats, trackedMetrics: metrics, onboarded: true });
    router.replace('/');
  }

  const steps = [
    <Card key="consent">
      <AppText variant="h2">Step 1 of 4: your data</AppText>
      <AppText>VibeCheck stores your check-ins in your private space. AI uses them only to plan your day and draft messages you approve. Nothing reaches your employer unless you send it.</AppText>
      <ChipGroup label="I agree that" selected={(['healthData', 'aiProcessing'] as const).filter((k) => profile.consent[k])}
        options={[{ value: 'healthData', label: 'VibeCheck stores my check-ins' }, { value: 'aiProcessing', label: 'AI processes them to help me' }]}
        onToggle={(k) => update({ consent: { ...profile.consent, [k]: !profile.consent[k], acceptedAt: new Date().toISOString() } })} />
      <AppButton label="Next" onPress={() => setStep(1)} disabled={!profile.consent.healthData || !profile.consent.aiProcessing} />
    </Card>,
    <Card key="who">
      <AppText variant="h2">Step 2 of 4: about you</AppText>
      <TextField label="First name" value={name} onChangeText={setName} voice={false} />
      <ChipGroup label="What affects your work days? Choose any." selected={cats}
        options={(Object.keys(CATEGORY_DEFAULTS) as UserCategory[]).map((c) => ({ value: c, label: CATEGORY_DEFAULTS[c].label }))} onToggle={toggleCat} />
      <AppButton label="Next" onPress={() => setStep(2)} disabled={!cats.length} />
    </Card>,
    <Card key="metrics">
      <AppText variant="h2">Step 3 of 4: what to track (2 or 3)</AppText>
      <AppText variant="muted">Fewer scales = a 10-second check-in. You can change this later in Me.</AppText>
      <ChipGroup label={`Selected ${metrics.length} of 3`} selected={metrics}
        options={(Object.keys(METRICS) as MetricKey[]).map((m) => ({ value: m, label: `${METRICS[m].label}: ${METRICS[m].question}` }))} onToggle={toggleMetric} />
      <AppButton label="Next" onPress={() => setStep(3)} disabled={metrics.length < 2} />
    </Card>,
    <Card key="a11y">
      <AppText variant="h2">Step 4 of 4: how VibeCheck should look and sound</AppText>
      <ChipGroup label="Options" selected={(['lowSensory', 'highContrast', 'dyslexiaFont', 'autoReadAloud', 'simpleLanguage', 'haptics', 'sounds'] as const).filter((k) => a[k])}
        options={[
          { value: 'lowSensory', label: 'Low-sensory mode: dark, no motion, no alert colours' },
          { value: 'highContrast', label: 'High contrast' }, { value: 'dyslexiaFont', label: 'Easy-read font' },
          { value: 'autoReadAloud', label: 'Read screens aloud' }, { value: 'simpleLanguage', label: 'Simple language' },
          { value: 'haptics', label: 'Vibrate to confirm' }, { value: 'sounds', label: 'Sound to confirm' },
        ]}
        onToggle={(k) => update({ a11y: { ...a, [k]: !a[k] } })} />
      <AppButton label="Start" onPress={finish} />
    </Card>,
  ];
  return <Screen title="Welcome to VibeCheck">{steps[step]}</Screen>;
}
