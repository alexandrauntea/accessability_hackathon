/**
 * Demo personas, one per target group. Each demo runs in its own account
 * (separate browser profile or phone), seeded with one tap from Today -> Demo tools.
 * Owners: profiles/check-ins Andreea, calendar/tasks Alexandra (see the mock.ts files in src/integrations).
 */
import type { Condition, DisclosureLevel, MetricKey, UserCategory } from '@/src/shared/types';

export type PersonaId = 'ioana' | 'matei' | 'elena';

export interface Persona {
  id: PersonaId;
  displayName: string;
  jobTitle: string;
  category: UserCategory;
  conditions: Condition[];
  trackedMetrics: MetricKey[];
  disclosure: DisclosureLevel;
  story: string; // one line for the pitch
}

export const PERSONAS: Record<PersonaId, Persona> = {
  ioana: {
    id: 'ioana', displayName: 'Ioana', jobTitle: 'Junior Data Analyst', category: 'chronic',
    conditions: ['endometriosis', 'chronic_migraine'], trackedMetrics: ['physical_energy', 'pain', 'brain_fog'], disclosure: 'general',
    story: '4 months into her first job. Pain flares monthly; Mondays are her lowest-energy days.',
  },
  matei: {
    id: 'matei', displayName: 'Matei', jobTitle: 'Junior QA Engineer', category: 'neurodivergent',
    conditions: ['autism', 'adhd'], trackedMetrics: ['focus', 'sensory_load', 'social_battery'], disclosure: 'specific',
    story: 'Autistic with ADHD; sometimes non-speaking in meetings. A Jira ticket has been blocked for 6 days.',
  },
  elena: {
    id: 'elena', displayName: 'Elena', jobTitle: 'Junior Marketing Specialist', category: 'psychosocial',
    conditions: ['anxiety', 'burnout'], trackedMetrics: ['anxiety', 'overwhelm'], disclosure: 'none',
    story: 'Worked after 8 pm on 5 of the last 7 days; anxiety rising for two weeks.',
  },
};

const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)));

/** daysAgo >= 1; returns metrics for a workday, with a pattern the Insights screen will surface. */
export function personaMetrics(id: PersonaId, daysAgo: number, weekday: number) {
  const r = rnd(daysAgo + id.length * 31);
  switch (id) {
    case 'ioana': {
      const monTue = weekday === 1 || weekday === 2, flare = daysAgo % 28 < 3;
      return {
        metrics: { physical_energy: clamp((monTue ? 3 : 6) + r * 2 - (flare ? 2 : 0)), pain: clamp((flare ? 8 : 3) + r * 2), brain_fog: clamp((monTue ? 6 : 3) + r * 2) },
        sleepHours: Math.round(((monTue ? 5.5 : 7) + r) * 2) / 2, late: false, symptoms: flare ? ['cramps', 'pelvic pain'] : monTue ? ['fatigue'] : [],
      };
    }
    case 'matei': {
      const ceremonies = weekday === 2 || weekday === 4, office = weekday === 3;
      return {
        metrics: { focus: clamp((office ? 3 : 7) + r * 2), sensory_load: clamp((office ? 8 : 3) + r * 2), social_battery: clamp((ceremonies ? 2 : 6) + r * 2) },
        sleepHours: Math.round((6.5 + r) * 2) / 2, late: false, symptoms: office ? ['noise sensitivity'] : [],
      };
    }
    case 'elena': {
      const trend = Math.max(0, 14 - daysAgo) / 3; // rising over the last 2 weeks
      return {
        metrics: { anxiety: clamp(4 + trend + r * 2), overwhelm: clamp(4 + trend * 1.2 + r * 2) },
        sleepHours: Math.round((7 - trend / 2 + r) * 2) / 2, late: daysAgo <= 7 && r > 0.2, symptoms: daysAgo <= 7 ? ['poor sleep'] : [],
      };
    }
  }
}
