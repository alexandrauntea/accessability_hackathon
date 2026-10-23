// Owner: Alina (stretch). Explains ambiguous workplace messages; flags low confidence instead of guessing.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';
import { decodeMessageFallback } from '../lib/aiFallbacks';

const Out = z.object({ meaning: z.string(), urgency: z.string(), suggestedReply: z.string(), confidence: z.enum(['low', 'medium', 'high']) });
const SYSTEM = `You explain workplace messages literally and kindly for autistic / neurodivergent employees.
meaning: what the sender most likely means, including implied expectations ("when you have time" usually = within 1-2 working days).
urgency: concrete timeframe. suggestedReply: short, polite. confidence: low if the message is genuinely ambiguous; then say what to ask.`;

export const decodeMessage = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireUid(req);
  const { text = '', context } = (req.data ?? {}) as { text: string; context?: string };
  return generateJson({
    fnName: 'decodeMessage',
    system: SYSTEM,
    prompt: `Message: """${text.slice(0, 2000)}"""
Context: ${context ?? 'none'}
Return { "meaning","urgency","suggestedReply","confidence" }.`,
    schema: Out,
    fallback: () => decodeMessageFallback({ text, context }),
  });
});
