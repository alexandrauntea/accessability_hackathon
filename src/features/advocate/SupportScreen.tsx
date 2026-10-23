// Owner: Alina. Support Screen:
// "What do you need at work?" (text or voice via useVoiceInput)
// + category-specific chips (async meetings, written instructions, flexible hours, quiet space, remote day, redistribute tasks)
// + 3 disclosure buttons -> "Draft my request" -> editable draft
// -> preview exactly what HR will see -> checkbox "I reviewed this and want to send it" -> send -> useFeedback().confirm()
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AiBadge, AppButton, AppText, Card, ChipGroup, Screen, TextField } from '@/src/shared/ui';
import { advocateChat, decodeMessage, sendRequest } from '@/src/shared/api';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { listCheckins } from '@/src/features/checkin/checkinRepo';
import { computeStats, overloadSignal } from '@/src/features/insights/stats';
import { createRequest, saveDraftEdits, watchRequests } from './requestRepo';
import type { AccommodationRequest, AdvocateReply, DisclosureLevel, RequestCategory } from '@/src/shared/types';

const COMMON_ADJUSTMENTS = [
  { value: 'redistribute tasks', label: 'Redistribute tasks / workload' },
  { value: 'async meetings', label: 'Async meetings' },
  { value: 'written instructions', label: 'Written instructions' },
  { value: 'flexible hours', label: 'Flexible hours' },
  { value: 'quiet space', label: 'Quiet space' },
  { value: 'remote day', label: 'Remote day' },
];

const DISCLOSURE_OPTIONS: { value: DisclosureLevel; label: string }[] = [
  { value: 'none', label: 'None (no health words)' },
  { value: 'general', label: 'General (a health condition)' },
  { value: 'specific', label: 'Specific (name my condition)' },
];

