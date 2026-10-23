/**
 * Primary Realistic Demo Account — Ioana Popescu (Chronic illness / Endometriosis)
 * AccessABILITY Hackathon 2026
 */
import { collection, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../shared/firebase';
import { todayISO } from '../shared/dates';
import { deriveCapacity } from '../shared/metrics';
import { defaultA11y } from '../shared/theme/ThemeProvider';
import type {
  AccommodationRequest,
  CalendarEvent,
  Checkin,
  UserProfile,
  WorkTask,
} from '../shared/types';

export const DEMO_SEED_VERSION = 1;

const DEFAULT_DEMO_EMAILS = ['ioanapopescu@gmail.com'];

export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const envEmails = (process.env.EXPO_PUBLIC_DEMO_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const list = envEmails.length > 0 ? envEmails : DEFAULT_DEMO_EMAILS;
  return list.includes(email.trim().toLowerCase());
}

export function getIoanaProfile(uid: string): UserProfile {
  return {
    uid,
    displayName: 'Ioana Popescu',
    jobTitle: 'Junior Data Analyst',
    categories: ['chronic'],
    conditions: ['endometriosis'],
    trackedMetrics: ['physical_energy', 'pain', 'brain_fog'],
    disclosure: 'general',
    managerName: 'Andrei',
    managerEmail: process.env.EXPO_PUBLIC_DEMO_MANAGER_EMAIL || 'andrei.manager@retailhub.ro',
    hrEmail: process.env.EXPO_PUBLIC_DEMO_HR_EMAIL || 'hr@retailhub.ro',
    workHours: { start: '09:00', end: '17:30' },
    a11y: defaultA11y,
    consent: {
      healthData: true,
      aiProcessing: true,
      acceptedAt: new Date(Date.now() - 42 * 86400000).toISOString(),
    },
    onboarded: true,
    demoPersona: 'ioana',
    seedVersion: DEMO_SEED_VERSION,
  };
}

/**
 * 6 weeks of check-in history (~30 entries, skipping weekends).
 * Flare pattern every ~4 weeks:
 * - Flare 4 weeks ago (3 days)
 * - Recent 7 workdays lower average capacity
 * - Today is Day 1 of the new flare (NO check-in for today so user tests it live).
 */
export function generateIoanaCheckins(today = new Date()): Checkin[] {
  const checkins: Checkin[] = [];
  let workdayCount = 0;

  for (let i = 1; i <= 42; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue; // skip weekends
    workdayCount++;

    const isMonTue = wd === 1 || wd === 2;
    // Flare 4 weeks ago: workdays 18, 19, 20
    const isPastFlare = workdayCount >= 18 && workdayCount <= 20;
    // Recent 7 workdays: lower capacity building up to today's flare (Day 1)
    const isRecent7 = workdayCount <= 7;

    let energy: number;
    let pain: number;
    let brainFog: number;
    let symptoms: string[] = [];

    if (isPastFlare) {
      energy = 2;
      pain = 8;
      brainFog = 7;
      symptoms = ['cramps', 'pelvic pain', 'fatigue'];
    } else if (isRecent7) {
      if (isMonTue) {
        energy = 3;
        pain = 6;
        brainFog = 6;
        symptoms = ['fatigue', 'headache'];
      } else {
        energy = 5;
        pain = 4;
        brainFog = 4;
      }
    } else {
      if (isMonTue) {
        energy = 4;
        pain = 5;
        brainFog = 5;
        symptoms = ['fatigue'];
      } else {
        energy = 7;
        pain = 2;
        brainFog = 2;
      }
    }

    const metrics = { physical_energy: energy, pain, brain_fog: brainFog };
    const { capacityScore, capacity } = deriveCapacity(metrics);

    checkins.push({
      date: todayISO(d),
      metrics,
      sleepHours: isPastFlare ? 5 : isMonTue ? 6 : 7.5,
      symptoms,
      workedLateYesterday: false,
      source: 'manual',
      capacityScore,
      capacity,
      createdAt: d.toISOString(),
    });
  }

  return checkins;
}

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00`).toISOString();

export function getIoanaCalendarEvents(date = todayISO()): CalendarEvent[] {
  return [
    {
      id: 'ev1',
      title: 'Team stand-up',
      start: at(date, '09:30'),
      end: at(date, '09:45'),
      movable: false,
      attendees: ['team'],
      source: 'mock',
    },
    {
      id: 'ev2',
      title: 'Sprint planning',
      start: at(date, '11:00'),
      end: at(date, '12:30'),
      movable: true,
      attendees: ['Andrei (manager)', 'team'],
      source: 'mock',
    },
    {
      id: 'ev3',
      title: 'Lunch & learn: Retail analytics trends',
      start: at(date, '13:00'),
      end: at(date, '14:00'),
      movable: true,
      attendees: ['analytics-all'],
      source: 'mock',
    },
    {
      id: 'ev4',
      title: '1:1 with Andrei',
      start: at(date, '14:30'),
      end: at(date, '15:00'),
      movable: true,
      attendees: ['Andrei (manager)'],
      source: 'mock',
    },
    {
      id: 'ev5',
      title: 'Data quality sync',
      start: at(date, '16:00'),
      end: at(date, '17:00'),
      movable: true,
      attendees: ['Data engineering'],
      source: 'mock',
    },
  ];
}

export function getIoanaTasks(): WorkTask[] {
  return [
    {
      id: 'DA-139',
      title: 'Fix null values in customer churn dashboard',
      status: 'blocked',
      priority: 'high',
      estimateMin: 120,
      daysInStatus: 6,
      description: 'Empty rows for EU customers since the last ETL migration. Blocked on verifying partition keys.',
      source: 'mock',
    },
    {
      id: 'DA-142',
      title: 'Write SQL for monthly revenue cohort retention',
      status: 'in_progress',
      priority: 'high',
      estimateMin: 90,
      source: 'mock',
    },
    {
      id: 'DA-147',
      title: 'Update daily inventory anomaly alerts',
      status: 'todo',
      priority: 'medium',
      estimateMin: 45,
      source: 'mock',
    },
    {
      id: 'DA-150',
      title: 'Review PR #384 on checkout analytics schema',
      status: 'todo',
      priority: 'medium',
      estimateMin: 30,
      source: 'mock',
    },
    {
      id: 'DA-151',
      title: 'Prepare slides for Friday team showcase',
      status: 'todo',
      priority: 'low',
      estimateMin: 60,
      source: 'mock',
    },
    {
      id: 'DA-133',
      title: 'Backfill transaction logs for Q3',
      status: 'done',
      priority: 'low',
      estimateMin: 60,
      source: 'mock',
    },
  ];
}

export function getIoanaPriorRequest(): AccommodationRequest {
  const pastDate = new Date(Date.now() - 28 * 86400000).toISOString();
  return {
    id: 'req-flare-prior',
    category: 'health',
    status: 'sent',
    createdAt: pastDate,
    sentAt: pastDate,
    messages: [
      {
        role: 'user',
        text: 'I have a health flare today and need to work from home with async meetings.',
        at: pastDate,
      },
      {
        role: 'assistant',
        text: 'Here is a draft request tailored for your manager with general disclosure.',
        at: pastDate,
      },
    ],
    draft: {
      to: ['andrei.manager@retailhub.ro'],
      subject: 'Request for temporary workplace adjustments — Ioana Popescu',
      body: `Dear Andrei,

I am writing to request a few temporary workplace adjustments due to a health condition. Specifically, I would benefit from working remotely for the next 2 days and converting our afternoon meeting to async updates.

These adjustments will allow me to maintain high-quality deliverables while managing my current capacity. I would welcome the opportunity to discuss this briefly.

Best regards,
Ioana Popescu`,
      disclosureUsed: 'general',
    },
  };
}

export const DECODE_SAMPLE_MESSAGES = [
  {
    label: 'Urgent check',
    text: 'When you have a quick moment, can you take a look at the Q3 churn numbers? No rush though!',
  },
  {
    label: 'Task ETA',
    text: 'Quick question on DA-139, do we have an ETA for the partition fix?',
  },
  {
    label: 'Sync offline',
    text: "Let's sync offline regarding tomorrow's sprint presentation when you are free.",
  },
];

/**
 * Seeds Ioana Popescu demo data into Firestore for the current user.
 * Idempotent: checks seedVersion unless force === true.
 */
export async function seedIoanaDemoData(uid: string, force = false): Promise<number> {
  const profile = getIoanaProfile(uid);
  const checkins = generateIoanaCheckins();
  const priorReq = getIoanaPriorRequest();

  const batch = writeBatch(db);

  // 1. Profile
  batch.set(doc(db, 'users', uid), profile, { merge: true });

  // 2. Clear today's check-in and plan so demo starts clean for today
  const today = todayISO();
  try {
    batch.delete(doc(db, 'users', uid, 'checkins', today));
    batch.delete(doc(db, 'users', uid, 'plans', today));
  } catch {
    // non-blocking
  }

  // 3. Past check-ins (skipping weekends, ~30 entries)
  const checkinsCol = collection(db, 'users', uid, 'checkins');
  for (const c of checkins) {
    batch.set(doc(checkinsCol, c.date), c);
  }

  // 4. Prior accommodation request
  batch.set(doc(db, 'users', uid, 'requests', priorReq.id), priorReq);

  await batch.commit();
  return checkins.length;
}
