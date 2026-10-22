// Owner: Alina. Guardrails shared by every prompt + crisis detection + disclosure guard.

export const GUARDRAILS = `
Rules you always follow:
- You are a workplace support assistant, not a clinician. Never diagnose, never suggest or change medication or treatment.
- Base statements about the user ONLY on data given in this prompt. If data is missing, say so; never invent numbers, dates, people or events.
- Use calm, respectful, non-judgmental language. No toxic positivity, no guilt.
- Prefer concrete, small, reversible suggestions. The user always decides.
- Never reveal or add health details beyond what the user allowed (disclosure level).
`.trim();

const CRISIS = /\b(suicid\w*|kill myself|end my life|self[- ]?harm|hurt myself|don'?t want to live|nu mai vreau s[aă] tr[aă]iesc|s[aă] m[aă] sinucid)\b/i;

export function crisisCheck(text: string) {
  if (!CRISIS.test(text)) return null;
  return {
    type: 'safety' as const,
    message: "It sounds like you're going through something really hard. You deserve support from a person right now. If you are in danger, call your local emergency number.",
    resources: ['Emergency services: 112 (EU)', 'Talk to someone you trust today', 'Your company Employee Assistance Programme, if available'],
  };
}

const CONDITION_WORDS: Record<string, string[]> = {
  endometriosis: ['endometriosis'], fibromyalgia: ['fibromyalgia'], chronic_migraine: ['migraine'], lupus: ['lupus'],
  hashimoto: ['hashimoto', 'thyroid'], rheumatoid_arthritis: ['rheumatoid', 'arthritis'], long_covid: ['long covid'], me_cfs: ['chronic fatigue syndrome', 'me/cfs'],
  multiple_sclerosis: ['multiple sclerosis'], adhd: ['adhd'], autism: ['autism', 'autistic'], dyslexia: ['dyslexia'], anxiety: ['anxiety'], depression: ['depression'], burnout: ['burnout'],
};

/** Hard guarantee (not just a prompt): if disclosure != 'specific', condition names never leave in an email. */
export function enforceDisclosure(body: string, disclosure: 'none' | 'general' | 'specific', conditions: string[]) {
  if (disclosure === 'specific') return body;
  let out = body;
  for (const c of conditions) for (const w of CONDITION_WORDS[c] ?? [c]) {
    out = out.replace(new RegExp(w, 'gi'), disclosure === 'general' ? 'a health condition' : 'personal reasons');
  }
  return out;
}
