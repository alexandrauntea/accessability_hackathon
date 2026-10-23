// Owner: Alina. Clarifying chat -> editable draft -> explicit confirmation -> send.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AiBadge, AppButton, AppText, Card, ChipGroup, IconHeader, Screen, TextField } from '@/src/shared/ui';
import { advocateChat, sendRequest } from '@/src/shared/api';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { saveDraftEdits, watchRequest } from './requestRepo';
import type { AccommodationRequest, AdvocateReply } from '@/src/shared/types';

export default function RequestChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { confirm: confirmFeedback } = useFeedback();
  const { c, space } = useTheme();

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
    try {
      setLast(await advocateChat({ requestId: id, message: text }));
      setText('');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!id || !confirmed) return;
    setBusy(true);
    try {
      const r = await sendRequest({ requestId: id, confirm: true });
      await confirmFeedback();
      setSent(r.mode === 'mock' ? 'Saved to outbox (demo mode, no real email sent).' : 'Email sent.');
    } finally {
      setBusy(false);
    }
  }

  const draft = req?.draft;

  return (
    <Screen
      title="Support Request"
      subtitle="Clarify details with VibeCheck before reviewing your draft"
      speakText={
        draft
          ? `Draft ready. Subject: ${draft.subject}. ${draft.body}`
          : 'Tell me briefly what is going on. You can type or dictate.'
      }
    >
      {req?.messages.length ? null : (
        <Card>
          <AppText variant="muted">
            Tell me briefly what is going on. Share only what you are comfortable with.
          </AppText>
        </Card>
      )}

      {req?.messages.map((m, i) => {
        const isAssistant = m.role === 'assistant';
        return (
          <Card
            key={i}
            ai={isAssistant}
            accessibilityLabel={`${isAssistant ? 'VibeCheck' : 'You'} said: ${m.text}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons
                name={isAssistant ? 'sparkles-outline' : 'person-outline'}
                size={16}
                color={isAssistant ? c.accent : c.textMuted}
                aria-hidden={true}
                importantForAccessibility="no"
              />
              <AppText variant="muted" style={{ fontWeight: '600' }}>
                {isAssistant ? 'VibeCheck (AI)' : 'You'}
              </AppText>
            </View>
            <AppText>{m.text}</AppText>
          </Card>
        );
      })}

      {last?.type === 'safety' ? (
        <Card style={{ borderColor: c.danger, borderWidth: 1.5 }}>
          <IconHeader
            icon="help-buoy-outline"
            title="Support and resources"
            subtitle={last.message}
          />
          <View style={{ gap: space.xs, marginTop: space.xs }}>
            {last.resources.map((r) => (
              <AppText key={r}>• {r}</AppText>
            ))}
          </View>
        </Card>
      ) : null}

      {!draft || req?.status === 'clarifying' ? (
        <Card>
          <TextField
            label="Your answer"
            value={text}
            onChangeText={setText}
            placeholder="Type your reply here..."
            multiline
          />
          <AppButton label="Send reply" onPress={send} busy={busy} disabled={!text.trim()} />
        </Card>
      ) : null}

      {draft && req?.status !== 'sent' ? (
        <Card ai>
          <IconHeader
            icon="document-text-outline"
            title="Draft for you to review"
            subtitle="Review every word before giving your confirmed approval"
          />
          <AiBadge why={`Disclosure level: ${draft.disclosureUsed}`} />

          <AppText>
            <AppText style={{ fontWeight: '700' }}>To: </AppText>
            {draft.to.join(', ') || 'No recipient set'}
          </AppText>

          <TextField
            label="Subject"
            value={draft.subject}
            onChangeText={(s) => saveDraftEdits(id!, { ...draft, subject: s })}
            voice={false}
          />

          <TextField
            label="Message body"
            value={draft.body}
            onChangeText={(b) => saveDraftEdits(id!, { ...draft, body: b })}
            multiline
            voice={false}
          />

          <ChipGroup
            label="Confirmation"
            options={[{ value: 'ok', label: 'I reviewed this and want to send it' }]}
            selected={confirmed ? ['ok'] : []}
            onToggle={() => setConfirmed(!confirmed)}
          />

          <AppButton
            label="Send to HR / manager"
            hint="Send this confirmed accommodation draft"
            onPress={submit}
            disabled={!confirmed}
            busy={busy}
          />
        </Card>
      ) : null}

      {sent || req?.status === 'sent' ? (
        <Card style={{ borderColor: c.accent, borderWidth: 1.5 }}>
          <IconHeader
            icon="checkmark-circle-outline"
            title="Request status"
            subtitle={sent ?? 'This request was sent.'}
          />
        </Card>
      ) : null}
    </Screen>
  );
}