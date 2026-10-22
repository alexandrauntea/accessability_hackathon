// Owner: Alina. Entry point: pick what you need help with -> AI clarifies -> draft -> you send.
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, Screen, TextField } from '@/src/shared/ui';
import { decodeMessage } from '@/src/shared/api';
import { createRequest, watchRequests } from './requestRepo';
import type { AccommodationRequest, RequestCategory } from '@/src/shared/types';

const CATEGORIES: { value: RequestCategory; label: string; hint: string }[] = [
  { value: 'health', label: 'My symptoms affect my work', hint: 'Pain, fatigue or flare-ups that need a lighter or flexible day' },
  { value: 'appointment', label: 'I have a medical appointment', hint: 'Time off or a schedule change' },
  { value: 'mental_health_day', label: 'I need a mental health day', hint: 'A day to recover' },
  { value: 'social', label: 'Something is hard with colleagues', hint: 'Communication, meetings, unwritten rules' },
  { value: 'workload', label: 'My workload is too much', hint: 'Ask to redistribute tasks' },
];

export default function SupportScreen() {
  const [requests, setRequests] = useState<AccommodationRequest[]>([]);
  const [msg, setMsg] = useState('');
  const [decoded, setDecoded] = useState<Awaited<ReturnType<typeof decodeMessage>> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => watchRequests(setRequests), []);

  async function start(c: RequestCategory) { const id = await createRequest(c); router.push(`/request/${id}`); }
  async function decode() { setBusy(true); try { setDecoded(await decodeMessage({ text: msg })); } finally { setBusy(false); } }

  return (
    <Screen title="Ask for support" speakText="Choose what you need help with. I will ask a few questions and draft a message for you. Nothing is sent without your approval.">
      <AppText>I'll ask a few short questions, then draft a message. You review it; nothing is sent without your approval.</AppText>
      {CATEGORIES.map((c) => <AppButton key={c.value} kind="secondary" label={c.label} hint={c.hint} onPress={() => start(c.value)} />)}

      {/* Stretch: message decoder */}
      <Card>
        <AppText variant="h2">Decode a message</AppText>
        <TextField label="Paste a Slack or email message" value={msg} onChangeText={setMsg} multiline />
        <AppButton label="What do they mean?" onPress={decode} busy={busy} disabled={!msg} />
        {decoded ? (<>
          <AiBadge why={`confidence: ${decoded.confidence}`} />
          <AppText>{decoded.meaning}</AppText><AppText>Urgency: {decoded.urgency}</AppText><AppText>Possible reply: “{decoded.suggestedReply}”</AppText>
        </>) : null}
      </Card>

      {requests.length ? <Card>
        <AppText variant="h2">Your requests</AppText>
        {requests.map((r) => <AppButton key={r.id} kind="secondary" label={`${r.category} · ${r.status}`} onPress={() => router.push(`/request/${r.id}`)} />)}
      </Card> : null}
    </Screen>
  );
}
