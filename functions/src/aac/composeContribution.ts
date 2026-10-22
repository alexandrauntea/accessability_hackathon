// Owner: Alexandra. Turns a rough note (or the task list) into a clear, professional meeting contribution.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';

const Out = z.object({ spoken: z.string().max(400), chat: z.string().max(600) });
const SYSTEM = `You voice meeting contributions for an employee who communicates in writing (autistic, non-speaking, or anxious).
Keep THEIR meaning and stance exactly; do not add opinions, promises, dates or facts they did not give.
Style: clear, direct, professional, first person, no filler, no apologies unless they wrote one. spoken: <= 3 short sentences, easy for text-to-speech.
chat: the same content, may use a short list. Never mention health, diagnosis or capacity unless the user's text does.
status_update mode: summarise only from the task list given (done / in progress / blocked + what is needed to unblock).`;

export const composeContribution = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireUid(req);
  const { draft, meetingTitle, tasks, mode } = req.data as { draft: string; meetingTitle?: string; tasks?: { id: string; title: string; status: string }[]; mode: 'polish' | 'status_update' };
  const prompt = `Mode: ${mode}. Meeting: ${meetingTitle ?? 'unknown'}.
User's words: """${(draft ?? '').slice(0, 1500)}"""
${mode === 'status_update' ? `Open tasks: ${JSON.stringify(tasks ?? [])}` : ''}
Return { "spoken", "chat" }.`;
  return generateJson({ system: SYSTEM, prompt, schema: Out, temperature: 0.3 });
});
