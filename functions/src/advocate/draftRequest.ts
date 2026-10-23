// Owner: Alina. Callable draftRequest:
// requireUid -> detectCrisis -> generateJson with zod schema (subject, body, adjustments[], reasons) -> enforceDisclosure.
// Minimal input: user's text, disclosure level, Daily Capacity. Mock fallback if AI is unavailable.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';
import { detectCrisis, enforceDisclosure, SAFETY_SYSTEM } from '../lib/safety';
import type { Condition, DisclosureLevel, RequestCategory, RequestDraft, UserProfile } from '../lib/types';

export const DraftOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  adjustments: z.array(z.string()),
  reasons: z.array(z.string()),
  recipients: z.enum(['manager', 'hr', 'both']),
  notes: z.array(z.string()),
});
export type DraftOutput = z.infer<typeof DraftOutputSchema>;

export interface DraftRequestInput {
  requestId?: string;
  category?: RequestCategory;
  text: string;
  disclosure: DisclosureLevel;
  capacityScore?: number;
  conditions?: Condition[];
  displayName?: string;
  jobTitle?: string;
  managerEmail?: string;
  hrEmail?: string;
}

const SYSTEM = `
${SAFETY_SYSTEM}

You draft a clear, professional workplace accommodation request for an employee in their first job.
Focus strictly on concrete, practical adjustments (e.g. remote day, flexible start/end, async updates, protected focus blocks).
Keep it short (<= 150 words), respectful, polite, and work-oriented.
Tone: adult, factual, constructive. No guilt, no over-explaining.
The employer may only ever see Daily Capacity (e.g. 4/10), NEVER raw symptoms or unconsented medical terms.
Return JSON matching the schema with subject, body, adjustments[], reasons[], recipients, notes[].
`.trim();

export function createMockDraft(opts: {
  category?: string;
  text?: string;
  disclosure: DisclosureLevel;
  capacityScore?: number;
}): DraftOutput {
  const cap = opts.capacityScore ?? 5;
  const reason = `My current capacity is ${cap}/10, and I need temporary adjustments to maintain reliable, high-quality work.`;

  const adjustments = [
    'Work asynchronously where possible with written updates',
    'Shorten or reschedule non-essential meetings to protected focus time',
    'Provide clear written action items following discussions',
  ];

  const intro =
    opts.disclosure === 'none'
      ? 'For personal reasons'
      : opts.disclosure === 'general'
      ? 'Due to a health condition'
      : 'Due to my health needs';

  const body = `Hi,\n\nI am reaching out to request a temporary workplace adjustment to help me manage my workload effectively.\n\n${intro}, my current working capacity is ${cap}/10. To maintain steady progress on our team priorities, I would appreciate the following adjustments:\n\n- ${adjustments.join(
    '\n- '
  )}\n\nThank you for your understanding and support.\n\nBest regards`;

  return {
    subject: 'Request for temporary workplace adjustment',
    body,
    adjustments,
    reasons: [reason],
    recipients: 'manager',
    notes: [
      'You are never required to share a medical diagnosis.',
      'Only your daily capacity score (1-10) is mentioned to explain pacing.',
    ],
  };
}

