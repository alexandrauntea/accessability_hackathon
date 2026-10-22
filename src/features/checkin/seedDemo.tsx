// Owner: Andreea. Demo tools: turn THIS account into one persona with 6 weeks of check-ins.
// Use one browser profile / phone per persona (3 separate accounts).
import React, { useState } from 'react';
import { AppButton, AppText, Card } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { todayISO } from '@/src/shared/dates';
import { PERSONAS, PersonaId, personaMetrics } from '@/src/mocks/personas';
import { saveCheckin } from './checkinRepo';

export async function seedPersonaCheckins(id: PersonaId, days = 42) {
  for (let i = days; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    const p = personaMetrics(id, i, wd);
    await saveCheckin({ date: todayISO(d), metrics: p.metrics, sleepHours: p.sleepHours, symptoms: p.symptoms, workedLateYesterday: p.late, source: 'manual' });
  }
}

export function DemoPersonaPicker() {
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState<PersonaId | null>(null);
  async function apply(id: PersonaId) {
    setBusy(id);
    const p = PERSONAS[id];
    await update({
      displayName: p.displayName, jobTitle: p.jobTitle, categories: [p.category], conditions: p.conditions,
      trackedMetrics: p.trackedMetrics, disclosure: p.disclosure, demoPersona: id, onboarded: true,
      managerName: 'Radu', managerEmail: process.env.EXPO_PUBLIC_DEMO_MANAGER_EMAIL ?? '', hrEmail: process.env.EXPO_PUBLIC_DEMO_HR_EMAIL ?? '',
      consent: { healthData: true, aiProcessing: true, acceptedAt: new Date().toISOString() },
    });
    await seedPersonaCheckins(id);
    setBusy(null);
  }
  return (
    <Card>
      <AppText variant="h2">Demo tools</AppText>
      <AppText variant="muted">Current: {profile?.demoPersona ?? 'none'}. Loads profile + 6 weeks of check-ins into this account.</AppText>
      {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
        <AppButton key={id} kind="secondary" busy={busy === id} label={`Be ${PERSONAS[id].displayName} (${PERSONAS[id].category})`} hint={PERSONAS[id].story} onPress={() => apply(id)} />
      ))}
    </Card>
  );
}
