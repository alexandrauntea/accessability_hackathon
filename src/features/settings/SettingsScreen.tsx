// Owner: Alina. Profile, accessibility prefs, consent, disclosure level, export & delete data.
import React from 'react';
import { Platform } from 'react-native';
import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { AppButton, AppText, Card, ChipGroup, Screen, TextField } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { db, auth } from '@/src/shared/firebase';
import { METRICS } from '@/src/shared/metrics';
import type { Condition, DisclosureLevel, MetricKey } from '@/src/shared/types';
import { useAuth } from '@/src/shared/hooks/useAuth';

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'endometriosis', label: 'Endometriosis' }, { value: 'fibromyalgia', label: 'Fibromyalgia' },
  { value: 'chronic_migraine', label: 'Chronic migraine' }, { value: 'lupus', label: 'Lupus' }, { value: 'hashimoto', label: 'Hashimoto' },
  { value: 'rheumatoid_arthritis', label: 'Rheumatoid arthritis' }, { value: 'long_covid', label: 'Long COVID' }, { value: 'me_cfs', label: 'ME/CFS' },
  { value: 'multiple_sclerosis', label: 'Multiple sclerosis' }, { value: 'adhd', label: 'ADHD' }, { value: 'autism', label: 'Autism' },
  { value: 'dyslexia', label: 'Dyslexia' }, { value: 'anxiety', label: 'Anxiety' }, { value: 'depression', label: 'Depression' }, { value: 'burnout', label: 'Burnout' },
];
const SUBCOLS = ['checkins', 'summaries', 'dayPlans', 'requests'];
export default function SettingsScreen() {
  const { profile, update } = useProfile();
  const { logout } = useAuth();

  if (!profile) return <Screen title="Me"><AppText>Loading…</AppText></Screen>;
  const a = profile.a11y;
  const toggleA11y = (k: keyof typeof a) => update({ a11y: { ...a, [k]: !a[k] } as any });

  async function exportData() {
    const uid = auth.currentUser!.uid; const out: any = { profile };
    for (const c of SUBCOLS) out[c] = (await getDocs(collection(db, 'users', uid, c))).docs.map((d) => d.data());
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'vibecheck-my-data.json'; link.click();
    }
  }
  async function deleteAll() {
    const uid = auth.currentUser!.uid;
    for (const c of SUBCOLS) for (const d of (await getDocs(collection(db, 'users', uid, c))).docs) await deleteDoc(d.ref);
    await update({ conditions: [] });
  }

  return (
    <Screen title="Me">
      <Card>
        <AppText variant="h2">Accessibility</AppText>
        <ChipGroup label="Display and reading" selected={(['lowSensory', 'highContrast', 'dyslexiaFont', 'reduceMotion', 'autoReadAloud', 'simpleLanguage'] as const).filter((k) => a[k])}
          options={[{ value: 'lowSensory', label: 'Low-sensory mode' }, { value: 'highContrast', label: 'High contrast' }, { value: 'dyslexiaFont', label: 'Easy-read font' }, { value: 'reduceMotion', label: 'Reduce motion' }, { value: 'autoReadAloud', label: 'Read screens aloud' }, { value: 'simpleLanguage', label: 'Simple language' }]}
          onToggle={(k) => toggleA11y(k)} />
        <ChipGroup label="Confirmations" selected={(['haptics', 'sounds'] as const).filter((k) => a[k])}
          options={[{ value: 'haptics', label: 'Vibration (phone)' }, { value: 'sounds', label: 'Sound (off = mute)' }]}
          onToggle={(k) => toggleA11y(k)} />
        <ChipGroup label="Text size" selected={[String(a.fontScale)]} options={[{ value: '1', label: 'Normal' }, { value: '1.25', label: 'Large' }, { value: '1.5', label: 'Extra large' }]}
          onToggle={(v) => update({ a11y: { ...a, fontScale: Number(v) as 1 | 1.25 | 1.5 } })} />
      </Card>
      <Card>
        <AppText variant="h2">My check-in scales (2 or 3)</AppText>
        <ChipGroup label={`Selected ${profile.trackedMetrics?.length ?? 0} of 3`} selected={profile.trackedMetrics ?? []}
          options={(Object.keys(METRICS) as MetricKey[]).map((m) => ({ value: m, label: METRICS[m].label }))}
          onToggle={(m) => {
            const cur = profile.trackedMetrics ?? [];
            const next = cur.includes(m) ? cur.filter((x) => x !== m) : cur.length >= 3 ? cur : [...cur, m];
            if (next.length >= 2) update({ trackedMetrics: next });
          }} />
      </Card>
      <Card>
        <AppText variant="h2">About me</AppText>
        <TextField label="First name" value={profile.displayName} onChangeText={(t) => update({ displayName: t })} voice={false} />
        <TextField label="Job title" value={profile.jobTitle ?? ''} onChangeText={(t) => update({ jobTitle: t })} voice={false} />
        <TextField label="Manager email" value={profile.managerEmail ?? ''} onChangeText={(t) => update({ managerEmail: t })} voice={false} keyboardType="email-address" />
        <TextField label="HR email" value={profile.hrEmail ?? ''} onChangeText={(t) => update({ hrEmail: t })} voice={false} keyboardType="email-address" />
      </Card>
      <Card>
        <AppText variant="h2">Privacy and consent</AppText>
        <ChipGroup label="I agree that" selected={(['healthData', 'aiProcessing'] as const).filter((k) => profile.consent[k])}
          options={[{ value: 'healthData', label: 'VibeCheck stores my health check-ins' }, { value: 'aiProcessing', label: 'AI processes them to help me' }]}
          onToggle={(k) => update({ consent: { ...profile.consent, [k]: !profile.consent[k], acceptedAt: new Date().toISOString() } })} />
        {profile.consent.healthData ? <ChipGroup label="My conditions (never shared unless you choose)" options={CONDITIONS} selected={profile.conditions}
          onToggle={(c) => update({ conditions: profile.conditions.includes(c) ? profile.conditions.filter((x) => x !== c) : [...profile.conditions, c] })} /> : null}
        <ChipGroup<DisclosureLevel> label="What can emails to my employer mention?" selected={[profile.disclosure]}
          options={[{ value: 'none', label: 'Only the adjustment I need' }, { value: 'general', label: 'That I have a health condition' }, { value: 'specific', label: 'My specific condition' }]}
          onToggle={(d) => update({ disclosure: d })} />
        <AppButton kind="secondary" label="Download my data" onPress={exportData} />
        <AppButton kind="secondary" label="Sign out" onPress={logout} />
        <AppButton kind="danger" label="Delete all my health data" hint="Deletes check-ins, summaries, plans and requests" onPress={deleteAll} />

      </Card>
    </Screen>
  );
}
