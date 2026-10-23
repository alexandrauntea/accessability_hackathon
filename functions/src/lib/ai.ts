// Owner: Alexandra (foundation, frozen after hour 2). The ONLY place that talks to Gemini.
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { GUARDRAILS } from './safety';

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

let client: GoogleGenAI | null = null;
const ai = () => {
  let apiKey = '';
  try {
    apiKey = typeof GEMINI_API_KEY?.value === 'function' ? GEMINI_API_KEY.value() : '';
  } catch {
    // ignore
  }
  apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'AI key is not configured.');
  }
  return (client ??= new GoogleGenAI({ apiKey }));
};

/**
 * Ask Gemini for JSON, validate it with zod, retry once with the validation error.
 * Guaranteed 8-second timeout and mandatory fallback() on error, 429 quota, or AI_MODE=fallback.
 */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  fallback: () => T;
  fnName?: string;
}): Promise<T> {
  const start = Date.now();
  const fn = opts.fnName || 'generateJson';
  const aiMode = process.env.AI_MODE || 'live';

  // If AI_MODE is explicitly set to "fallback", bypass Gemini completely
  if (aiMode === 'fallback') {
    const fallbackRes = opts.schema.parse(opts.fallback());
    logger.info('AI execution', { fn, outcome: 'fallback', reason: 'AI_MODE=fallback', ms: Date.now() - start });
    return fallbackRes;
  }

  const systemInstruction = `${opts.system}\n\n${GUARDRAILS}\n\nReply with ONE JSON object only, no markdown.`;
  let prompt = opts.prompt;
  const timeoutMs = 8000;

  try {
    const callPromise = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        let res;
        try {
          res = await ai().models.generateContent({
            model: MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: opts.temperature ?? 0.4,
              responseMimeType: 'application/json',
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
              ],
            },
          });
        } catch (err: any) {
          if (attempt === 1) throw err;
          continue;
        }

        const text = res.text ?? '';
        try {
          return opts.schema.parse(JSON.parse(text));
        } catch (e) {
          prompt = `${opts.prompt}\n\nYour previous answer was invalid (${String(e).slice(0, 300)}). Return valid JSON matching the schema.`;
        }
      }
      throw new Error('AI returned invalid output twice');
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error('AI timeout after 8s'));
      }, timeoutMs);
    });

    const result = await Promise.race([callPromise, timeoutPromise]);
    logger.info('AI execution', { fn, outcome: 'live', reason: 'success', ms: Date.now() - start });
    return result;
  } catch (err: any) {
    const ms = Date.now() - start;
    const msg = String(err?.message ?? err);
    const reason = msg.includes('timeout')
      ? 'timeout_8s'
      : msg.includes('429') || err?.status === 'RESOURCE_EXHAUSTED' || msg.includes('quota')
      ? 'quota_429'
      : 'call_error';

    logger.warn('AI execution', { fn, outcome: 'fallback', reason, ms });
    return opts.schema.parse(opts.fallback());
  }
}
