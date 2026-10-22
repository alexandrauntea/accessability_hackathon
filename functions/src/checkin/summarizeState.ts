// Owner: Andreea. Explains deterministic stats in plain language. Numbers come from the client's computeStats().
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY, MODEL } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
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

export function generateFallbackSummary(date: string, stats: Stats): StateSummary {
  const worstDay = [...(stats.byWeekday ?? [])].filter((d) => d.n > 0).sort((a, b) => a.avgCapacity - b.avgCapacity)[0];
  const bestDay = [...(stats.byWeekday ?? [])].filter((d) => d.n > 0).sort((a, b) => b.avgCapacity - a.avgCapacity)[0];
  const patterns: string[] = [];

  if (worstDay && bestDay && worstDay.weekday !== bestDay.weekday) {
    patterns.push(`Capacity averages ${worstDay.avgCapacity} on ${worstDay.label}s versus ${bestDay.avgCapacity} on ${bestDay.label}s.`);
  }
  if (stats.last7 && stats.prev7) {
    patterns.push(`Average capacity over the last 7 workdays was ${stats.last7.avgCapacity} (compared to ${stats.prev7.avgCapacity} previously).`);
  }

  const suggestions = [
    'Place demanding tasks during your higher-capacity days.',
    'Keep meetings shorter and request asynchronous updates on lower-energy days.',
  ];

  let overloadSignal: string | undefined;
  if (stats.last7 && stats.last7.lateNights >= 4 && stats.last7.lowCapacityDays >= 2) {
    overloadSignal = `You worked after 8 pm on ${stats.last7.lateNights} of the last 7 workdays and reported low capacity ${stats.last7.lowCapacityDays} times. Consider asking to redistribute tasks.`;
  }

  return {
    date,
    headline: `Recent capacity averages ${stats.last7?.avgCapacity ?? 5} of 10.`,
    summary: `Over ${stats.days} recorded check-ins, your daily capacity shows identifiable weekly patterns. Work pacing can be aligned with your predictable energy rhythms.`,
    patterns,
    suggestions,
    overloadSignal,
    generatedBy: 'ai',
    model: 'fallback-deterministic',
  };
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
      return generateFallbackSummary(date || new Date().toISOString().slice(0, 10), {} as Stats);
    }

    const validNums = extractAllNumbers(stats);

    // Send only the numerical stats to the LLM (no raw free text, no medical condition names)
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

    let resultSummary: StateSummary;
    try {
      const out = await generateJson({
        system: SYSTEM,
        prompt,
        schema: OutSchema,
        temperature: 0.2,
      });

      // Grounding check: ensure every cited number exists in the input
      const isValid = validateCitedNumbers(out.citedNumbers ?? [], validNums);
      if (isValid) {
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
        // Fallback to deterministic code summary if hallucinated numbers detected
        resultSummary = generateFallbackSummary(date, stats);
      }
    } catch {
      // Fallback if AI call failed
      resultSummary = generateFallbackSummary(date, stats);
    }

    // Persist to Firestore server-side (only Cloud Functions have write permission under owner-only rules)
    try {
      await getFirestore().doc(`users/${uid}/summaries/${date}`).set(resultSummary);
    } catch {
      // non-blocking for response
    }

    return resultSummary;
  }
);