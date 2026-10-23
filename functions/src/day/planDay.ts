import { planDayFallback } from '../lib/aiFallbacks';
﻿// Owner: Alexandra. Re-plans the day around today's capacity. Every change carries a reason.
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY, MODEL } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
import type { CalendarEvent, Checkin, DayPlan, UserCategory, WorkTask, WeekdayPattern } from '../lib/types';

const Item = z.object({
  id: z.string(),
  kind: z.enum(['event', 'task', 'break', 'focus']),
  refId: z.string().optional(),
  title: z.string(),
  start: z.string().optional(),
  end: z.string().optional(),
  action: z.enum(['keep', 'move', 'shorten', 'make_async', 'split', 'drop_today', 'add_break', 'focus_block']),
  reason: z.string(),
  firstStep: z.string().optional(),
});

const Out = z.object({
  summary: z.string(),
  items: z.array(Item),
  notificationLevel: z.enum(['normal', 'reduced']),
  suggestedMessages: z.array(
    z.object({
      to: z.string(),
      channel: z.enum(['email', 'slack']),
      text: z.string(),
    })
  ).optional(),
  focusBlock: z.object({
    start: z.string(),
    end: z.string(),
    label: z.string(),
    suggestedTaskIds: z.array(z.string()).optional(),
  }).optional(),
});

const SYSTEM = `You adapt a junior employee's workday to their self-reported Daily Capacity (1-10) and fluctuating health conditions / neurodivergence.
You output a plan for TODAY only. Every item must have a specific 1-sentence "reason" citing capacity or check-in metrics.

General Capacity rules (score 1-10):
- high (7-10): keep the schedule; schedule the most demanding task in a protected focus block.
- medium (4-6): keep fixed meetings, add 10-15 min rest breaks after every 90 min of meetings, at most 2 demanding tasks.
- low (1-3): keep only non-movable meetings (e.g. brief daily stand-up); move or convert movable group meetings to async (action: 'make_async') with a short drafted message;
  at most 1 demanding task, split into small steps; add rest breaks every 60 minutes; end the day on time.
- hard_day mode: treated as low capacity with reduced cognitive load; set notificationLevel to "reduced", limit to at most 3 tasks, draft messages for moved/async items.

Category-specific adaptation rules (apply all categories that the user has):
1. chronic (endometriosis, chronic migraine, fibromyalgia, lupus, long COVID, ME/CFS):
   - When capacity <= 3 (low) or pain/fatigue is high:
     * Long movable group meetings (e.g., "Sprint planning" or team reviews) MUST be adapted to action: "make_async" with a polite drafted note to the manager/team.
     * Scheduled rest breaks (kind: "break", action: "add_break", title: "Rest break", duration 15-30 min) MUST be added throughout the day (e.g. between meetings or after stand-up) to manage pain and pacing.
     * Every item reason must cite capacity or symptoms (e.g., "Daily capacity is 3/10; sprint planning is made async to conserve physical energy").

2. neurodivergent (ADHD, autism, dyslexia):
   - Large, complex, or blocked tasks MUST have a concrete, actionable 5-minute starter step in "firstStep" (e.g., "Open task workspace and review the template or first checklist item").
   - Deep work protection: schedule a protected focus block (kind: "focus", action: "focus_block", title: "Focus block: deep work") of at least 60-90 minutes.
   - Low social battery / high sensory load: Social or non-essential 1:1 meetings (e.g., "Coffee chat" or informal catch-ups) MUST be dropped for today with action: "drop_today" (displayed as "Not today" in UI).

3. psychosocial (anxiety, depression, burnout) or hard_day mode:
   - When in hard_day mode or anxiety/overwhelm is high:
     * notificationLevel MUST be "reduced" (only critical notifications).
     * Keep at most 3 tasks in the plan with clear priority order to simplify decision fatigue.
     * Draft at least one Slack message (channel: "slack") communicating delayed responses or reduced capacity calmly without disclosing medical details.

Strict constraints:
- Anti-hallucination: Never invent meetings or tasks. If kind is 'event' or 'task', refId MUST be an exact ID from the input events or tasks.
- Breaks and focus blocks (kind 'break' or 'focus') should have distinct generated IDs (e.g. "break-1", "focus-1") and do not require refId.
- Every single item in items MUST have a meaningful, one-sentence "reason".
- Never schedule outside work hours. Messages must never mention diagnosis or health details; say "working with reduced capacity today" or "I need to move this".`;

