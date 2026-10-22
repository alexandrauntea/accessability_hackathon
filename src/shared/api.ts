/**
 * SHARED CONTRACT — typed wrappers for every Cloud Function.
 * Pre-wired for all three slices so nobody has to edit this file mid-hackathon.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AdvocateReply, CalendarEvent, Checkin, DayPlan, MeetingContribution, MetricKey, ParsedCheckin, RequestCategory,
  StateSummary, Stats, UserCategory, UserProfile, WeekdayPattern, WorkTask,
} from './types';

function call<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (req: Req): Promise<Res> => (await fn(req)).data;
}

// Andreea
export const parseCheckin = call<{ transcript: string; tracked: MetricKey[] }, ParsedCheckin>('parseCheckin');
export const summarizeState = call<{ date: string; stats: Stats; recent: Checkin[]; simpleLanguage: boolean }, StateSummary>('summarizeState');

// Alexandra
export const planDay = call<
  { date: string; checkin: Checkin | null; categories: UserCategory[]; events: CalendarEvent[]; tasks: WorkTask[]; workHours: UserProfile['workHours']; hardDay: boolean; weekdayPattern?: WeekdayPattern },
  DayPlan
>('planDay');
export const breakdownTask = call<{ task: WorkTask; capacity: Checkin['capacity'] }, { firstStep: string; steps: string[] }>('breakdownTask');
export const jiraIssues = call<Record<string, never>, WorkTask[]>('jiraIssues');
export const composeContribution = call<
  {
    draft: string;
    meetingTitle?: string;
    checkin?: Pick<Checkin, 'capacityScore'> | null;
    tasks?: Pick<WorkTask, 'id' | 'title' | 'status'>[];
    mode: 'clarify' | 'calm' | 'status_update' | 'polish';
  },
  MeetingContribution
>('composeContribution');

// Alina
export const advocateChat = call<{ requestId: string; message: string; category?: RequestCategory }, AdvocateReply>('advocateChat');
export const sendRequest = call<{ requestId: string; confirm: true }, { ok: boolean; mode: 'mock' | 'smtp'; messageId?: string }>('sendRequest');
export const decodeMessage = call<{ text: string; context?: string }, { meaning: string; urgency: string; suggestedReply: string; confidence: 'low' | 'medium' | 'high' }>('decodeMessage');
