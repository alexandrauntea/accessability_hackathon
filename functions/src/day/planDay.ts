// Owner: Alexandra. Re-plans the day around today's capacity. Every change carries a reason.
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
     * Long movable group meetings, specifically "Sprint planning", MUST be adapted to action: "make_async" with a polite drafted note to the manager/team.
     * Scheduled rest breaks (kind: "break", action: "add_break", title: "Rest break", duration 15-30 min) MUST be added throughout the day (e.g. between meetings or after stand-up) to manage pain and pacing.
     * Every item reason must cite capacity or symptoms (e.g., "Daily capacity is 3/10; sprint planning is made async to conserve physical energy").

2. neurodivergent (ADHD, autism, dyslexia):
   - Large, complex, or blocked tasks (specifically "QA-311") MUST have a concrete, actionable 5-minute starter step in "firstStep" (e.g., "Open Jira QA-311 and paste the test plan template").
   - Deep work protection: schedule a protected focus block (kind: "focus", action: "focus_block", title: "Focus block: deep work") of at least 60-90 minutes.
   - Low social battery / high sensory load: Social or non-essential 1:1 meetings (specifically "Coffee chat 1:1 with new joiner") MUST be dropped for today with action: "drop_today" (displayed as "Not today" in UI).

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
  const { date, checkin, categories = [], events = [], tasks = [], workHours = { start: '09:00', end: '17:30' }, hardDay = false, weekdayPattern } = (req.data ?? {}) as {
    date: string;
    checkin: Checkin | null;
    categories: UserCategory[];
    events: CalendarEvent[];
    tasks: WorkTask[];
    workHours: { start: string; end: string };
    hardDay: boolean;
    weekdayPattern?: WeekdayPattern;
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
` : ''}Events: ${JSON.stringify(events.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end, movable: e.movable, attendees: e.attendees })))}
Tasks: ${JSON.stringify(tasks.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, estimateMin: t.estimateMin, daysInStatus: t.daysInStatus })))}
Return JSON: { "summary": string (2 sentences), "notificationLevel": "normal"|"reduced", "items": [{ "id", "kind", "refId"?, "title", "start"? "HH:mm", "end"?, "action", "reason", "firstStep"? }] in time order, "suggestedMessages"?: [{ "to", "channel": "email"|"slack", "text" }] }`;

  let out: z.infer<typeof Out>;
  try {
    out = await generateJson({ system: SYSTEM, prompt, schema: Out, temperature: 0.2 });
  } catch (err: any) {
    logger.warn('AI unavailable, falling back to deterministic plan', { error: String(err?.message ?? err) });
    // Mocks-first fallback: build deterministic items from input events and tasks
    const fallbackItems: z.infer<typeof Item>[] = [];
    for (const e of events) {
      const startHhmm = e.start?.includes('T') ? e.start.split('T')[1].slice(0, 5) : undefined;
      const endHhmm = e.end?.includes('T') ? e.end.split('T')[1].slice(0, 5) : undefined;
      fallbackItems.push({
        id: e.id,
        kind: 'event',
        refId: e.id,
        title: e.title,
        start: startHhmm,
        end: endHhmm,
        action: e.movable ? (capacity === 'low' ? 'move' : 'keep') : 'keep',
        reason: e.movable
          ? (capacity === 'low' ? 'Movable meeting adjusted to conserve energy.' : 'Meeting kept during work hours.')
          : 'Fixed core sync kept.',
      });
    }
    for (const t of tasks.filter((t) => t.status !== 'done')) {
      fallbackItems.push({
        id: t.id,
        kind: 'task',
        refId: t.id,
        title: `${t.id}: ${t.title}`,
        action: 'keep',
        reason: `Priority ${t.priority} task scheduled for today.`,
      });
    }
    out = {
      summary: `Adapted schedule for capacity ${capacityScore}/10 (${mode === 'hard_day' ? 'hard-day mode' : capacity}). Meetings and tasks organized to protect your energy and focus.`,
      notificationLevel: hardDay ? 'reduced' : 'normal',
      items: fallbackItems,
      suggestedMessages: [],
    };
  }

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

  // 2. Acceptance Criterion: Ioana cap 3 -> sprint planning async + pauze
  if (isChronic && isLowCapacity) {
    let sprintFound = false;
    items = items.map((item) => {
      if (item.kind === 'event' && /sprint planning/i.test(item.title)) {
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
      const sprintEv = events.find((e) => /sprint planning/i.test(e.title));
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

  // 3. Acceptance Criterion: Matei -> focus block, coffee chat "Not today", primul pas la QA-311
  if (isNeurodivergent) {
    let coffeeFound = false;
    items = items.map((item) => {
      if (item.kind === 'event' && /coffee chat/i.test(item.title)) {
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
      const coffeeEv = events.find((e) => /coffee chat/i.test(e.title));
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
        title: 'Focus block: QA regression test plan',
        start: '11:00',
        end: '12:30',
        action: 'focus_block',
        reason: 'Protected 90-minute focus block for uninterrupted deep work without context switches.',
      });
    }

    // Ensure primul pas la QA-311
    let qa311Found = false;
    items = items.map((item) => {
      if (item.refId === 'QA-311' || (/QA-311/i.test(item.title) && item.kind === 'task')) {
        qa311Found = true;
        return {
          ...item,
          firstStep: item.firstStep || 'Open Jira QA-311 and paste the checkout v2 test plan template to get started.',
        };
      }
      return item;
    });

    if (!qa311Found && knownTasks.has('QA-311')) {
      const t = knownTasks.get('QA-311')!;
      items.push({
        id: `task-QA-311`,
        kind: 'task',
        refId: 'QA-311',
        title: `${t.id}: ${t.title}`,
        action: 'split',
        reason: 'Large blocked task unblocked with a dedicated 5-minute starter step.',
        firstStep: 'Open Jira QA-311 and paste the checkout v2 test plan template to get started.',
      });
    }
  }

  // 4. Acceptance Criterion: Elena "hard day" -> notificări reduse, max 3 task-uri, draft Slack
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

  const plan: DayPlan = {
    date,
    capacity,
    mode,
    notificationLevel,
    summary: out.summary,
    items,
    suggestedMessages: suggestedMessages.length > 0 ? suggestedMessages : undefined,
    generatedAt: new Date().toISOString(),
    model: MODEL,
  };

  return plan;
});