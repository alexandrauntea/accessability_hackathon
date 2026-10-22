// Owner: Andreea. Demo tools: turn THIS account into one persona with 6 weeks of check-ins.
// Use one browser profile / phone per persona (3 separate accounts).
import React, { useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/src/shared/firebase';
import { AppButton, AppText, Card } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { todayISO } from '@/src/shared/dates';
import { deriveCapacity } from '@/src/shared/metrics';
import { PERSONAS, PersonaId, personaMetrics } from '@/src/mocks/personas';
import type { Checkin } from '@/src/shared/types';

export async function seedPersonaCheckins(id: PersonaId, days = 42): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;
  const batch = writeBatch(db);
  const colRef = collection(db, 'users', uid, 'checkins');
  let count = 0;

  for (let i = days; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue; // skip weekends
    const p = personaMetrics(id, i, wd);
    const date = todayISO(d);
    const { capacityScore, capacity } = deriveCapacity(p.metrics);
    const checkin: Checkin = {
      date,
      metrics: p.metrics,
      sleepHours: p.sleepHours,
      symptoms: p.symptoms,
      workedLateYesterday: p.late,
      source: 'manual',
      capacityScore,
      capacity,
      createdAt: d.toISOString(),
    };
    batch.set(doc(colRef, date), checkin);
    count++;
  }

  await batch.commit();
  return count;
}

export function DemoPersonaPicker({ onSeeded }: { onSeeded?: () => void }) {
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState<PersonaId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function apply(id: PersonaId) {
    setBusy(id);
    setFeedback(null);
    try {
      const p = PERSONAS[id];
      await update({
        displayName: p.displayName,
        jobTitle: p.jobTitle,
        categories: [p.category],
        conditions: p.conditions,
        trackedMetrics: p.trackedMetrics,
        disclosure: p.disclosure,
        demoPersona: id,
        onboarded: true,
        managerName: 'Radu',
        managerEmail: process.env.EXPO_PUBLIC_DEMO_MANAGER_EMAIL ?? '',
        hrEmail: process.env.EXPO_PUBLIC_DEMO_HR_EMAIL ?? '',
        consent: { healthData: true, aiProcessing: true, acceptedAt: new Date().toISOString() },
      });
      const count = await seedPersonaCheckins(id);
      setFeedback(`Loaded ${p.displayName} profile and seeded ${count} check-ins.`);
      onSeeded?.();
    } catch {
      setFeedback('Failed to seed persona. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <AppText variant="h2">Demo tools</AppText>
      <AppText variant="muted">
        Current persona: {profile?.demoPersona ? PERSONAS[profile.demoPersona]?.displayName : 'none'}. Writes profile + 6 weeks of check-ins into this account.
      </AppText>
      {feedback ? (
        <AppText style={{ fontWeight: '700' }} accessibilityLiveRegion="polite">
          {feedback}
        </AppText>
      ) : null}
      {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
        <AppButton
          key={id}
          kind="secondary"
          busy={busy === id}
          label={`Be ${PERSONAS[id].displayName} (${PERSONAS[id].category})`}
          hint={PERSONAS[id].story}
          onPress={() => apply(id)}
        />
      ))}
    </Card>
  );
}