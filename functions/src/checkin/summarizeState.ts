// Owner: Andreea. Explains deterministic stats in plain language. Numbers come from the client's computeStats().
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY, MODEL } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';
import type { Checkin, StateSummary, Stats } from '../lib/types';

const Out = z.object({
  headline: z.string().max(160),
  summary: z.string().max(700),
  patterns: z.array(z.string()).max(4),
  suggestions: z.array(z.string()).max(4),
  overloadSignal: z.string().optional(),
});

const SYSTEM = `You summarise a person's recent self-reported wellbeing check-ins for them (not for their employer).
Scales are 1-10. physical_energy, focus, social_battery, capacity: higher = better; pain, brain_fog, sensory_load, anxiety, overwhelm: higher = worse.
Every pattern MUST quote a number from the provided stats (e.g. "capacity averages 3.4 on Mondays vs 6.1 on Thursdays").
Only call something a pattern if the difference is at least 1.5 points and n >= 3 for that weekday. Be explicit and literal; no metaphors.
Suggestions are about planning work (meeting placement, breaks, focus time), never medical.
If last7.lateNights >= 4 and last7.lowCapacityDays >= 2, set overloadSignal suggesting to ask for task redistribution.`;

export const summarizeState = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  const uid = requireUid(req);
  const { date, stats, recent, simpleLanguage } = req.data as { date: string; stats: Stats; recent: Checkin[]; simpleLanguage: boolean };
  const prompt = `Language: ${simpleLanguage ? 'easy-to-read English, short sentences, B1 level' : 'clear plain English'}.
Stats (computed in code, trust them): ${JSON.stringify(stats)}
Last 7 check-ins: ${JSON.stringify(recent.map((c) => ({ date: c.date, capacityScore: c.capacityScore, metrics: c.metrics, workedLateYesterday: c.workedLateYesterday })))}
Return JSON: { "headline": string, "summary": string, "patterns": string[], "suggestions": string[], "overloadSignal"?: string }`;
  const out = await generateJson({ system: SYSTEM, prompt, schema: Out });
  const result: StateSummary = { date, ...out, generatedBy: 'ai', model: MODEL };
  await getFirestore().doc(`users/${uid}/summaries/${date}`).set(result);
  return result;
});
