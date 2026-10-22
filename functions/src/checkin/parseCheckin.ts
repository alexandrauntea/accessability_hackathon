// Owner: Andreea. Voice/text -> metric values. The UI pre-fills the scales and the user confirms.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';
import type { MetricKey } from '../lib/types';

const KEYS = ['physical_energy', 'pain', 'brain_fog', 'focus', 'sensory_load', 'social_battery', 'anxiety', 'overwhelm'] as const;
const Out = z.object({
  metrics: z.record(z.enum(KEYS), z.number().int().min(1).max(10)),
  symptoms: z.array(z.string()).max(6),
  notes: z.string().max(300),
  unclear: z.array(z.string()).max(4),
});

const SYSTEM = `You convert one spoken sentence from a daily work check-in into 1-10 values.
Scales: physical_energy, focus, social_battery: higher = better. pain, brain_fog, sensory_load, anxiety, overwhelm: higher = worse.
Rules: only fill a metric if the sentence supports it. An explicit number wins ("pain is 8" -> pain 8).
Map clear phrases conservatively ("can't concentrate" -> focus 2-3 or brain_fog 7-8 depending on which is tracked; "exhausted" -> physical_energy 2).
Only use the tracked metrics. Anything you cannot map goes to "unclear". Never guess silently. No medical interpretation.`;

export const parseCheckin = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireUid(req);
  const { transcript, tracked } = req.data as { transcript: string; tracked: MetricKey[] };
  const out = await generateJson({
    system: SYSTEM, temperature: 0.1, schema: Out,
    prompt: `Tracked metrics: ${tracked.join(', ')}.\nSentence: """${(transcript ?? '').slice(0, 500)}"""\nReturn { "metrics": {key: 1-10}, "symptoms": [], "notes": "short neutral summary", "unclear": [] }.`,
  });
  // Drop anything outside the user's tracked metrics (the user only sees and confirms those).
  const metrics = Object.fromEntries(Object.entries(out.metrics).filter(([k]) => tracked.includes(k as MetricKey)));
  return { ...out, metrics };
});
