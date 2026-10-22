// Owner: Alina. Clarify (max 3 questions) -> draft. Recipients + disclosure come from the PROFILE, never from the model.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';
import { crisisCheck, enforceDisclosure } from '../lib/safety';
import type { AccommodationRequest, AdvocateReply, ChatMessage, UserProfile } from '../lib/types';

const MAX_QUESTIONS = 3;

const Out = z.discriminatedUnion('type', [
  z.object({ type: z.literal('question'), question: z.string(), why: z.string() }),
  z.object({
    type: z.literal('draft'),
    category: z.enum(['health', 'social', 'appointment', 'mental_health_day', 'workload', 'other']),
    subject: z.string(), body: z.string(), notes: z.array(z.string()),
    recipients: z.enum(['manager', 'hr', 'both']),
  }),
]);

const SYSTEM = `You help an employee in their first job ask for a workplace adjustment (reasonable accommodation).
Process: ask ONE short clarifying question at a time until you know: what is happening (in the user's words), how it affects work,
what concrete adjustment they want (e.g. remote day, later start, shorter meetings, a day off, task redistribution, written agendas),
for how long / which dates, and whether it is urgent. Ask at most ${MAX_QUESTIONS} questions in total; then draft.
If the user is unsure what to ask for, offer 2-3 common, reasonable options as part of your question.
Draft: professional, warm, short (<= 150 words), first person, focused on the adjustment and on keeping work going.
Disclosure levels: none = do not mention health at all ("for personal reasons"); general = "a health condition" only; specific = may name the condition the user named.
For social issues: neutral, non-blaming, ask for a conversation or a concrete change (e.g. agenda before meetings).
Recipients: manager for day-to-day adjustments; hr for formal/long-term accommodation; both if unsure.
notes: 1-3 tips for the user (e.g. "You don't have to share a diagnosis").`;

export const advocateChat = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req): Promise<AdvocateReply> => {
  const uid = requireUid(req);
  const { requestId, message } = req.data as { requestId: string; message: string };
  if (!message?.trim()) throw new HttpsError('invalid-argument', 'Empty message');

  const db = getFirestore();
  const ref = db.doc(`users/${uid}/requests/${requestId}`);
  const today = new Date().toISOString().slice(0, 10);
  const [reqSnap, profSnap, ciSnap] = await Promise.all([ref.get(), db.doc(`users/${uid}`).get(), db.doc(`users/${uid}/checkins/${today}`).get()]);
  const capacityScore = ciSnap.exists ? (ciSnap.data() as { capacityScore?: number }).capacityScore : undefined;
  if (!reqSnap.exists) throw new HttpsError('not-found', 'Request not found');
  const r = reqSnap.data() as AccommodationRequest;
  const p = profSnap.data() as UserProfile;
  const now = new Date().toISOString();
  const messages: ChatMessage[] = [...(r.messages ?? []), { role: 'user', text: message, at: now }];

  const crisis = crisisCheck(message);
  if (crisis) {
    await ref.update({ messages: [...messages, { role: 'assistant', text: crisis.message, at: now }] });
    return crisis;
  }

  const asked = messages.filter((m) => m.role === 'assistant').length;
  const prompt = `Category chosen: ${r.category}. Disclosure level: ${p.disclosure}. User's first name: ${p.displayName || 'the employee'}. Job: ${p.jobTitle ?? 'unknown'}.
Today's Daily Capacity: ${capacityScore ?? 'not checked in'} / 10 (1 = only short async tasks, 5 = normal, 10 = full flow). This single number is the ONLY wellbeing data you may put in the email, never individual symptoms or scores.
Conditions the user listed (use ONLY if disclosure = specific): ${p.disclosure === 'specific' ? p.conditions.join(', ') : 'hidden'}.
Questions already asked: ${asked} of ${MAX_QUESTIONS}. ${asked >= MAX_QUESTIONS ? 'You MUST draft now.' : ''}
Conversation: ${JSON.stringify(messages.map((m) => ({ role: m.role, text: m.text })))}
Return JSON, either { "type":"question","question","why" } or { "type":"draft","category","subject","body","notes","recipients" }.`;

  const out = await generateJson({ system: SYSTEM, prompt, schema: Out, temperature: 0.5 });

  if (out.type === 'question') {
    await ref.update({ messages: [...messages, { role: 'assistant', text: out.question, at: now }], status: 'clarifying' });
    return out;
  }
  const to = [
    ...(out.recipients !== 'hr' && p.managerEmail ? [p.managerEmail] : []),
    ...(out.recipients !== 'manager' && p.hrEmail ? [p.hrEmail] : []),
  ];
  const draft = { to, subject: out.subject, body: enforceDisclosure(out.body, p.disclosure, p.conditions), disclosureUsed: p.disclosure };
  await ref.update({
    messages: [...messages, { role: 'assistant', text: 'Here is a draft. Edit anything you like, then confirm to send.', at: now }],
    status: 'draft', category: out.category, draft,
  });
  return { type: 'draft', category: out.category, draft, notes: out.notes };
});
