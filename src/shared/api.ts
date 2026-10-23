/**
 * SHARED CONTRACT — typed wrappers for every Cloud Function.
 * Pre-wired for all three slices with dual-layer fallback resilience.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { config } from './config';
import {
  parseCheckinFallback,
  summarizeStateFallback,
  planDayFallback,
  breakdownTaskFallback,
  composeContributionFallback,
  prepareMeetingFallback,
  advocateChatFallback,
  decodeMessageFallback,
} from './aiFallbacks';
import type {
  AdvocateReply,
  CalendarEvent,
  Checkin,
  DayPlan,
  MeetingContribution,
  MeetingPrep,
  MetricKey,
  ParsedCheckin,
  RequestCategory,
  StateSummary,
  Stats,
  UserCategory,
  UserProfile,
  WeekdayPattern,
  WorkTask,
} from './types';

function call<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (req: Req): Promise<Res> => (await fn(req)).data;
}

function callWithFallback<Req, Res>(
  name: string,
  fallbackGenerator: (req: Req) => Res,
  timeoutMs = 10000
) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (req: Req): Promise<Res> => {
    if (config.aiMode === 'fallback') {
      console.log(`[API ${name}] Executing fallback (AI_MODE=fallback)`);
      try {
        return fallbackGenerator(req);
      } catch (err) {
        console.error(`[API ${name}] Fallback generator error:`, err);
        return fallbackGenerator(req);
      }
    }

    try {
      const callPromise = fn(req).then((res) => res.data);
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Timeout calling ${name} after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return await Promise.race([callPromise, timeoutPromise]);
    } catch (err) {
      console.warn(`[API ${name}] Server call failed or timed out. Falling back to local deterministic model:`, err);
      try {
        return fallbackGenerator(req);
      } catch (fallbackErr) {
        console.error(`[API ${name}] Local fallback failed:`, fallbackErr);
        throw err;
      }
    }
  };
}

// Andreea
export const parseCheckin = callWithFallback<
  { transcript: string; tracked: MetricKey[] },
  ParsedCheckin
>('parseCheckin', (req) => parseCheckinFallback(req));

export const summarizeState = callWithFallback<
  { date: string; stats: Stats; recent: Checkin[]; simpleLanguage: boolean },
  StateSummary
>('summarizeState', (req) => summarizeStateFallback(req));

// Alexandra
export const planDay = callWithFallback<
  {
    date: string;
    checkin: Checkin | null;
    categories: UserCategory[];
    events: CalendarEvent[];
    tasks: WorkTask[];
    workHours: UserProfile['workHours'];
    hardDay: boolean;
    weekdayPattern?: WeekdayPattern;
    protectDay?: boolean;
  },
  DayPlan
>('planDay', (req) => planDayFallback(req));

export const breakdownTask = callWithFallback<
  { task: WorkTask; capacity: Checkin['capacity'] },
  { firstStep: string; steps: string[] }
>('breakdownTask', (req) => breakdownTaskFallback(req));

export const jiraIssues = call<Record<string, never>, WorkTask[]>('jiraIssues');

export const composeContribution = callWithFallback<
  {
    draft: string;
    meetingTitle?: string;
    checkin?: Pick<Checkin, 'capacityScore'> | null;
    tasks?: Pick<WorkTask, 'id' | 'title' | 'status'>[];
    mode: 'clarify' | 'calm' | 'status_update' | 'polish';
  },
  MeetingContribution
>('composeContribution', (req) => composeContributionFallback(req));

export const prepareMeeting = callWithFallback<
  {
    meetingTitle: string;
    durationMin?: number;
    attendeesCount?: number;
    tasks?: Pick<WorkTask, 'id' | 'title'>[];
  },
  MeetingPrep
>('prepareMeeting', (req) => prepareMeetingFallback(req));

// Alina
export const advocateChat = callWithFallback<
  { requestId: string; message: string; category?: RequestCategory },
  AdvocateReply
>('advocateChat', (req) => advocateChatFallback(req));

export const sendRequest = call<
  { requestId: string; confirm: true },
  { ok: boolean; mode: 'mock' | 'smtp'; messageId?: string }
>('sendRequest');

export const decodeMessage = callWithFallback<
  { text: string; context?: string },
  { meaning: string; urgency: string; suggestedReply: string; confidence: 'low' | 'medium' | 'high' }
>('decodeMessage', (req) => decodeMessageFallback(req));