export default function SupportScreen() {
  const { profile } = useProfile();
  const { confirm: confirmFeedback } = useFeedback();
  const { c, font } = useTheme();

  const [needText, setNeedText] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [disclosure, setDisclosure] = useState<DisclosureLevel>(profile?.disclosure ?? 'general');

  const [currentReqId, setCurrentReqId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<{ message: string; resources: string[] } | null>(null);

  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  // Overload early-warning signal
  const [overloadWarning, setOverloadWarning] = useState<string | null>(null);

  // Decode message state
  const [decodeMsg, setDecodeMsg] = useState('');
  const [decoded, setDecoded] = useState<Awaited<ReturnType<typeof decodeMessage>> | null>(null);
  const [decoding, setDecoding] = useState(false);

  // Existing requests
  const [requests, setRequests] = useState<AccommodationRequest[]>([]);
  useEffect(() => watchRequests(setRequests), []);

  useEffect(() => {
    if (profile?.disclosure) {
      setDisclosure(profile.disclosure);
    }
  }, [profile?.disclosure]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    listCheckins(14)
      .then((cs) => {
        if (!active || !cs || cs.length === 0) return;
        const stats = computeStats(cs, profile.trackedMetrics ?? []);
        const sig = overloadSignal(stats);
        if (sig && active) {
          setOverloadWarning(sig);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [profile]);

  const toEmails = [
    ...(profile?.managerEmail ? [profile.managerEmail] : []),
    ...(profile?.hrEmail ? [profile.hrEmail] : []),
  ];

  const toggleChip = (chipVal: string) => {
    setSelectedChips((prev) =>
      prev.includes(chipVal) ? prev.filter((x) => x !== chipVal) : [...prev, chipVal]
    );
  };

  async function handleDraft() {
    const chipsSummary = selectedChips.join(', ');
    const combined = [
      needText.trim(),
      chipsSummary ? `Adjustments needed: ${chipsSummary}.` : '',
      `Disclosure preference: ${disclosure}.`,
    ]
      .filter(Boolean)
      .join(' ');

    if (!combined.trim()) return;

    setBusy(true);
    setSafetyAlert(null);
    setSentMessage(null);
    try {
      const id = await createRequest('workload');
      setCurrentReqId(id);
      const reply = await advocateChat({ requestId: id, message: combined });

      if (reply.type === 'safety') {
        setSafetyAlert({ message: reply.message, resources: reply.resources });
        setDraftReady(false);
      } else if (reply.type === 'draft') {
        setSubject(reply.draft.subject);
        setBody(reply.draft.body);
        setDraftReady(true);
      } else if (reply.type === 'question') {
        // If clarifying question returned, route to full conversation view
        router.push(`/request/${id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!currentReqId || !confirmed) return;
    setSending(true);
    try {
      await saveDraftEdits(currentReqId, {
        to: toEmails,
        subject,
        body,
        disclosureUsed: disclosure,
      });
      const res = await sendRequest({ requestId: currentReqId, confirm: true });
      await confirmFeedback();
      setSentMessage(
        res.mode === 'mock'
          ? 'Saved to outbox (demo mode, no email sent).'
          : 'Request sent to your manager/HR.'
      );
      setDraftReady(false);
      setNeedText('');
      setSelectedChips([]);
      setConfirmed(false);
    } finally {
      setSending(false);
    }
  }

  async function decode() {
    if (!decodeMsg.trim()) return;
    setDecoding(true);
    try {
      setDecoded(await decodeMessage({ text: decodeMsg }));
    } finally {
      setDecoding(false);
    }
  }

  return (
    <Screen
      title="Ask for support"
      speakText="What do you need at work? Choose adjustments, set disclosure, and draft your accommodation request. Nothing is sent without your approval."
    >
      {overloadWarning && (
        <Card style={{ borderColor: c.primary, borderWidth: 2, gap: 8 }}>
          <AppText variant="h2" accessibilityRole="alert">
            ⚡ Overload early-warning detected
          </AppText>
          <AppText>{overloadWarning}</AppText>
          <AppButton
            kind="secondary"
            label="Pre-fill workload redistribution request"
            hint="Add redistribute tasks and explain pacing"
            onPress={() => {
              if (!selectedChips.includes('redistribute tasks')) {
                setSelectedChips((prev) => [...prev, 'redistribute tasks']);
              }
              if (!needText) {
                setNeedText(
                  'I have worked late several days recently and my capacity is reduced. I would like to request temporarily redistributing non-urgent tasks to maintain sustainable pacing.'
                );
              }
            }}
          />
        </Card>
      )}

      <Card>
        <AppText variant="h2">What do you need at work?</AppText>
        <AppText variant="muted">
          Type or dictate what is making work hard today. You can also pick from common adjustments below.
        </AppText>

        <TextField
          label="Your request details"
          value={needText}
          onChangeText={setNeedText}
          placeholder="e.g. I need to focus on async tasks and redistribute upcoming deadlines..."
          multiline
          voice={true}
        />

        <ChipGroup
          label="Common adjustments"
          options={COMMON_ADJUSTMENTS}
          selected={selectedChips}
          onToggle={toggleChip}
        />

        <ChipGroup<DisclosureLevel>
          label="What can emails to your employer mention?"
          options={DISCLOSURE_OPTIONS}
          selected={[disclosure]}
          onToggle={(lvl) => setDisclosure(lvl)}
        />

        <AppButton
          label="Draft my request"
          hint="Create an AI-assisted accommodation request draft"
          onPress={handleDraft}
          busy={busy}
          disabled={!needText.trim() && selectedChips.length === 0}
        />
      </Card>

      {safetyAlert && (
        <Card style={{ borderColor: c.danger, borderWidth: 2 }}>
          <AppText variant="h2" accessibilityRole="alert" style={{ color: c.danger }}>
            Support and resources
          </AppText>
          <AppText>{safetyAlert.message}</AppText>
          <View style={{ gap: 4, marginTop: 4 }}>
            {safetyAlert.resources.map((res, i) => (
              <AppText key={i}>• {res}</AppText>
            ))}
          </View>
        </Card>
      )}

      {draftReady && (
        <Card ai>
          <AppText variant="h2">Review your accommodation draft</AppText>
          <AiBadge why={`Disclosure level: ${disclosure}. Health details filtered.`} />

          <TextField
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            voice={false}
          />

          <TextField
            label="Message body"
            value={body}
            onChangeText={setBody}
            multiline
            voice={false}
          />

          {/* Preview card: exactly what HR will receive */}
          <Card style={{ backgroundColor: c.surface, borderWidth: 2, borderColor: c.border, gap: 6 }}>
            <AppText variant="muted" style={{ fontWeight: '700' }}>
              Preview (what your manager / HR will receive):
            </AppText>
            <AppText>
              <AppText style={{ fontWeight: '700' }}>To: </AppText>
              {toEmails.join(', ') || 'No recipient set (Add manager or HR email in Me)'}
            </AppText>
            <AppText>
              <AppText style={{ fontWeight: '700' }}>Subject: </AppText>
              {subject}
            </AppText>
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }} />
            <AppText>{body}</AppText>
            <AppText variant="muted" style={{ fontSize: Math.max(12, font.small - 1), marginTop: 4 }}>
              —{'\n'}Written with the help of VibeCheck, reviewed and sent by {profile?.displayName || 'me'}.
            </AppText>
          </Card>

          <ChipGroup
            label="Confirmation"
            options={[{ value: 'confirmed', label: 'I reviewed this and want to send it' }]}
            selected={confirmed ? ['confirmed'] : []}
            onToggle={() => setConfirmed(!confirmed)}
          />

          <AppButton
            label="Send request"
            hint="Send this request to your manager or HR"
            onPress={handleSend}
            disabled={!confirmed || toEmails.length === 0}
            busy={sending}
          />

          {!toEmails.length && (
            <AppText variant="muted" accessibilityRole="alert" style={{ color: c.danger }}>
              Please add a manager or HR email in the Me tab before sending.
            </AppText>
          )}
        </Card>
      )}

      {sentMessage && (
        <Card style={{ borderColor: c.primary, borderWidth: 2 }}>
          <AppText variant="h2" accessibilityRole="alert">
            Request sent
          </AppText>
          <AppText>{sentMessage}</AppText>
        </Card>
      )}

      {/* Message Decoder */}
      <Card>
        <AppText variant="h2">Decode a message</AppText>
        <TextField
          label="Paste a Slack or email message"
          value={decodeMsg}
          onChangeText={setDecodeMsg}
          placeholder="e.g. When you have a moment, take a look at this..."
          multiline
        />
        <AppButton label="What do they mean?" onPress={decode} busy={decoding} disabled={!decodeMsg.trim()} />
        {decoded && (
          <>
            <AiBadge why={`Confidence: ${decoded.confidence}`} />
            <AppText><AppText style={{ fontWeight: '700' }}>Meaning: </AppText>{decoded.meaning}</AppText>
            <AppText><AppText style={{ fontWeight: '700' }}>Urgency: </AppText>{decoded.urgency}</AppText>
            <AppText><AppText style={{ fontWeight: '700' }}>Suggested reply: </AppText>“{decoded.suggestedReply}”</AppText>
          </>
        )}
      </Card>

      {/* Prior Requests List */}
      {requests.length > 0 && (
        <Card>
          <AppText variant="h2">Your requests</AppText>
          {requests.map((r) => (
            <AppButton
              key={r.id}
              kind="secondary"
              label={`${r.category} · ${r.status}`}
              onPress={() => router.push(`/request/${r.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
