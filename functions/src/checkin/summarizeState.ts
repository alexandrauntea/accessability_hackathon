// Owner: Andreea. Explains deterministic stats in plain language. Numbers come from the client's computeStats().
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY, MODEL } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
import { summarizeStateFallback } from '../lib/aiFallbacks';
import type { Checkin, StateSummary, Stats } from '../lib/types';

const OutSchema = z.object({
  headline: z.string().max(160),
  summary: z.string().max(700),
  patterns: z.array(z.string()).max(4).default([]),
  suggestions: z.array(z.string()).max(4).default([]),
  overloadSignal: z.string().optional(),
  citedNumbers: z.array(z.number()).default([]),
});

const SYSTEM = `You summarise a person's recent self-reported wellbeing check-ins for them (not for their employer).
Scales are 1-10. physical_energy, focus, social_battery, capacity: higher = better; pain, brain_fog, sensory_load, anxiety, overwhelm: higher = worse.
Strict grounding:
- You may ONLY quote numbers that appear in the provided stats object.
- List all numbers you quote in "citedNumbers".
- Every pattern MUST quote a real number from the provided stats (e.g. "capacity averages 3.4 on Mondays vs 6.1 on Thursdays").
- Suggestions MUST be strictly about work organization (meeting placement, breaks, asynchronous communication, focus time), NEVER medical or clinical advice.
- Keep tone calm, clear, adult and respectful.
- If last7.lateNights >= 4 and last7.lowCapacityDays >= 2, include an overloadSignal suggesting to ask for task redistribution.`;

export function extractAllNumbers(stats: Stats): number[] {
  const nums: number[] = [stats.days];
  for (const w of stats.byWeekday ?? []) {
    nums.push(w.weekday, w.avgCapacity, w.n);
    for (const v of Object.values(w.avg ?? {})) {
      if (typeof v === 'number') nums.push(v);
    }
  }
  if (stats.last7) {
    nums.push(stats.last7.avgCapacity, stats.last7.lateNights, stats.last7.lowCapacityDays);
    for (const v of Object.values(stats.last7.avg ?? {})) {
      if (typeof v === 'number') nums.push(v);
    }
  }
  if (stats.prev7) {
    nums.push(stats.prev7.avgCapacity);
    for (const v of Object.values(stats.prev7.avg ?? {})) {
      if (typeof v === 'number') nums.push(v);
    }
  }
  if (typeof stats.sleepCapacityCorrelation === 'number') {
    nums.push(stats.sleepCapacityCorrelation);
  }
  return nums;
}

export function validateCitedNumbers(cited: number[], valid: number[], tolerance = 0.2): boolean {
  return cited.every((c) => valid.some((v) => Math.abs(c - v) <= tolerance));
}

export const summarizeState = onCall(
  { region: REGION, secrets: [GEMINI_API_KEY], maxInstances: 5 },
  async (req): Promise<StateSummary> => {
    const uid = requireAuth(req);
    const { date, stats, recent, simpleLanguage } = (req.data ?? {}) as {
      date: string;
      stats: Stats;
      recent?: Checkin[];
      simpleLanguage?: boolean;
    };

    if (!stats) {
      return summarizeStateFallback({ date: date || new Date().toISOString().slice(0, 10), stats: {} as Stats });
    }

    const validNums = extractAllNumbers(stats);

    const prompt = `Language: ${simpleLanguage ? 'easy-to-read English, short sentences' : 'clear plain English'}.
Stats (computed in code, trust only these numbers):
${JSON.stringify({
  daysTracked: stats.days,
  byWeekday: stats.byWeekday,
  last7: stats.last7,
  prev7: stats.prev7,
  sleepCapacityCorrelation: stats.sleepCapacityCorrelation,
})}

Return JSON: { "headline": string, "summary": string, "patterns": string[], "suggestions": string[], "overloadSignal"?: string, "citedNumbers": number[] }`;

    const out = await generateJson({
      fnName: 'summarizeState',
      system: SYSTEM,
      prompt,
      schema: OutSchema,
      temperature: 0.2,
      fallback: () => summarizeStateFallback({ date, stats, recent, simpleLanguage }),
    });

    let resultSummary: StateSummary;
    const isValid = validateCitedNumbers(out.citedNumbers ?? [], validNums);
    if (isValid && out.headline) {
      resultSummary = {
        date,
        headline: out.headline,
        summary: out.summary,
        patterns: out.patterns ?? [],
        suggestions: out.suggestions ?? [],
        overloadSignal: out.overloadSignal,
        generatedBy: 'ai',
        model: MODEL,
      };
    } else {
      resultSummary = summarizeStateFallback({ date, stats, recent, simpleLanguage });
    }

    try {
      await getFirestore().doc(`users/${uid}/summaries/${date}`).set(resultSummary);
    } catch {
      // non-blocking
    }

    return resultSummary;
  }
);

export const generateFallbackSummary = (date: string, stats: Stats) => summarizeStateFallback({ date, stats });
