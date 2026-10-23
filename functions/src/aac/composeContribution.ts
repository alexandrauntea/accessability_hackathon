// Owner: Alexandra. Turns a rough note (or task list) into a clear, professional meeting contribution.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
import { composeContributionFallback } from '../lib/aiFallbacks';
import type { MeetingContribution, WorkTask, Checkin } from '../lib/types';

const Out = z.object({
  text: z.string().max(600),
  why: z.string().max(300),
});

const SYSTEM = `You voice workplace meeting contributions for an employee communicating in writing (e.g. autistic, non-speaking under stress, or with social anxiety).
Tone: calm, adult, confident, professional, first-person, strictly <= 80 words. No emojis, no fluff, no apologies unless written by the user.

Modes:
1. 'clarify' (or 'polish'): Rewrite the user's rough notes or question into a clear, direct, professional message. Preserve their exact stance.
2. 'calm': Reframe a potentially stressful question or update for a manager/team calmly and constructively to reduce communication anxiety.
3. 'status_update': Build a crisp status update strictly from the user's active tasks (done / in progress / blocked + what is needed to unblock).

Strict constraints:
- Maximum 80 words for 'text'.
- Never mention medical conditions, health details, fatigue, or capacity score unless explicitly typed by the user in their draft.
- Return JSON matching schema: { "text": string (<= 80 words), "why": string (1 brief sentence explaining the phrasing rationale) }.`;

export const composeContribution = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireAuth(req);
  const { draft = '', meetingTitle, tasks = [], mode = 'clarify' } = (req.data ?? {}) as {
    draft: string;
    meetingTitle?: string;
    tasks?: { id: string; title: string; status: string }[];
    mode: 'clarify' | 'calm' | 'status_update' | 'polish';
  };

  const effectiveMode = mode === 'polish' ? 'clarify' : mode;

  const prompt = `Mode: ${effectiveMode}. Meeting: ${meetingTitle ?? 'Workplace sync'}.
User's notes: """${draft.slice(0, 1500)}"""
${effectiveMode === 'status_update' ? `Open tasks: ${JSON.stringify(tasks.slice(0, 10))}` : ''}
Return JSON: { "text", "why" }.`;

  const result = await generateJson({
    fnName: 'composeContribution',
    system: SYSTEM,
    prompt,
    schema: Out,
    temperature: 0.3,
    fallback: () => composeContributionFallback({ draft, meetingTitle, tasks: tasks as any, mode: effectiveMode }),
  });

  const response: MeetingContribution = {
    text: result.text,
    why: result.why,
    spoken: result.text,
    chat: result.text,
  };

  return response;
});
