// Owner: Alexandra. Re-plans the day around today's capacity. Every change carries a reason.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY, MODEL } from '../lib/ai';
import { requireUid, REGION } from '../lib/auth';
import type { CalendarEvent, Checkin, DayPlan, UserCategory, WorkTask } from '../lib/types';

const Item = z.object({
  id: z.string(), kind: z.enum(['event', 'task', 'break', 'focus']), refId: z.string().optional(), title: z.string(),
  start: z.string().optional(), end: z.string().optional(),
  action: z.enum(['keep', 'move', 'shorten', 'make_async', 'split', 'drop_today', 'add_break', 'focus_block']),
  reason: z.string(), firstStep: z.string().optional(),
});
const Out = z.object({
  summary: z.string(),
  items: z.array(Item),
  notificationLevel: z.enum(['normal', 'reduced']),
  suggestedMessages: z.array(z.object({ to: z.string(), channel: z.enum(['email', 'slack']), text: z.string() })).optional(),
});

const SYSTEM = `You adapt a junior employee's workday to their self-reported Daily Capacity (1-10). You output a plan for TODAY only.
Capacity rules (score): 7-10 high, 4-6 medium, 1-3 low.
- high: keep the schedule; put the hardest task in a focus block.
- medium: keep fixed meetings, add a 10-minute break after every 90 minutes of meetings, at most 2 demanding tasks.
- low: keep only non-movable meetings; move or make async the movable ones (draft a short message);
  at most 1 demanding task, split into small steps; add breaks every 60 minutes; end the day on time.
- hard_day mode = low rules + every task gets a 5-minute "firstStep" + notificationLevel "reduced" + drafted messages.
Category-specific adaptations (apply every category the user has):
- chronic: reschedule movable meetings away from low-energy/high-pain times, add break blocks, draft messages asking to make meetings asynchronous.
- neurodivergent: break large or blocked tasks into 5-minute first steps, add a protected focus_block (deep work, >= 90 min if focus allows),
  group meetings to reduce context switches; propose drop_today for non-essential 1:1s/social meetings when social_battery <= 4; avoid back-to-back calls when sensory_load >= 7.
- psychosocial: when anxiety or overwhelm >= 7 use notificationLevel "reduced", keep at most 3 tasks with one clear priority order (simplify decisions),
  draft short Slack replies the user can send for pending messages or moved items.
Never schedule outside work hours. Never invent meetings or tasks: refId MUST be an id from the input (breaks/focus have no refId).
Each item needs a one-sentence reason that mentions the capacity or a check-in value (e.g. "pain 7/10").
Messages never mention health details; say "I need to move this" or "I'm working with reduced capacity today".`;

export const planDay = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireUid(req);
  const { date, checkin, categories, events, tasks, workHours, hardDay } = req.data as {
    date: string; checkin: Checkin | null; categories: UserCategory[]; events: CalendarEvent[]; tasks: WorkTask[]; workHours: { start: string; end: string }; hardDay: boolean;
  };
  const capacity = hardDay ? 'low' : checkin?.capacity ?? 'medium';
  const prompt = `Date: ${date}. Work hours: ${workHours.start}-${workHours.end}. Mode: ${hardDay ? 'hard_day' : 'normal'}. Capacity: ${capacity}.
Categories: ${categories.join(', ') || 'unknown'}.
Check-in: ${checkin ? JSON.stringify({ capacityScore: checkin.capacityScore, metrics: checkin.metrics, workedLateYesterday: checkin.workedLateYesterday }) : 'none (assume capacity 5)'}
Events: ${JSON.stringify(events.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end, movable: e.movable, attendees: e.attendees })))}
Tasks: ${JSON.stringify(tasks.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, estimateMin: t.estimateMin, daysInStatus: t.daysInStatus })))}
Return JSON: { "summary": string (2 sentences), "notificationLevel": "normal"|"reduced", "items": [{ "id", "kind", "refId"?, "title", "start"? "HH:mm", "end"?, "action", "reason", "firstStep"? }] in time order, "suggestedMessages"?: [{ "to", "channel": "email"|"slack", "text" }] }`;
  const out = await generateJson({ system: SYSTEM, prompt, schema: Out, temperature: 0.3 });

  // Anti-hallucination: drop items that reference ids we never sent.
  const known = new Set([...events.map((e) => e.id), ...tasks.map((t) => t.id)]);
  const items = out.items.filter((i) => !i.refId || known.has(i.refId));
  const plan: DayPlan = { date, capacity, mode: hardDay ? 'hard_day' : 'normal', notificationLevel: hardDay ? 'reduced' : out.notificationLevel, summary: out.summary, items, suggestedMessages: out.suggestedMessages, generatedAt: new Date().toISOString(), model: MODEL };
  return plan;
});
