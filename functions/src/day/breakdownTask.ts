// Owner: Alexandra. "Task initiation" support: a concrete first step of <= 5 minutes.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
import { breakdownTaskFallback } from '../lib/aiFallbacks';
import type { WorkTask } from '../lib/types';

const Out = z.object({ firstStep: z.string().max(200), steps: z.array(z.string()).max(6) });
const SYSTEM = `You help people with ADHD, brain fog or fatigue start a stuck task.
firstStep: ONE physical, concrete action doable in 5 minutes, starting with a verb ("Open the churn dashboard and filter by EU").
steps: up to 6 next small steps. Use only details from the task; if unknown, keep it generic but concrete.`;

export const breakdownTask = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireAuth(req);
  const { task, capacity } = (req.data ?? {}) as { task: WorkTask; capacity: string };
  return generateJson({
    fnName: 'breakdownTask',
    system: SYSTEM,
    prompt: `Capacity today: ${capacity}. Task: ${JSON.stringify(task)}. Return { "firstStep", "steps" }.`,
    schema: Out,
    fallback: () => breakdownTaskFallback({ task, capacity: capacity as any }),
  });
});
