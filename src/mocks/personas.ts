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
    id: 'ioana',
    displayName: 'Ioana',
    jobTitle: 'Junior Data Analyst',
    category: 'chronic',
    conditions: ['endometriosis', 'chronic_migraine'],
    trackedMetrics: ['physical_energy', 'pain', 'brain_fog'],
    disclosure: 'general',
    story: '4 months into her first job. Pain flares monthly; Mondays are her lowest-energy days.',
  },
  matei: {
    id: 'matei',
    displayName: 'Matei',
    jobTitle: 'Junior QA Engineer',
    category: 'neurodivergent',
    conditions: ['autism', 'adhd'],
    trackedMetrics: ['focus', 'sensory_load', 'social_battery'],
    disclosure: 'specific',
    story: 'Autistic with ADHD; sometimes non-speaking in meetings. A Jira ticket has been blocked for 6 days.',
  },
  elena: {
    id: 'elena',
    displayName: 'Elena',
    jobTitle: 'Junior Marketing Specialist',
    category: 'psychosocial',
    conditions: ['anxiety', 'burnout'],
    trackedMetrics: ['anxiety', 'overwhelm'],
    disclosure: 'none',
    story: 'Worked after 8 pm on 5 of the last 7 days; anxiety rising for two weeks.',
  },
};

const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)));

function workdaysAgo(d: number, todayWeekday = new Date().getDay()) {
  let count = 0;
  for (let i = 1; i <= d; i++) {
    const wd = (todayWeekday - (i % 7) + 7) % 7;
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

/** daysAgo >= 1; returns metrics for a workday, with a pattern the Insights screen will surface. */
export function personaMetrics(id: PersonaId, daysAgo: number, weekday: number) {
  const r = rnd(daysAgo + id.length * 31);
  const wAgo = workdaysAgo(daysAgo);

  switch (id) {
    case 'ioana': {
      // Chronic: Mondays (1) and Tuesdays (2) have low physical energy, high brain fog and pain
      // Last 7 workdays are worse than previous 7 workdays (flare pattern)
      const monTue = weekday === 1 || weekday === 2;
      const flare = wAgo <= 4 || (daysAgo % 28 < 3);
      const recentWorse = wAgo <= 7;
      return {
        metrics: {
          physical_energy: clamp((monTue ? 3 : 6) + r * 1.5 - (recentWorse ? 1.5 : 0) - (flare ? 1.5 : 0)),
          pain: clamp((flare ? 8 : monTue ? 6 : 3) + r * 1.5 + (recentWorse ? 1.5 : 0)),
          brain_fog: clamp((monTue ? 7 : 3) + r * 1.5 + (recentWorse ? 1.5 : 0)),
        },
        sleepHours: Math.round(((monTue ? 5.5 : 7) + r) * 2) / 2,
        late: false,
        symptoms: flare ? ['cramps', 'pelvic pain'] : monTue ? ['fatigue', 'headache'] : [],
      };
    }
    case 'matei': {
      // Neurodivergent: ceremonies / meeting-heavy days: Tue (2) & Thu (4)
      // -> high sensory load (8), low social battery (2)
      // Quieter days (Mon, Fri) -> good focus (8), manageable sensory load
      const ceremonies = weekday === 2 || weekday === 4;
      const office = weekday === 3;
      return {
        metrics: {
          focus: clamp((office ? 4 : ceremonies ? 5 : 8) + r * 1.5),
          sensory_load: clamp((ceremonies ? 8 : office ? 7 : 3) + r * 1.5),
          social_battery: clamp((ceremonies ? 2 : 6) + r * 1.5),
        },
        sleepHours: Math.round((6.5 + r) * 2) / 2,
        late: false,
        symptoms: ceremonies ? ['sensory overload', 'social fatigue'] : office ? ['noise sensitivity'] : [],
      };
    }
    case 'elena': {
      // Psychosocial: worked late (after 20:00) on 5 of the last 7 workdays
      // Overwhelm and anxiety rising sharply over the last 2 weeks
      const trend = Math.max(0, 14 - daysAgo) / 2;
      const isLateWorkday = wAgo <= 7 && wAgo !== 2 && wAgo !== 6;
      return {
        metrics: {
          anxiety: clamp(4 + trend + r * 1.5),
          overwhelm: clamp(4 + trend * 1.3 + r * 1.5),
        },
        sleepHours: Math.round((7 - trend / 2 + r) * 2) / 2,
        late: isLateWorkday,
        symptoms: daysAgo <= 7 ? ['poor sleep', 'racing thoughts'] : [],
      };
    }
  }
}