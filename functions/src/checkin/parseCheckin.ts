// Owner: Andreea. Voice/text -> metric values. The UI pre-fills the scales and the user confirms.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
import { detectCrisis } from '../lib/safety';
import { parseCheckinFallback } from '../lib/aiFallbacks';
import type { MetricKey, ParsedCheckin } from '../lib/types';

const KEYS = [
  'physical_energy',
  'pain',
  'brain_fog',
  'focus',
  'sensory_load',
  'social_battery',
  'anxiety',
  'overwhelm',
] as const;

const OutSchema = z.object({
  metrics: z.record(z.string(), z.number()).default({}),
  symptoms: z.array(z.string()).max(6).default([]),
  notes: z.string().max(300).default(''),
  unclear: z.array(z.string()).max(6).default([]),
});

const SYSTEM = `You convert one spoken sentence from a daily work check-in into integer values for the user's tracked metrics.
Scales:
- physical_energy, focus, social_battery: higher = better (1 = none/exhausted, 10 = peak).
- pain, brain_fog, sensory_load, anxiety, overwhelm: higher = worse (1 = none, 10 = severe/unmanageable).

Strict rules:
- ONLY assign a value to a metric if the sentence clearly and directly supports it.
- Explicit numbers or ratings win ("pain is 8" -> pain: 8; "energy 3" -> physical_energy: 3; "pain 11" -> pain: 11; "energy zero" -> physical_energy: 0).
- If concentration/clarity is impaired ("can't concentrate", "cannot focus"):
  - if "brain_fog" is tracked, set brain_fog to high (7 or 8).
  - if "focus" is tracked, set focus to low (2 or 3).
- Map clear fatigue phrases ("low energy", "exhausted") to physical_energy 2 or 3.
- If a sentence does not give a rating for a metric (e.g. "I slept badly", "Same as usual"), DO NOT invent or assume any metric values! Place phrases you cannot map into "unclear".
- Only include metrics from the provided tracked list.
- Keep "notes" to a neutral, brief 1-sentence summary without clinical interpretation.
- Never provide medical advice, diagnosis, or treatment recommendations.`;

export const parseCheckin = onCall(
  { region: REGION, secrets: [GEMINI_API_KEY], maxInstances: 5 },
  async (req): Promise<ParsedCheckin> => {
    requireAuth(req);
    const data = (req.data ?? {}) as {
      transcript?: string;
      text?: string;
      tracked?: MetricKey[];
      metricKeys?: MetricKey[];
    };
    const transcript = (data.transcript ?? data.text ?? '').trim().slice(0, 500);
    const tracked: MetricKey[] = (data.tracked ?? data.metricKeys ?? []).filter((k): k is MetricKey =>
      KEYS.includes(k as any)
    );

    // Crisis detection safeguard before calling the AI model
    const crisisCheck = detectCrisis(transcript);
    if (crisisCheck.crisis) {
      return {
        metrics: {},
        symptoms: [],
        notes: crisisCheck.message ?? 'Crisis support resources triggered',
        unclear: ['Crisis keyword detected. Please reach out to emergency resources.'],
      };
    }

    if (!transcript) {
      return { metrics: {}, symptoms: [], notes: '', unclear: [] };
    }

    const prompt = `Tracked metrics: ${tracked.join(', ')}.
Spoken sentence: """${transcript}"""
Return JSON matching schema: { "metrics": { [key]: number }, "symptoms": string[], "notes": string, "unclear": string[] }`;

    const out = await generateJson({
      fnName: 'parseCheckin',
      system: SYSTEM,
      prompt,
      schema: OutSchema,
      temperature: 0.1,
      fallback: () => parseCheckinFallback({ transcript, tracked }),
    });

    const processedMetrics: Partial<Record<MetricKey, number>> = {};
    for (const [key, rawVal] of Object.entries(out.metrics ?? {})) {
      if (tracked.includes(key as MetricKey) && typeof rawVal === 'number' && !isNaN(rawVal)) {
        processedMetrics[key as MetricKey] = Math.max(1, Math.min(10, Math.round(rawVal)));
      }
    }

    return {
      metrics: processedMetrics,
      symptoms: out.symptoms ?? [],
      notes: out.notes ?? '',
      unclear: out.unclear ?? [],
    };
  }
);