export async function draftRequestCore(uid: string, input: DraftRequestInput) {
  // 1. Crisis check
  const textToCheck = input.text || '';
  const crisis = detectCrisis(textToCheck);
  if (crisis.crisis) {
    return {
      type: 'safety' as const,
      crisis: true,
      message: crisis.message!,
      resources: crisis.resources!,
    };
  }

  const db = getFirestore();
  let userText = input.text || '';
  let disclosure: DisclosureLevel = input.disclosure || 'general';
  let conditions: Condition[] = input.conditions || [];
  let capacityScore = input.capacityScore;
  let displayName = input.displayName || '';
  let jobTitle = input.jobTitle || '';
  let managerEmail = input.managerEmail;
  let hrEmail = input.hrEmail;

  // 2. Load context if requestId is supplied
  if (input.requestId) {
    const reqRef = db.doc(`users/${uid}/requests/${input.requestId}`);
    const today = new Date().toISOString().slice(0, 10);
    const [reqSnap, profSnap, ciSnap] = await Promise.all([
      reqRef.get(),
      db.doc(`users/${uid}`).get(),
      db.doc(`users/${uid}/checkins/${today}`).get(),
    ]);

    if (profSnap.exists) {
      const p = profSnap.data() as UserProfile;
      disclosure = input.disclosure ?? p.disclosure ?? 'general';
      conditions = input.conditions ?? p.conditions ?? [];
      displayName = input.displayName || p.displayName || '';
      jobTitle = input.jobTitle || p.jobTitle || '';
      managerEmail = input.managerEmail || p.managerEmail;
      hrEmail = input.hrEmail || p.hrEmail;
    }
    if (ciSnap.exists && capacityScore === undefined) {
      capacityScore = (ciSnap.data() as { capacityScore?: number }).capacityScore;
    }
    if (reqSnap.exists) {
      const r = reqSnap.data() as any;
      if (!userText && r.messages?.length) {
        userText = r.messages
          .filter((m: any) => m.role === 'user')
          .map((m: any) => m.text)
          .join('\n');
      }
    }
  }

  // 3. Generate Draft via AI or Mock fallback
  let draftResult: DraftOutput;
  try {
    const prompt = `Category: ${input.category || 'workplace adjustment'}.
Disclosure level: ${disclosure}.
Employee name: ${displayName || 'the employee'}.
Job title: ${jobTitle || 'unspecified'}.
Today's Daily Capacity: ${capacityScore ? `${capacityScore} / 10` : 'not specified'}.
${disclosure === 'specific' && conditions.length ? `Conditions user allowed mentioning: ${conditions.join(', ')}` : 'Do NOT mention specific diagnosis.'}
User's request in their words: """${userText}"""

Draft a request for workplace accommodation following the schema.`;

    draftResult = await generateJson({
      fnName: 'draftRequest',
      system: SYSTEM,
      prompt,
      schema: DraftOutputSchema,
      temperature: 0.4,
      fallback: () => createMockDraft({
        category: input.category,
        text: userText,
        disclosure,
        capacityScore,
      }),
    });
  } catch (err) {
    draftResult = createMockDraft({
      category: input.category,
      text: userText,
      disclosure,
      capacityScore,
    });
  }

  // 4. Post-processing: Enforce disclosure in code
  const sanitizedBody = enforceDisclosure(draftResult.body, disclosure, conditions);
  const sanitizedSubject = enforceDisclosure(draftResult.subject, disclosure, conditions);

  // 5. Recipients from user profile only
  const to = [
    ...(draftResult.recipients !== 'hr' && managerEmail ? [managerEmail] : []),
    ...(draftResult.recipients !== 'manager' && hrEmail ? [hrEmail] : []),
  ];

  const finalDraft: RequestDraft & { adjustments: string[]; reasons: string[] } = {
    to,
    subject: sanitizedSubject,
    body: sanitizedBody,
    adjustments: draftResult.adjustments,
    reasons: draftResult.reasons,
    disclosureUsed: disclosure,
  };

  // If requestId was provided, update Firestore doc
  if (input.requestId) {
    const reqRef = db.doc(`users/${uid}/requests/${input.requestId}`);
    const now = new Date().toISOString();
    await reqRef.set(
      {
        draft: {
          to: finalDraft.to,
          subject: finalDraft.subject,
          body: finalDraft.body,
          disclosureUsed: finalDraft.disclosureUsed,
        },
        status: 'draft',
        updatedAt: now,
      },
      { merge: true }
    );
  }

  return {
    type: 'draft' as const,
    category: input.category || 'other',
    draft: finalDraft,
    adjustments: finalDraft.adjustments,
    reasons: finalDraft.reasons,
    notes: draftResult.notes,
  };
}

export const draftRequest = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  const uid = requireUid(req);
  const data = req.data as DraftRequestInput;
  return draftRequestCore(uid, data);
});