// Owner: Alina. Pure TS, unit-testable safety module:
// 1. detectCrisis(text): keyword-based crisis detector returning safety message + resources.
// 2. enforceDisclosure(draft, level, conditions?): post-AI hard guarantee on health disclosure.
// 3. SAFETY_SYSTEM & GUARDRAILS: system prompt fragments enforcing scope and no-medical-advice.

export const SAFETY_SYSTEM = `
CRITICAL SAFETY & SCOPE RULES:
- You are a workplace support assistant, not a clinician. Never diagnose, never suggest or change medication or treatment.
- Scope is WORK PLANNING AND REASONABLE WORKPLACE ADJUSTMENTS ONLY. Never provide medical advice.
- Never provide medical advice, diagnosis, clinical interpretation, treatment recommendations, or medication adjustments.
- Do not ask for medical history, clinical details, or diagnosis (strict data minimisation).
- The employer may only ever see Daily Capacity (a single score 1-10) if the user includes it, NEVER raw individual metrics or symptoms.
- Use calm, adult, respectful, non-judgmental language. No toxic positivity, no guilt.
- Never reveal or mention conditions beyond the user's chosen disclosure level.
`.trim();

export const GUARDRAILS = `
Rules you always follow:
${SAFETY_SYSTEM}
- Base statements about the user ONLY on data given in this prompt. If data is missing, say so; never invent numbers, dates, people or events.
- Prefer concrete, small, reversible suggestions. The user always decides.
- Never reveal or add health details beyond what the user allowed (disclosure level).
`.trim();

// Crisis keywords covering English and Romanian expressions
const CRISIS_REGEX = /\b(suicid\w*|kill myself|end my life|self[- ]?harm|hurt myself|don'?t want to live|take my (own )?life|want to die|cut myself|nu mai vreau s[aă] tr[aă]iesc|s[aă] m[aă] sinucid|vreau s[aă] mor|s[aă](-| )mi iau via[tț]a|s[aă](-| )mi fac r[aă]u|autov[aă]t[aă]mare)\b/i;

export interface CrisisDetectionResult {
  crisis: boolean;
  message?: string;
  resources?: string[];
  type?: 'safety';
}

export function detectCrisis(text: string): CrisisDetectionResult {
  if (!text || !CRISIS_REGEX.test(text)) {
    return { crisis: false };
  }
  return {
    crisis: true,
    type: 'safety',
    message: "It sounds like you're going through something really hard. You deserve support from a person right now. If you are in distress or danger, please reach out to emergency or crisis support services.",
    resources: [
      'Emergency services: 112 (EU) / 911 (US)',
      'Suicide & Crisis Lifeline: 116 123 (EU / UK) / 988 (US / Canada)',
      'Reach out to someone you trust today',
      'Your company Employee Assistance Programme (EAP), if available',
    ],
  };
}

/** Backward-compatible alias for existing callers returning AdvocateReply shape or null */
export function crisisCheck(text: string): { type: 'safety'; message: string; resources: string[] } | null {
  const r = detectCrisis(text);
  if (!r.crisis) return null;
  return {
    type: 'safety',
    message: r.message!,
    resources: r.resources!,
  };
}

export const CONDITION_WORDS: Record<string, string[]> = {
  endometriosis: ['endometriosis', 'endo'],
  fibromyalgia: ['fibromyalgia', 'fibro'],
  chronic_migraine: ['chronic migraine', 'migraines?', 'severe headaches?'],
  lupus: ['lupus', 'systemic lupus'],
  hashimoto: ["hashimoto's", 'hashimoto', 'thyroiditis', 'thyroid condition'],
  rheumatoid_arthritis: ['rheumatoid arthritis', 'rheumatoid', 'arthritis'],
  long_covid: ['long covid', 'post-covid', 'post covid'],
  me_cfs: ['chronic fatigue syndrome', 'myalgic encephalomyelitis', 'me/cfs', 'cfs'],
  multiple_sclerosis: ['multiple sclerosis', 'ms'],
  adhd: ['adhd', 'attention deficit hyperactivity disorder', 'add'],
  autism: ['autism', 'autistic spectrum', 'autistic', 'asperger', "asperger's", 'neurodivergent', 'neurodiversity', 'neurodivergence'],
  dyslexia: ['dyslexia', 'dyslexic'],
  anxiety: ['anxiety disorder', 'generalized anxiety', 'panic attacks?', 'anxiety'],
  depression: ['clinical depression', 'depressive disorder', 'depression'],
  burnout: ['burnout syndrome', 'burnout'],
};

const HEALTH_TERMS = [
  'chronic illness', 'chronic condition', 'chronic disease',
  'health condition', 'medical condition', 'health issues?', 'medical issues?',
  'medical reasons?', 'diagnosis', 'diagnosed', 'clinical symptoms?', 'symptoms?',
  'flare[- ]?up', 'flare[- ]?ups', 'treatment', 'medication', 'psychiatric',
  'disability', 'disabilities',
];

function sanitizeText(
  text: string,
  disclosure: 'none' | 'general' | 'specific',
  allowedConditions: string[] = []
): string {
  if (!text) return text;
  let out = text;

  const allowedSet = new Set(allowedConditions.map((c) => c.toLowerCase()));

  // 1. Process all condition words
  for (const [conditionKey, terms] of Object.entries(CONDITION_WORDS)) {
    const isAllowed = disclosure === 'specific' && allowedSet.has(conditionKey.toLowerCase());
    for (const term of terms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(out)) {
        if (disclosure === 'none') {
          out = out.replace(regex, 'personal reasons');
        } else if (disclosure === 'general') {
          out = out.replace(regex, 'a health condition');
        } else if (disclosure === 'specific' && !isAllowed) {
          out = out.replace(regex, 'a health condition');
        }
      }
    }
  }

  // 2. If disclosure === 'none', also strip all general health terms
  if (disclosure === 'none') {
    for (const term of HEALTH_TERMS) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      out = out.replace(regex, 'personal reasons');
    }
    out = out.replace(/\b(personal reasons)(\s+for\s+personal reasons)+\b/gi, 'personal reasons');
    out = out.replace(/\b(for\s+personal reasons)(\s+for\s+personal reasons)+\b/gi, 'for personal reasons');
  }

  return out;
}

export function enforceDisclosure(
  input: string,
  disclosure: 'none' | 'general' | 'specific',
  allowedConditions?: string[]
): string;
export function enforceDisclosure<T extends { body: string; subject?: string }>(
  input: T,
  disclosure: 'none' | 'general' | 'specific',
  allowedConditions?: string[]
): T;
export function enforceDisclosure(
  input: string | { body: string; subject?: string; [key: string]: any },
  disclosure: 'none' | 'general' | 'specific',
  allowedConditions: string[] = []
): any {
  if (typeof input === 'string') {
    return sanitizeText(input, disclosure, allowedConditions);
  }
  return {
    ...input,
    body: sanitizeText(input.body, disclosure, allowedConditions),
    ...(input.subject ? { subject: sanitizeText(input.subject, disclosure, allowedConditions) } : {}),
  };
}