export const planDay = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireAuth(req);
  const { date, checkin, categories = [], events = [], tasks = [], workHours = { start: '09:00', end: '17:30' }, hardDay = false, weekdayPattern, protectDay = false } = (req.data ?? {}) as {
    date: string;
    checkin: Checkin | null;
    categories: UserCategory[];
    events: CalendarEvent[];
    tasks: WorkTask[];
    workHours: { start: string; end: string };
    hardDay: boolean;
    weekdayPattern?: WeekdayPattern;
    protectDay?: boolean;
  };

  const capacityScore = hardDay
    ? 2
    : (checkin?.capacityScore ?? (checkin?.capacity === 'low' ? 3 : checkin?.capacity === 'high' ? 8 : 5));
  const capacity = (hardDay || capacityScore <= 3) ? 'low' : capacityScore >= 7 ? 'high' : 'medium';
  const mode = hardDay ? 'hard_day' : 'normal';

  const prompt = `Date: ${date}. Work hours: ${workHours.start}-${workHours.end}. Mode: ${mode}. Capacity score: ${capacityScore}/10 (${capacity}).
Categories: ${categories.join(', ') || 'none'}.
Check-in: ${checkin ? JSON.stringify({ capacityScore: checkin.capacityScore, metrics: checkin.metrics, workedLateYesterday: checkin.workedLateYesterday, symptoms: checkin.symptoms }) : 'none (assume capacity 5)'}
${weekdayPattern?.todayIsUsuallyLow ? `Weekday pattern: Today is historically a low-energy day (avg ${weekdayPattern.avgToday} vs ${weekdayPattern.avgOverall} overall). Avoid long meetings in first 2 hours and schedule a morning buffer.
` : ''}${protectDay ? `Protect Day Mode: ACTIVE. Group movable meetings into a single window to eliminate context switching, and schedule a continuous deep work focus block of 2.5–3 hours. Output focusBlock: { start: "HH:mm", end: "HH:mm", label: string, suggestedTaskIds: string[] }.
` : ''}Events: ${JSON.stringify(events.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end, movable: e.movable, attendees: e.attendees })))}
Tasks: ${JSON.stringify(tasks.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, estimateMin: t.estimateMin, daysInStatus: t.daysInStatus })))}
Return JSON: { "summary": string (2 sentences), "notificationLevel": "normal"|"reduced", "items": [{ "id", "kind", "refId"?, "title", "start"? "HH:mm", "end"?, "action", "reason", "firstStep"? }] in time order, "suggestedMessages"?: [{ "to", "channel": "email"|"slack", "text" }] }`;

  let out: z.infer<typeof Out>;
  out = await generateJson({
    fnName: 'planDay',
    system: SYSTEM,
    prompt,
    schema: Out,
    temperature: 0.2,
    fallback: () => planDayFallback({ date, checkin, categories, events, tasks, workHours, hardDay, weekdayPattern, protectDay }),
  });

  // 1. Anti-hallucination: Filter out items referencing IDs not in the input
  const knownEvents = new Map(events.map((e) => [e.id, e]));
  const knownTasks = new Map(tasks.map((t) => [t.id, t]));

  let items = out.items.filter((item) => {
    if (item.refId) {
      return knownEvents.has(item.refId) || knownTasks.has(item.refId);
    }
    // Items without refId must only be breaks or focus blocks
    return item.kind === 'break' || item.kind === 'focus';
  });

  // Ensure unique IDs and non-empty reasons
  const seenIds = new Set<string>();
  items = items.map((item, idx) => {
    let id = item.id || `item-${idx + 1}`;
    if (seenIds.has(id)) id = `${id}-${idx + 1}`;
    seenIds.add(id);
    const reason = item.reason?.trim() || `Scheduled based on daily capacity of ${capacityScore}/10.`;
    return { ...item, id, reason };
  });

  const isChronic = categories.includes('chronic');
  const isNeurodivergent = categories.includes('neurodivergent');
  const isPsychosocial = categories.includes('psychosocial');
  const isLowCapacity = capacity === 'low' || capacityScore <= 3 || hardDay;

  // 2. Chronic condition low capacity -> sprint planning async + breaks
  if (isChronic && isLowCapacity) {
    let sprintFound = false;
    items = items.map((item) => {
      if (item.kind === 'event' && (/sprint planning/i.test(item.title) || /team sync|retro/i.test(item.title))) {
        sprintFound = true;
        return {
          ...item,
          action: 'make_async' as const,
          reason: item.reason || `Capacity is ${capacityScore}/10; sprint planning moved to async updates to conserve physical energy.`,
        };
      }
      return item;
    });

    if (!sprintFound) {
      const sprintEv = events.find((e) => /sprint planning/i.test(e.title) || (e.movable && /sync|retro/i.test(e.title)));
      if (sprintEv) {
        items.push({
          id: sprintEv.id,
          kind: 'event',
          refId: sprintEv.id,
          title: sprintEv.title,
          action: 'make_async',
          reason: `Capacity is ${capacityScore}/10; sprint planning adapted to asynchronous updates to conserve physical energy.`,
        });
      }
    }

    // Ensure at least one break exists
    const hasBreak = items.some((i) => i.kind === 'break' || i.action === 'add_break');
    if (!hasBreak) {
      items.push({
        id: `break-${Date.now()}`,
        kind: 'break',
        title: 'Rest & pacing break',
        start: '11:30',
        end: '12:00',
        action: 'add_break',
        reason: `Scheduled a 30-minute rest break to manage fatigue with capacity ${capacityScore}/10.`,
      });
    }
  }

  // 3. Neurodivergent -> focus block, drop non-essential social chats, 5-minute starter step
  if (isNeurodivergent) {
    let coffeeFound = false;
    items = items.map((item) => {
      if (item.kind === 'event' && (/coffee chat/i.test(item.title) || /social|casual|catch-up/i.test(item.title))) {
        coffeeFound = true;
        return {
          ...item,
          action: 'drop_today' as const,
          reason: item.reason || 'Dropping optional coffee chat today to protect social battery and prevent sensory overload.',
        };
      }
      return item;
    });

    if (!coffeeFound) {
      const coffeeEv = events.find((e) => /coffee chat/i.test(e.title) || (e.movable && /social|casual|coffee/i.test(e.title)));
      if (coffeeEv) {
        items.push({
          id: coffeeEv.id,
          kind: 'event',
          refId: coffeeEv.id,
          title: coffeeEv.title,
          action: 'drop_today',
          reason: 'Dropping optional coffee chat today to protect social battery and avoid sensory overload.',
        });
      }
    }

    // Ensure focus block exists
    const hasFocus = items.some((i) => i.kind === 'focus' || i.action === 'focus_block');
    if (!hasFocus) {
      items.push({
        id: `focus-${Date.now()}`,
        kind: 'focus',
        title: tasks[0]?.title ? `Focus block: ${tasks[0].title}` : 'Focus block: deep work',
        start: '11:00',
        end: '12:30',
        action: 'focus_block',
        reason: 'Protected 90-minute focus block for uninterrupted deep work without context switches.',
      });
    }

    // Ensure 5-minute starter step for blocked or complex tasks
    let starterTaskFound = false;
    items = items.map((item) => {
      if (item.kind === 'task') {
        const t = item.refId ? knownTasks.get(item.refId) : undefined;
        if (t?.status === 'blocked' || !starterTaskFound) {
          starterTaskFound = true;
          return {
            ...item,
            action: item.action === 'keep' ? 'split' : item.action,
            firstStep: item.firstStep || `Open ${t ? t.id : 'task'} workspace and review initial checklist to get started.`,
          };
        }
      }
      return item;
    });

    if (!starterTaskFound) {
      const blockedTask = tasks.find((t) => t.status === 'blocked') || tasks[0];
      if (blockedTask && knownTasks.has(blockedTask.id)) {
        items.push({
          id: `task-${blockedTask.id}`,
          kind: 'task',
          refId: blockedTask.id,
          title: `${blockedTask.id}: ${blockedTask.title}`,
          action: 'split',
          reason: 'Large or blocked task unblocked with a dedicated 5-minute starter step.',
          firstStep: `Open ${blockedTask.id} and review initial checklist to get started.`,
        });
      }
    }
  }

  // 4. Hard day / Psychosocial -> reduced notifications, max 3 tasks, draft Slack update
  let notificationLevel = (hardDay || (isPsychosocial && isLowCapacity)) ? 'reduced' : out.notificationLevel;
  let suggestedMessages = out.suggestedMessages ? [...out.suggestedMessages] : [];

  if (hardDay || (isPsychosocial && isLowCapacity)) {
    notificationLevel = 'reduced';

    // Limit to max 3 task items in the plan
    let taskCount = 0;
    items = items.filter((item) => {
      if (item.kind === 'task') {
        taskCount++;
        return taskCount <= 3;
      }
      return true;
    });

    // Ensure at least one Slack draft
    const hasSlack = suggestedMessages.some((m) => m.channel === 'slack');
    if (!hasSlack) {
      suggestedMessages.push({
        to: 'team-updates',
        channel: 'slack',
        text: 'Hi team, working with reduced capacity today on top priority items. For anything urgent, please ping my manager.',
      });
    }
  }

  // 5. Weekday pattern rule: if today is usually a low day, avoid long early meetings and add morning buffer
  if (weekdayPattern?.todayIsUsuallyLow) {
    const startHour = parseInt(workHours.start.split(':')[0], 10) || 9;
    const earlyCutoffHour = startHour + 2;

    items = items.map((item) => {
      if (item.kind === 'event') {
        const itemHour = item.start ? parseInt(item.start.split(':')[0], 10) : 12;
        if (itemHour < earlyCutoffHour) {
          const ev = item.refId ? knownEvents.get(item.refId) : undefined;
          if (ev?.movable) {
            return {
              ...item,
              action: 'move',
              reason: `Today is historically a low-energy day (avg ${weekdayPattern.avgToday} vs ${weekdayPattern.avgOverall}); early movable meeting shifted to avoid early cognitive fatigue.`,
            };
          }
        }
      }
      return item;
    });

    const hasMorningBuffer = items.some((i) => i.kind === 'break' && (i.title.toLowerCase().includes('buffer') || i.title.toLowerCase().includes('ramp-up')));
    if (!hasMorningBuffer) {
      items.unshift({
        id: `buffer-${Date.now()}`,
        kind: 'break',
        title: 'Morning buffer & gentle ramp-up',
        start: workHours.start,
        end: `${String(startHour).padStart(2, '0')}:30`,
        action: 'add_break',
        reason: `Scheduled morning buffer because today is historically a lower energy day (avg ${weekdayPattern.avgToday} vs ${weekdayPattern.avgOverall}).`,
      });
    }
  }

  // 6. Protect Day Mode: group movable meetings together and guarantee a 2.5-3h focus block
  let focusBlock = out.focusBlock;
  if (protectDay) {
    let nextSlotHour = 13;
    let nextSlotMin = 30;
    items = items.map((item) => {
      if (item.kind === 'event') {
        const ev = item.refId ? knownEvents.get(item.refId) : undefined;
        if (ev?.movable) {
          const startStr = `${String(nextSlotHour).padStart(2, '0')}:${String(nextSlotMin).padStart(2, '0')}`;
          nextSlotMin += 30;
          if (nextSlotMin >= 60) {
            nextSlotHour += 1;
            nextSlotMin = 0;
          }
          const endStr = `${String(nextSlotHour).padStart(2, '0')}:${String(nextSlotMin).padStart(2, '0')}`;
          return {
            ...item,
            start: startStr,
            end: endStr,
            action: 'move',
            reason: 'Context switches reduced: grouped with other meetings into afternoon block to free a continuous deep focus window.',
          };
        }
      }
      return item;
    });

    const hasProtectedFocus = items.some((i) => i.kind === 'focus' && i.action === 'focus_block');
    if (!hasProtectedFocus) {
      items.push({
        id: `focus-protected-${Date.now()}`,
        kind: 'focus',
        title: 'Deep work focus block',
        start: '10:00',
        end: '13:00',
        action: 'focus_block',
        reason: 'Protected continuous 3-hour focus window without meetings for deep work and task execution.',
      });
    }

    const unassignedTasks = tasks.filter((t) => t.status !== 'done').slice(0, 3).map((t) => t.id);
    focusBlock = {
      start: '10:00',
      end: '13:00',
      label: 'Deep work focus block',
      suggestedTaskIds: unassignedTasks,
    };
  }

  const plan: DayPlan = {
    date,
    capacity,
    mode,
    notificationLevel,
    summary: out.summary,
    items,
    suggestedMessages: suggestedMessages.length > 0 ? suggestedMessages : undefined,
    focusBlock,
    generatedAt: new Date().toISOString(),
    model: MODEL,
  };

  return plan;
});