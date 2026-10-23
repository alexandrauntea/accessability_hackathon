// Owner: Alina. Support Screen:
// "What do you need at work?" (text or voice via useVoiceInput)
// + category-specific chips (async meetings, written instructions, flexible hours, quiet space, remote day, redistribute tasks)
// + 3 disclosure buttons -> "Draft my request" -> editable draft
// -> preview exactly what HR will see -> checkbox "I reviewed this and want to send it" -> send -> useFeedback().confirm()
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AiBadge, AppButton, AppText, Card, ChipGroup, IconHeader, Screen, StatCard, TextField } from '@/src/shared/ui';
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

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  workload: 'Workload accommodation',
  health: 'Health adjustment',
  mental_health_day: 'Mental health day',
  appointment: 'Appointment adjustment',
  social: 'Social/meeting adjustment',
  other: 'Workplace adjustment',
};

export default function SupportScreen() {
  const { profile } = useProfile();
  const { confirm: confirmFeedback } = useFeedback();
  const { c, font, radius, space } = useTheme();

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
        router.push(`/request/${id}`);
      }
    } catch (err: any) {
      console.warn('Falling back to resilient local accommodation draft:', err);
      const conditionMention = disclosure === 'specific' && profile?.conditions?.length
        ? `related to ${profile.conditions.join(', ')}`
        : disclosure === 'general'
        ? 'related to a health condition'
        : 'due to personal reasons';
      const fallbackSubject = `Request for workplace adjustment — ${profile?.displayName || 'Support Request'}`;
      const fallbackBody = `Dear ${profile?.managerName || 'Manager'},

I am writing to request a temporary workplace adjustment ${conditionMention}. Specifically, I would benefit from: ${combined.trim() || 'redistributing upcoming deliverables and flexible pacing'}.

These adjustments will allow me to maintain high-quality deliverables while managing my current capacity. I would welcome the opportunity to discuss this briefly.

Best regards,
${profile?.displayName || 'Employee'}`;
      setSubject(fallbackSubject);
      setBody(fallbackBody);
      setDraftReady(true);
      await confirmFeedback();
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
      title="Support & Accommodations"
      subtitle="Draft workplace adjustments with guaranteed medical privacy"
      speakText="What do you need at work? Choose adjustments, set disclosure, and draft your accommodation request. Nothing is sent without your approval."
    >
      {/* Row of small stat cards (real computed data) */}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <StatCard
          icon="file-tray-full-outline"
          value={requests.length}
          label="Requests"
          badgeText={requests.length === 0 ? 'Ready' : `${requests.length} total`}
          badgeKind="accent"
        />
        <StatCard
          icon="shield-checkmark-outline"
          value={disclosure === 'none' ? 'Private' : disclosure === 'general' ? 'General' : 'Specific'}
          label="Disclosure"
          badgeText="Protected"
          badgeKind="accent"
        />
        <StatCard
          icon="pulse-outline"
          value={overloadWarning ? 'Alert' : 'Steady'}
          label="Pacing"
          badgeText={overloadWarning ? 'Overload' : 'Sustainable'}
          badgeKind={overloadWarning ? 'warning' : 'success'}
        />
      </View>

      {overloadWarning && (
        <Card style={{ borderColor: c.warningText, borderWidth: 1.5, gap: space.sm }}>
          <IconHeader
            icon="warning-outline"
            title="Overload early-warning detected"
            subtitle={overloadWarning}
          />
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

      {/* Main Request Composer Card */}
      <Card>
        <IconHeader
          icon="hand-left-outline"
          title="What do you need at work?"
          subtitle="Type or dictate what is making work hard today. You can also pick from common adjustments below."
        />

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
        <Card style={{ borderColor: c.danger, borderWidth: 1.5 }}>
          <IconHeader
            icon="help-buoy-outline"
            title="Support and resources"
            subtitle={safetyAlert.message}
          />
          <View style={{ gap: space.xs, marginTop: space.xs }}>
            {safetyAlert.resources.map((res, i) => (
              <AppText key={i}>• {res}</AppText>
            ))}
          </View>
        </Card>
      )}

      {draftReady && (
        <Card ai>
          <IconHeader
            icon="document-text-outline"
            title="Review your accommodation draft"
          />
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
          <Card style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: space.xs, padding: space.md }}>
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
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }} aria-hidden={true} importantForAccessibility="no" />
            <AppText>{body}</AppText>
            <AppText variant="muted" style={{ marginTop: 4 }}>
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
        <Card style={{ borderColor: c.accent, borderWidth: 1.5 }}>
          <IconHeader
            icon="checkmark-circle-outline"
            title="Request sent"
            subtitle={sentMessage}
          />
        </Card>
      )}

      {/* Message Decoder */}
      <Card>
        <IconHeader
          icon="chatbubble-ellipses-outline"
          title="Decode a message"
          subtitle="Get a factual translation of unwritten workplace expectations"
        />
        <TextField
          label="Paste a Slack or email message"
          value={decodeMsg}
          onChangeText={setDecodeMsg}
          placeholder="e.g. When you have a moment, take a look at this..."
          multiline
        />
        <AppButton label="What do they mean?" onPress={decode} busy={decoding} disabled={!decodeMsg.trim()} />
        {decoded && (
          <View style={{ gap: space.xs, marginTop: space.xs }}>
            <AiBadge why={`Confidence: ${decoded.confidence}`} />
            <AppText><AppText style={{ fontWeight: '700' }}>Meaning: </AppText>{decoded.meaning}</AppText>
            <AppText><AppText style={{ fontWeight: '700' }}>Urgency: </AppText>{decoded.urgency}</AppText>
            <AppText><AppText style={{ fontWeight: '700' }}>Suggested reply: </AppText>"{decoded.suggestedReply}"</AppText>
          </View>
        )}
      </Card>

      {/* Prior Requests List (Journal Cards) */}
      {requests.length > 0 && (
        <Card style={{ gap: space.md }}>
          <IconHeader
            icon="book-outline"
            title={`Your requests (${requests.length})`}
            subtitle="View previous accommodation drafts and conversations"
          />

          <View style={{ gap: space.sm }}>
            {requests.map((r) => {
              const isSent = r.status === 'sent';
              const isDraft = r.status === 'draft';
              const statusBg = isSent ? c.successSoft : isDraft ? c.accentSoft : c.surface;
              const statusColor = isSent ? c.successText : isDraft ? c.onAccentSoft : c.textMuted;
              const categoryTitle = CATEGORY_LABELS[r.category] ?? 'Workplace adjustment';

              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Accommodation request: ${categoryTitle}, status ${r.status}`}
                  accessibilityHint="Open to view details and conversation"
                  onPress={() => router.push(`/request/${r.id}`)}
                  onKeyDown={(e: any) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault?.();
                      router.push(`/request/${r.id}`);
                    }
                  }}
                  style={({ focused }: any) => ({
                    cursor: 'pointer',
                    outlineStyle: focused ? 'solid' : undefined,
                    outlineWidth: focused ? 3 : 0,
                    outlineColor: c.focus,
                    outlineOffset: 2,
                    borderRadius: radius.card,
                  })}
                >
                  <Card
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      padding: space.md,
                      gap: space.xs,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                      <AppText style={{ fontWeight: '700', fontSize: 16, flex: 1 }}>
                        {categoryTitle}
                      </AppText>
                      <View
                        style={{
                          paddingHorizontal: space.sm,
                          paddingVertical: 2,
                          borderRadius: radius.pill,
                          backgroundColor: statusBg,
                          borderWidth: 1,
                          borderColor: statusColor,
                        }}
                      >
                        <AppText variant="small" style={{ color: statusColor, fontWeight: '700', textTransform: 'capitalize' }}>
                          {r.status}
                        </AppText>
                      </View>
                    </View>

                    {r.draft?.subject ? (
                      <AppText variant="muted" numberOfLines={1}>
                        {r.draft.subject}
                      </AppText>
                    ) : null}

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                        <Ionicons name="calendar-outline" size={14} color={c.textMuted} aria-hidden={true} importantForAccessibility="no" />
                        <AppText variant="small" style={{ color: c.textMuted }}>
                          {new Date(r.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </AppText>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={18} color={c.textMuted} aria-hidden={true} importantForAccessibility="no" />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}
    </Screen>
  );
}