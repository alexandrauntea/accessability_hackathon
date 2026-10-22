// Owner: Alina. Clarifying chat -> editable draft -> explicit confirmation -> send.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, ChipGroup, Screen, TextField } from '@/src/shared/ui';
import { advocateChat, sendRequest } from '@/src/shared/api';
import { saveDraftEdits, watchRequest } from './requestRepo';
import type { AccommodationRequest, AdvocateReply } from '@/src/shared/types';

export default function RequestChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [req, setReq] = useState<AccommodationRequest | null>(null);
  const [text, setText] = useState('');
  const [last, setLast] = useState<AdvocateReply | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => (id ? watchRequest(id, setReq) : undefined), [id]);

  async function send() {
    if (!text.trim() || !id) return;
    setBusy(true);
    try { setLast(await advocateChat({ requestId: id, message: text })); setText(''); } finally { setBusy(false); }
  }
  async function submit() {
    if (!id || !confirmed) return;
    setBusy(true);
    try { const r = await sendRequest({ requestId: id, confirm: true }); setSent(r.mode === 'mock' ? 'Saved to outbox (demo mode, no real email sent).' : 'Email sent.'); }
    finally { setBusy(false); }
  }

  const draft = req?.draft;
  return (
    <Screen title="Support request" speakText={draft ? `Draft ready. Subject: ${draft.subject}. ${draft.body}` : 'Tell me briefly what is going on. You can type or dictate.'}>
      {req?.messages.length ? null : <AppText>Tell me briefly what's going on. Share only what you're comfortable with.</AppText>}
      {req?.messages.map((m, i) => (
        <Card key={i} ai={m.role === 'assistant'} accessibilityLabel={`${m.role === 'user' ? 'You' : 'VibeCheck'} said: ${m.text}`}>
          <AppText variant="muted">{m.role === 'user' ? 'You' : 'VibeCheck (AI)'}</AppText>
          <AppText>{m.text}</AppText>
        </Card>
      ))}
      {last?.type === 'safety' ? <Card><AppText accessibilityRole="alert">{last.message}</AppText>{last.resources.map((r) => <AppText key={r}>• {r}</AppText>)}</Card> : null}

      {!draft || req?.status === 'clarifying' ? (
        <View style={{ gap: 8 }}>
          <TextField label="Your answer" value={text} onChangeText={setText} multiline />
          <AppButton label="Send" onPress={send} busy={busy} disabled={!text.trim()} />
        </View>
      ) : null}

      {draft && req?.status !== 'sent' ? (
        <Card ai>
          <AppText variant="h2">Draft for you to review</AppText>
          <AiBadge why={`disclosure level: ${draft.disclosureUsed}`} />
          <AppText>To: {draft.to.join(', ')}</AppText>
          <TextField label="Subject" value={draft.subject} onChangeText={(s) => saveDraftEdits(id!, { ...draft, subject: s })} voice={false} />
          <TextField label="Message" value={draft.body} onChangeText={(b) => saveDraftEdits(id!, { ...draft, body: b })} multiline voice={false} />
          <ChipGroup label="Confirmation" options={[{ value: 'ok', label: 'I reviewed this and want to send it' }]} selected={confirmed ? ['ok'] : []} onToggle={() => setConfirmed(!confirmed)} />
          <AppButton label="Send to HR / manager" onPress={submit} disabled={!confirmed} busy={busy} />
        </Card>
      ) : null}
      {sent || req?.status === 'sent' ? <Card><AppText accessibilityRole="alert">{sent ?? 'This request was sent.'}</AppText></Card> : null}
    </Screen>
  );
}
