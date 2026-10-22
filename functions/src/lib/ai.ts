// Owner: Alexandra (foundation, frozen after hour 2). The ONLY place that talks to Gemini.
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { GUARDRAILS } from './safety';

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() }));

/**
 * Ask Gemini for JSON, validate it with zod, retry once with the validation error.
 * Throws if the model still returns invalid output — callers show a friendly fallback.
 */
export async function generateJson<T>(opts: { system: string; prompt: string; schema: z.ZodType<T>; temperature?: number }): Promise<T> {
  const systemInstruction = `${opts.system}\n\n${GUARDRAILS}\n\nReply with ONE JSON object only, no markdown.`;
  let prompt = opts.prompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ai().models.generateContent({
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
    const text = res.text ?? '';
    try {
      return opts.schema.parse(JSON.parse(text));
    } catch (e) {
      logger.warn('AI output failed validation', { attempt, error: String(e) }); // never log user health data
      prompt = `${opts.prompt}\n\nYour previous answer was invalid (${String(e).slice(0, 300)}). Return valid JSON matching the schema.`;
    }
  }
  throw new Error('AI returned invalid output twice');
}
