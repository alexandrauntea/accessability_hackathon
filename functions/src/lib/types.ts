/**
 * SHARED CONTRACT — frozen after hour 2.
 * Changes: announce in team chat, separate small PR, one reviewer.
 * The same shapes are mirrored in functions/src/lib/types.ts (keep them in sync).
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // full ISO string

export type Condition =
  | 'endometriosis' | 'fibromyalgia' | 'chronic_migraine' | 'lupus' | 'hashimoto'
  | 'rheumatoid_arthritis' | 'long_covid' | 'me_cfs' | 'multiple_sclerosis'
  | 'adhd' | 'autism' | 'dyslexia' | 'anxiety' | 'depression' | 'burnout' | 'other';

/** How much the user is willing to tell the employer. Drives what AI may put in emails. */
export type DisclosureLevel = 'none' | 'general' | 'specific';

export type UserCategory = 'chronic' | 'neurodivergent' | 'psychosocial';

/** Metrics a user can track. Each user picks 2-3 at onboarding (see src/shared/metrics.ts). */
export type MetricKey =
  | 'physical_energy' | 'pain' | 'brain_fog'          // chronic illness
  | 'focus' | 'sensory_load' | 'social_battery'       // neurodivergence
  | 'anxiety' | 'overwhelm';                          // psychosocial

export interface AccessibilityPrefs {
  highContrast: boolean;
  lowSensory: boolean; // neutral dark, no animation, no alert colours, square corners
  fontScale: 1 | 1.25 | 1.5;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  autoReadAloud: boolean; // TTS reads each screen's summary on open
  simpleLanguage: boolean; // AI answers in easy-to-read language
  haptics: boolean; // vibration on confirmations (mobile)
  sounds: boolean; // discreet confirmation sound; false = mute
}

export interface UserProfile {
  uid: string;
  displayName: string;
  jobTitle?: string;
  categories: UserCategory[];
  trackedMetrics: MetricKey[]; // 2-3, chosen at onboarding
  conditions: Condition[]; // stored only with consent.healthData === true
  managerName?: string;
  managerEmail?: string;
  hrEmail?: string;
  disclosure: DisclosureLevel;
  workHours: { start: string; end: string }; // '09:00'
  a11y: AccessibilityPrefs;
  consent: { healthData: boolean; aiProcessing: boolean; acceptedAt?: ISODateTime };
  onboarded: boolean;
  demoPersona?: 'ioana' | 'matei' | 'elena';
}

/** All metrics are 1..10 with factual anchors (no emojis). See METRICS[key].direction. */
export interface Checkin {
  date: ISODate;
  metrics: Partial<Record<MetricKey, number>>;
  sleepHours?: number;
  symptoms: string[];
  workedLateYesterday: boolean; // worked after 20:00
  notes?: string;
  source: 'manual' | 'voice' | 'repeat';
  capacityScore: number; // 1..10, the ONE number an employer may ever see (only inside a request the user sends)
  capacity: Capacity; // band derived from capacityScore
  createdAt: ISODateTime;
}

export type Capacity = 'low' | 'medium' | 'high';

/** Result of voice/text check-in parsing. The UI pre-fills sliders and asks for confirmation. */
export interface ParsedCheckin {
  metrics: Partial<Record<MetricKey, number>>;
  symptoms: string[];
  notes: string;
  unclear: string[]; // phrases the AI could not map; shown to the user
}

export interface StateSummary {
  date: ISODate;
  headline: string; // one sentence, plain language
  summary: string; // 2-4 sentences
  patterns: string[]; // each grounded in a computed stat
  suggestions: string[]; // non-medical, work-related
  overloadSignal?: string; // early warning, if any
  generatedBy: 'ai';
  model: string;
}

/** Deterministic stats (computed in code, never by the LLM). */
export interface WeekdayStat { weekday: number; label: string; avgCapacity: number; avg: Partial<Record<MetricKey, number>>; n: number }
export interface Stats {
  days: number;
  tracked: MetricKey[];
  byWeekday: WeekdayStat[];
  last7: { avgCapacity: number; avg: Partial<Record<MetricKey, number>>; lateNights: number; lowCapacityDays: number };
  prev7: { avgCapacity: number; avg: Partial<Record<MetricKey, number>> };
  sleepCapacityCorrelation: number | null; // Pearson r
}

// ---------- Weekday pattern (Day planning) ----------
export interface WeekdayPattern {
  todayIsUsuallyLow: boolean;
  avgToday: number;
  avgOverall: number;
  lowestWeekdayLabel?: string;
}

// ---------- Day planning ----------
export interface CalendarEvent {
  id: string;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  attendees?: string[];
  movable: boolean;
  source: 'mock' | 'google';
}

export interface WorkTask {
  id: string; // e.g. 'DATA-142'
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: ISODate;
  estimateMin?: number;
  daysInStatus?: number;
  url?: string;
  source: 'mock' | 'jira';
}

export type PlanAction = 'keep' | 'move' | 'shorten' | 'make_async' | 'split' | 'drop_today' | 'add_break' | 'focus_block';

export interface PlanItem {
  id: string;
  kind: 'event' | 'task' | 'break' | 'focus';
  refId?: string; // CalendarEvent.id or WorkTask.id
  title: string;
  start?: string; // 'HH:mm'
  end?: string;
  action: PlanAction;
  reason: string; // shown to the user: transparency
  firstStep?: string; // 5-minute starter step
}

export interface DayPlan {
  date: ISODate;
  capacity: Capacity;
  mode: 'normal' | 'hard_day';
  notificationLevel: 'normal' | 'reduced';
  summary: string;
  items: PlanItem[];
  suggestedMessages?: { to: string; channel: 'email' | 'slack'; text: string }[]; // reschedule notes, Slack replies
  focusBlock?: { start: string; end: string; label: string; suggestedTaskIds?: string[] };
  generatedAt: ISODateTime;
  model: string;
}

// ---------- Accommodation requests ----------
export type RequestCategory = 'health' | 'social' | 'appointment' | 'mental_health_day' | 'workload' | 'other';

export interface ChatMessage { role: 'user' | 'assistant'; text: string; at: ISODateTime }

export interface RequestDraft {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  disclosureUsed: DisclosureLevel;
}

export interface AccommodationRequest {
  id: string;
  category: RequestCategory;
  status: 'clarifying' | 'draft' | 'sent' | 'cancelled';
  messages: ChatMessage[];
  draft?: RequestDraft;
  sentAt?: ISODateTime;
  createdAt: ISODateTime;
}

/** advocateChat returns either one clarifying question or a finished draft. */
export type AdvocateReply =
  | { type: 'question'; question: string; why: string }
  | { type: 'draft'; category: RequestCategory; draft: RequestDraft; notes: string[] }
  | { type: 'safety'; message: string; resources: string[] };

// ---------- AAC: speak for me in meetings ----------
export type ContributionMode = 'clarify' | 'calm' | 'status_update' | 'polish';

export interface MeetingContribution {
  text: string; // clear, adult phrased text, <= 80 words
  why: string; // explanation for the phrasing
  spoken: string; // clear, professional, <= 3 sentences, for TTS
  chat: string; // same content formatted for the meeting chat
}
