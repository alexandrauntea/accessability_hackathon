/**
 * SHARED AI FALLBACK GENERATORS — 100% deterministic, context-grounded fallbacks
 * Used by:
 * 1. Layer A (Server): functions/src/lib/ai.ts fallback()
 * 2. Layer B (Client): src/shared/api.ts callWithFallback()
 */
import type {
  AdvocateReply,
  CalendarEvent,
  Checkin,
  DayPlan,
  PlanItem,
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
} from '../types';

// ============================================================================
// 1. parseCheckinFallback
// ============================================================================
export function parseCheckinFallback(req: { transcript?: string; text?: string; tracked?: MetricKey[] }): ParsedCheckin {
  const text = (req.transcript ?? req.text ?? '').trim();
  const lower = text.toLowerCase();
  const metrics: Partial<Record<MetricKey, number>> = {};
  const unclear: string[] = [];

  // 1. Pain
  const painMatch = lower.match(/(?:pain|durere|dureri).*?([0-9]|10)/);
  if (painMatch) metrics.pain = parseInt(painMatch[1], 10);
  else if (/high pain|severe pain|durere mare|dureri mari/i.test(lower)) metrics.pain = 8;
  else if (/mild pain|slight pain|durere mica/i.test(lower)) metrics.pain = 3;

  // 2. Physical Energy
  const energyMatch = lower.match(/(?:energy|energie).*?([0-9]|10)/);
  if (energyMatch) metrics.physical_energy = parseInt(energyMatch[1], 10);
  else if (/low energy|exhausted|tired|obosit|epuizat|fara energie/i.test(lower)) metrics.physical_energy = 2;
  else if (/good energy|fresh|energie buna|high energy/i.test(lower)) metrics.physical_energy = 8;

  // 3. Brain fog / Concentration
  const fogMatch = lower.match(/(?:brain fog|fog|ceata).*?([0-9]|10)/);
  if (fogMatch) metrics.brain_fog = parseInt(fogMatch[1], 10);
  else if (/brain fog|can't think|ceata mentala|nu ma pot concentra|foggy/i.test(lower)) metrics.brain_fog = 7;

  // 4. Focus
  const focusMatch = lower.match(/(?:focus|concentrare).*?([0-9]|10)/);
  if (focusMatch) metrics.focus = parseInt(focusMatch[1], 10);
  else if (/can't focus|cannot focus|distracted|nu am focus/i.test(lower)) metrics.focus = 3;
  else if (/good focus|great focus|concentrare buna/i.test(lower)) metrics.focus = 8;

  // 5. Anxiety
  const anxMatch = lower.match(/(?:anxiety|anxietate).*?([0-9]|10)/);
  if (anxMatch) metrics.anxiety = parseInt(anxMatch[1], 10);
  else if (/anxious|panicked|stress|anxios|stresat/i.test(lower)) metrics.anxiety = 7;

  // 6. Overwhelm
  const ovwMatch = lower.match(/(?:overwhelm|copleșit|coplesit).*?([0-9]|10)/);
  if (ovwMatch) metrics.overwhelm = parseInt(ovwMatch[1], 10);
  else if (/overwhelmed|too much|coplesit/i.test(lower)) metrics.overwhelm = 8;

  // 7. Social battery
  const socMatch = lower.match(/(?:social battery|baterie sociala).*?([0-9]|10)/);
  if (socMatch) metrics.social_battery = parseInt(socMatch[1], 10);
  else if (/low social battery|no social battery|drained/i.test(lower)) metrics.social_battery = 2;

  // 8. Sensory load
  const senMatch = lower.match(/(?:sensory load|incarcare senzoriala).*?([0-9]|10)/);
  if (senMatch) metrics.sensory_load = parseInt(senMatch[1], 10);
  else if (/sensory overload|too loud|zgomot/i.test(lower)) metrics.sensory_load = 8;

  // Filter by tracked if provided
  const finalMetrics: Partial<Record<MetricKey, number>> = {};
  for (const [k, v] of Object.entries(metrics)) {
    const mk = k as MetricKey;
    if (!req.tracked || req.tracked.includes(mk)) {
      finalMetrics[mk] = Math.max(1, Math.min(10, Math.round(v)));
    }
  }

  // Symptoms extraction
  const symptoms: string[] = [];
  if (/cramps|pelvic pain|crampe/i.test(lower)) symptoms.push('pelvic pain');
  if (/migraine|headache|migrena|durere de cap/i.test(lower)) symptoms.push('headache');
  if (/fatigue|oboseala/i.test(lower)) symptoms.push('fatigue');

  return {
    metrics: finalMetrics,
    symptoms,
    notes: text ? `Extracted check-in notes: "${text}" (please review and confirm).` : '',
    unclear,
  };
}

// ============================================================================
// 2. summarizeStateFallback
// ============================================================================
export function summarizeStateFallback(req: {
  date: string;
  stats: Stats;
  recent?: Checkin[];
  simpleLanguage?: boolean;
}): StateSummary {
  const { date, stats } = req;
  const days = stats.days ?? 0;
  const byWd = [...(stats.byWeekday ?? [])].filter((d) => d.n > 0);
  const worstDay = byWd.sort((a, b) => a.avgCapacity - b.avgCapacity)[0];
  const bestDay = [...byWd].sort((a, b) => b.avgCapacity - a.avgCapacity)[0];

  const patterns: string[] = [];
  if (worstDay && bestDay && worstDay.weekday !== bestDay.weekday) {
    patterns.push(`Capacity averages ${worstDay.avgCapacity} of 10 on ${worstDay.label}s versus ${bestDay.avgCapacity} on ${bestDay.label}s.`);
  }

  if (stats.last7 && stats.prev7 && stats.prev7.avgCapacity > 0) {
    patterns.push(`Average capacity over the last 7 workdays was ${stats.last7.avgCapacity} of 10 (compared to ${stats.prev7.avgCapacity} previously).`);
  }

  const lowDaysCount = stats.last7?.lowCapacityDays ?? 0;
  if (lowDaysCount > 0) {
    patterns.push(`Recorded ${lowDaysCount} lower-capacity day${lowDaysCount > 1 ? 's' : ''} in the past week.`);
  }

  const suggestions = [
    'Schedule demanding analytical deliverables during your higher-capacity windows.',
    'Keep meetings shorter and request asynchronous updates on lower-energy days.',
  ];

  let overloadSignal: string | undefined;
  if (stats.last7 && stats.last7.lateNights >= 4 && stats.last7.lowCapacityDays >= 2) {
    overloadSignal = `You worked after 8 pm on ${stats.last7.lateNights} of the last 7 workdays and reported low capacity ${stats.last7.lowCapacityDays} times. Consider asking to redistribute tasks.`;
  }

  return {
    date: date || new Date().toISOString().slice(0, 10),
    headline: days >= 7
      ? `Recent capacity averages ${stats.last7?.avgCapacity ?? 5} of 10.`
      : 'Welcome to VibeCheck.',
    summary: days >= 7
      ? `Over ${days} recorded check-ins, your daily capacity shows identifiable weekly patterns. Pacing can be aligned with your energy rhythms.`
      : 'Complete daily check-ins to build personalized weekly energy patterns.',
    patterns: patterns.length ? patterns : ['Regular check-ins build a personal map of your energy rhythms.'],
    suggestions,
    overloadSignal,
    generatedBy: 'ai',
    model: 'fallback-deterministic',
  };
}

// ============================================================================
// 3. planDayFallback
// ============================================================================
export function planDayFallback(req: {
  date?: string;
  checkin?: Checkin | null;
  categories?: UserCategory[];
  events?: CalendarEvent[];
  tasks?: WorkTask[];
  workHours?: { start: string; end: string };
  hardDay?: boolean;
  weekdayPattern?: WeekdayPattern;
  protectDay?: boolean;
}): DayPlan {
  const { date = new Date().toISOString().slice(0, 10), checkin, categories = [], events = [], tasks = [], hardDay = false, protectDay = false } = req;
  const capacityScore = checkin?.capacityScore ?? 5;
  const isLowCapacity = capacityScore <= 3 || checkin?.capacity === 'low' || hardDay;
  const capacity: 'low' | 'medium' | 'high' = isLowCapacity ? 'low' : capacityScore >= 7 ? 'high' : 'medium';
  const mode: 'normal' | 'hard_day' = hardDay ? 'hard_day' : 'normal';
  const isChronic = categories.includes('chronic');

  const items: PlanItem[] = [];

  // Protect my day mode: group movable meetings into afternoon, carve 3h morning focus block
  if (protectDay) {
    // 1. Keep morning stand-up / fixed events before 10:00
    events.forEach((e) => {
      if (e.start < '10:00') {
        items.push({
          id: e.id,
          kind: 'event',
          refId: e.id,
          title: e.title,
          start: e.start.includes('T') ? e.start.split('T')[1].slice(0, 5) : e.start,
          end: e.end.includes('T') ? e.end.split('T')[1].slice(0, 5) : e.end,
          action: 'keep',
          reason: 'Core morning sync kept at scheduled time.',
        });
      }
    });

    // 2. Protected continuous focus block 10:00 - 13:00
    items.push({
      id: `focus-${Date.now()}`,
      kind: 'focus',
      title: 'Protected Focus Block: Deep Work',
      start: '10:00',
      end: '13:00',
      action: 'focus_block',
      reason: 'Protected 3-hour continuous focus window for high-priority analytical deliverables.',
    });

    // 3. Move movable meetings to afternoon (13:30 onwards)
    let afternoonHour = 13;
    let afternoonMin = 30;
    events.forEach((e) => {
      if (e.start >= '10:00') {
        const startStr = `${String(afternoonHour).padStart(2, '0')}:${String(afternoonMin).padStart(2, '0')}`;
        afternoonMin += 30;
        if (afternoonMin >= 60) {
          afternoonHour += 1;
          afternoonMin = 0;
        }
        const endStr = `${String(afternoonHour).padStart(2, '0')}:${String(afternoonMin).padStart(2, '0')}`;

        items.push({
          id: e.id,
          kind: 'event',
          refId: e.id,
          title: e.title,
          start: startStr,
          end: endStr,
          action: e.movable ? 'move' : 'keep',
          reason: e.movable
            ? 'Grouped into afternoon collaboration block to protect morning focus.'
            : 'Fixed afternoon commitment kept.',
        });
      }
    });

    // 4. Assign top tasks
    tasks.slice(0, 3).forEach((t) => {
      items.push({
        id: `task-${t.id}`,
        kind: 'task',
        refId: t.id,
        title: `${t.id}: ${t.title}`,
        action: 'keep',
        reason: 'Assigned to the protected 3-hour deep work focus block.',
        firstStep: `Open ${t.id} workspace and review the initial requirements checklist.`,
      });
    });

    return {
      date,
      capacity,
      mode,
      summary: 'Protected focus schedule: movable meetings consolidated into afternoon block, reserving 10:00–13:00 for uninterrupted deep work.',
      notificationLevel: 'normal',
      items,
      suggestedMessages: [],
      focusBlock: {
        start: '10:00',
        end: '13:00',
        label: 'Deep Work Focus Block',
        suggestedTaskIds: tasks.slice(0, 3).map((t) => t.id),
      },
      generatedAt: new Date().toISOString(),
      model: 'fallback-deterministic',
    };
  }

  // Normal / Hard day mode
  events.forEach((e) => {
    const isSprint = /sprint planning|planning|retro/i.test(e.title);
    const isSocial = /lunch|coffee|social|happy hour|casual/i.test(e.title);
    const timeStart = e.start.includes('T') ? e.start.split('T')[1].slice(0, 5) : e.start;
    const timeEnd = e.end.includes('T') ? e.end.split('T')[1].slice(0, 5) : e.end;

    if (isLowCapacity && isSprint) {
      items.push({
        id: e.id,
        kind: 'event',
        refId: e.id,
        title: e.title,
        start: timeStart,
        end: timeEnd,
        action: 'make_async',
        reason: `Capacity is ${capacityScore}/10; proposed asynchronous update to conserve physical energy.`,
      });
    } else if (isLowCapacity && isSocial) {
      items.push({
        id: e.id,
        kind: 'event',
        refId: e.id,
        title: e.title,
        start: timeStart,
        end: timeEnd,
        action: 'drop_today',
        reason: 'Optional social commitment dropped today to conserve energy.',
      });
    } else {
      items.push({
        id: e.id,
        kind: 'event',
        refId: e.id,
        title: e.title,
        start: timeStart,
        end: timeEnd,
        action: 'keep',
        reason: e.movable ? 'Movable meeting kept during available capacity.' : 'Fixed commitment kept.',
      });
    }
  });

  // Scheduled rest breaks on low capacity
  if (isLowCapacity || isChronic) {
    items.push({
      id: `break-${Date.now()}`,
      kind: 'break',
      title: 'Rest & pacing break',
      start: '12:00',
      end: '12:30',
      action: 'add_break',
      reason: `Scheduled 30-minute pacing break to manage fatigue with capacity ${capacityScore}/10.`,
    });
  }

  // Tasks: maximum 3 tasks if low capacity
  const taskLimit = isLowCapacity ? 3 : tasks.length;
  tasks.slice(0, taskLimit).forEach((t) => {
    const isBlocked = t.status === 'blocked';
    items.push({
      id: `task-${t.id}`,
      kind: 'task',
      refId: t.id,
      title: `${t.id}: ${t.title}`,
      action: isBlocked ? 'split' : 'keep',
      reason: isBlocked
        ? 'Blocked task broken down with an actionable 5-minute initial starter step.'
        : `Priority task scheduled for today.`,
      firstStep: isBlocked
        ? `Open ${t.id} and check the first pending item on the acceptance checklist.`
        : undefined,
    });
  });

  const suggestedMessages: { to: string; channel: 'email' | 'slack'; text: string }[] = isLowCapacity
    ? [
        {
          channel: 'slack',
          to: 'Team',
          text: 'Hi team, I am working with reduced capacity today due to a health flare. I will focus on priority deliverables and provide async updates.',
        },
      ]
    : [];

  return {
    date,
    capacity,
    mode,
    summary: `Adapted schedule for capacity ${capacityScore}/10 (${isLowCapacity ? 'low' : 'normal'}). Meetings and tasks organized to protect energy and focus.`,
    notificationLevel: isLowCapacity ? 'reduced' : 'normal',
    items,
    suggestedMessages,
    generatedAt: new Date().toISOString(),
    model: 'fallback-deterministic',
  };
}

// ============================================================================
// 4. breakdownTaskFallback
// ============================================================================
export function breakdownTaskFallback(req: { task: WorkTask; capacity?: Checkin['capacity'] }): { firstStep: string; steps: string[] } {
  const { task } = req;
  const title = task?.title || 'Deliverable';
  const id = task?.id || 'Task';
  const lower = title.toLowerCase();

  let firstStep = `Open ${id} workspace and review the acceptance criteria for 5 minutes.`;
  let steps = [
    `Open the ${id} workspace and locate the primary data or file source.`,
    `Review the top requirement and write down the single key output needed.`,
    `Complete the first draft subsection and save your working notes.`,
    `Do a quick 5-minute sanity check on the output before sharing.`,
  ];

  if (/churn|report|data|sql|chart|dashboard/i.test(lower)) {
    firstStep = `Open the ${title} notebook and re-run only the first query cell; write down the one number you need.`;
    steps = [
      `Open the relevant notebook or query editor and verify your database connection.`,
      `Run the initial query and inspect the top 5 sample rows.`,
      `Generate the primary summary table or chart and verify null values are handled.`,
      `Export the summary table into the draft deck or ticket comments.`,
    ];
  } else if (/duplicate|clean|bug|fix|error|null/i.test(lower)) {
    firstStep = `Open ${id} and filter the export file on the customer ID column to locate the first duplicate pair.`;
    steps = [
      `Open the export file and filter on the duplicate key column.`,
      `Inspect the first 3 duplicate rows to determine the matching pattern.`,
      `Apply the deduplication filter rule on a sample batch.`,
      `Document the resolution rule directly in the ticket description.`,
    ];
  } else if (/doc|wiki|guide|spec/i.test(lower)) {
    firstStep = `Create a blank document for ${title} and write only the title and 3 core section headings.`;
    steps = [
      `Create a blank document and write 3 section headings.`,
      `Draft 2-3 bullet points under the first heading.`,
      `Link relevant queries or ticket references.`,
      `Publish the initial working draft for review.`,
    ];
  } else if (/review|pr|notebook/i.test(lower)) {
    firstStep = `Open the review link and read only the file list and first 10 lines of the description.`;
    steps = [
      `Open the review diff and skim the list of modified files.`,
      `Check the main logic change in the primary file.`,
      `Leave one constructive comment or approval on the PR.`,
    ];
  }

  return { firstStep, steps };
}

// ============================================================================
// 5. composeContributionFallback
// ============================================================================
export function composeContributionFallback(req: {
  draft: string;
  meetingTitle?: string;
  checkin?: Pick<Checkin, 'capacityScore'> | null;
  tasks?: Pick<WorkTask, 'id' | 'title' | 'status'>[];
  mode?: 'clarify' | 'calm' | 'status_update' | 'polish';
}): MeetingContribution {
  const { draft = '', meetingTitle = 'the meeting', mode = 'clarify', tasks = [] } = req;
  const effectiveMode = mode === 'polish' ? 'clarify' : mode;

  let text = '';
  let why = '';

  if (effectiveMode === 'status_update') {
    const active = tasks.filter((t) => t.status !== 'done');
    const inProg = active.filter((t) => t.status === 'in_progress').map((t) => t.title).join(', ');
    const blocked = active.filter((t) => t.status === 'blocked').map((t) => t.title).join(', ');

    text = 'For my update today: ';
    if (inProg) text += `I am currently progressing on ${inProg}. `;
    if (blocked) text += `I need alignment on ${blocked} to unblock next steps. `;
    if (!inProg && !blocked) text += 'My assigned deliverables are on track and I am ready for the next priorities.';

    why = 'Structured directly from your active tasks (in progress and blocked).';
  } else if (effectiveMode === 'calm') {
    text = draft.trim()
      ? `Regarding our discussion on ${meetingTitle}: I wanted to check in calmly to make sure we are aligned on the priorities and deliverables. ${draft.trim()}`
      : `Hi team, I would like to check in on our progress regarding ${meetingTitle} and ensure we are aligned on next steps.`;

    why = 'Reframed calmly to communicate priorities and reduce workplace anxiety.';
  } else {
    // clarify mode
    const clean = draft.trim();
    if (!clean) {
      text = `Regarding ${meetingTitle}: I agree with the direction discussed and will follow up with the completed action items by the end of today.`;
    } else {
      const capitalized = clean.replace(/^[a-z]/, (c) => c.toUpperCase());
      if (/nu cred|i don't think|maybe|cred ca|not sure/i.test(capitalized)) {
        text = `Regarding this point: ${capitalized.replace(/^[., ]+/, '')} I would recommend that we align on these details before proceeding.`;
      } else if (/help|ajutor|blocat|blocked|issue|problema/i.test(capitalized)) {
        text = `I wanted to raise a key item: ${capitalized}. Could we coordinate for a few minutes to align on next steps?`;
      } else {
        text = `Regarding ${meetingTitle}: ${capitalized}${capitalized.endsWith('.') ? '' : '.'} I will ensure this is tracked with the team.`;
      }
    }
    why = 'Clarified into a direct, professional statement suitable for meetings.';
  }

  const trimmedText = text.slice(0, 450);

  return {
    text: trimmedText,
    why,
    spoken: trimmedText,
    chat: trimmedText,
  };
}

// ============================================================================
// 6. prepareMeetingFallback
// ============================================================================
export function prepareMeetingFallback(req: {
  meetingTitle: string;
  durationMin?: number;
  attendeesCount?: number;
  tasks?: Pick<WorkTask, 'id' | 'title'>[];
}): MeetingPrep {
  const { meetingTitle = 'Workplace Sync', durationMin = 30, tasks = [] } = req;
  const isStandup = /stand-?up|daily|sync/i.test(meetingTitle);
  const isSprint = /sprint|planning|retro/i.test(meetingTitle);
  const isOneOnOne = /1:1|andrei|manager|lead/i.test(meetingTitle);
  const isReview = /review|demo|showcase/i.test(meetingTitle);

  if (isStandup) {
    return {
      purpose: 'Provide quick visibility on completed items, today’s primary focus, and any blockers.',
      likelyQuestions: [
        'What did you work on yesterday?',
        'What is your main focus for today?',
        'Is anything blocking your progress?',
      ],
      myPoints: [
        tasks[0] ? `Progressing on ${tasks[0].title}.` : 'Current sprint deliverables are progressing according to plan.',
        tasks[1] ? `Next priority is ${tasks[1].title}.` : 'Ready to pick up the next priority item from the backlog.',
        'Continuing focused execution on assigned workstream milestones.',
      ],
      suggestedPhrases: [
        tasks[0] ? `I am currently working on ${tasks[0].title} and anticipate finishing it today.` : 'I am working on my scheduled tasks and on track for today.',
        'I prefer to post my detailed bullet points in the meeting chat.',
        'I will follow up in writing immediately after the stand-up.',
      ],
      whatToExpect: {
        duration: `${durationMin} minutes`,
        speakingExpectation: 'Short 1-2 minute turn when your name is called in round-robin order.',
        cameraRequired: false,
      },
      why: 'Prepares structured stand-up updates to prevent spontaneous speaking anxiety.',
    };
  }

  if (isSprint) {
    return {
      purpose: 'Review backlog scope, estimate upcoming effort, and agree on sprint deliverables.',
      likelyQuestions: [
        'Do you have capacity to take on this item?',
        'Are the requirements clear for your assigned tasks?',
        'Do you foresee dependencies on other teams?',
      ],
      myPoints: [
        'Reviewing ticket specifications to ensure acceptance criteria are complete.',
        'Focusing on realistic commitments that protect quality and focus time.',
        'Requesting asynchronous task review for complex requirements.',
      ],
      suggestedPhrases: [
        'The requirements look clear, and I estimate this will fit within my weekly allocation.',
        'I need a minute to review the ticket details before confirming the estimate.',
        'Could we document the agreed acceptance criteria directly in the ticket description?',
      ],
      whatToExpect: {
        duration: `${durationMin} minutes`,
        speakingExpectation: 'Participatory discussion while reviewing Jira tickets together on screen.',
        cameraRequired: false,
      },
      why: 'Clarifies planning questions ahead of time to eliminate cognitive overload during estimation.',
    };
  }

  if (isOneOnOne) {
    return {
      purpose: 'Align on weekly priorities, project trajectory, and feedback with your manager.',
      likelyQuestions: [
        'How is your workload feeling this week?',
        'What went well and where do you need extra support?',
        'Are there any process adjustments that would help you work better?',
      ],
      myPoints: [
        tasks[0] ? `Key milestone completed on ${tasks[0].title}.` : 'Key project deliverables are on track.',
        'Highlighting protected focus blocks that enabled uninterrupted progress.',
        'Clarifying timeline expectations for upcoming deliverables.',
      ],
      suggestedPhrases: [
        'I am making steady progress on my primary deliverables and feel aligned with the priorities.',
        'I would appreciate keeping our check-in format in writing where feasible.',
        'Let us review the remaining action items by the end of today.',
      ],
      whatToExpect: {
        duration: `${durationMin} minutes`,
        speakingExpectation: 'Collaborative, two-way conversational check-in.',
        cameraRequired: true,
      },
      why: 'Structures personal discussion points in advance to facilitate a calm, constructive conversation.',
    };
  }

  return {
    purpose: `Review progress and coordinate next steps for ${meetingTitle}.`,
    likelyQuestions: [
      'Can you share an update on your current deliverables?',
      'Do you need input or approvals from anyone in the group?',
      'What are the next action items for your workstream?',
    ],
    myPoints: [
      tasks[0] ? `Current workstream focused on ${tasks[0].title}.` : 'Deliverables are progressing according to schedule.',
      'Confirming next handoff points with the team.',
      'Documenting key decisions in written minutes after the sync.',
    ],
    suggestedPhrases: [
      'I agree with the direction discussed and will proceed with implementation.',
      'I have posted my thoughts and relevant links in the meeting chat for reference.',
      'Please share any specific action items for me in writing so I can track them accurately.',
    ],
    whatToExpect: {
      duration: `${durationMin} minutes`,
      speakingExpectation: 'Group discussion with opportunities to contribute via voice or chat.',
      cameraRequired: false,
    },
    why: 'Anticipates key discussion themes to ensure confident and prepared workplace participation.',
  };
}

// ============================================================================
// 7. advocateChatFallback & advocateChatModelFallback
// ============================================================================
export function advocateChatModelFallback(req: {
  requestId: string;
  message: string;
  category?: RequestCategory;
  profile?: Partial<UserProfile>;
}): {
  type: 'question';
  question: string;
  why: string;
} | {
  type: 'draft';
  category: RequestCategory;
  subject: string;
  body: string;
  notes: string[];
  recipients: 'manager' | 'hr' | 'both';
} {
  const { message, category = 'workload', profile } = req;
  const displayName = profile?.displayName || 'Ioana Popescu';
  const managerName = profile?.managerName || 'Andrei';
  const disclosure = profile?.disclosure || 'general';
  const conditions = profile?.conditions || ['endometriosis'];

  const conditionMention = disclosure === 'specific' && conditions.length
    ? `related to ${conditions.join(', ')}`
    : disclosure === 'general'
    ? 'related to a chronic health condition'
    : 'due to personal reasons';

  if (message.trim().length < 25) {
    return {
      type: 'question',
      question: 'Could you share what concrete adjustment would support you best right now (e.g. flexible start time, working from home on flare days, or redistributing specific tasks)?',
      why: 'Clarifies exact accommodation needs before preparing the request.',
    };
  }

  const subject = `Request for temporary workplace adjustments — ${displayName}`;
  const body = `Dear ${managerName},

I am writing to request a few temporary workplace adjustments ${conditionMention}. Specifically, I would benefit from: ${message.trim()}.

These adjustments will allow me to maintain high-quality deliverables while managing my current capacity. I would welcome the opportunity to discuss this briefly.

Best regards,
${displayName}`;

  return {
    type: 'draft',
    category,
    subject,
    body,
    notes: [
      'You do not have to share a medical diagnosis with your team.',
      'Focus on how this adjustment helps keep work deliverables on track.',
    ],
    recipients: 'manager',
  };
}

export function advocateChatFallback(req: {
  requestId: string;
  message: string;
  category?: RequestCategory;
  profile?: Partial<UserProfile>;
}): AdvocateReply {
  const modelOut = advocateChatModelFallback(req);
  if (modelOut.type === 'question') {
    return modelOut;
  }
  return {
    type: 'draft',
    category: modelOut.category,
    draft: {
      to: req.profile?.managerEmail ? [req.profile.managerEmail] : ['manager@company.com'],
      subject: modelOut.subject,
      body: modelOut.body,
      disclosureUsed: req.profile?.disclosure || 'general',
    },
    notes: modelOut.notes,
  };
}

// ============================================================================
// 8. decodeMessageFallback
// ============================================================================
export function decodeMessageFallback(req: { text: string; context?: string }): {
  meaning: string;
  urgency: string;
  suggestedReply: string;
  confidence: 'low' | 'medium' | 'high';
} {
  const lower = req.text.toLowerCase();

  if (/when you have a minute|cand ai un minut/i.test(lower)) {
    return {
      meaning: 'The sender has a non-critical question or update. They do not expect you to stop your current deep work; check in when you finish your current focus block (within 1–2 workdays).',
      urgency: 'Low — by end of day or tomorrow morning.',
      suggestedReply: 'Hi! Wrapping up a focused task right now. Can I connect with you at 15:00 or would you prefer written notes?',
      confidence: 'high',
    };
  }

  if (/quick chat|scurta discutie/i.test(lower)) {
    return {
      meaning: 'The sender wants a 5–10 minute alignment or clarification, not a crisis or performance review.',
      urgency: 'Medium — within a few hours.',
      suggestedReply: 'Sure, happy to connect. Could you share a quick bullet point on the topic so I can bring the right context?',
      confidence: 'high',
    };
  }

  if (/asap|urgent|cat mai repede/i.test(lower)) {
    return {
      meaning: 'High priority for the sender’s immediate schedule (e.g. for a leadership deck or upcoming deadline). They need numbers or confirmation promptly.',
      urgency: 'High — within 1–2 hours if feasible.',
      suggestedReply: 'Working on this now. I will share the preliminary numbers within the hour.',
      confidence: 'high',
    };
  }

  if (/no rush|fara graba/i.test(lower)) {
    return {
      meaning: 'Genuinely low urgency. Do not interrupt your current priorities or work overtime for this.',
      urgency: 'Low — later this week.',
      suggestedReply: 'Thank you for the note! I will review this by Thursday and follow up with you.',
      confidence: 'high',
    };
  }

  if (/circle back|revenim/i.test(lower)) {
    return {
      meaning: 'Postponing the topic to a later time; no immediate action is required from you right now.',
      urgency: 'Low — wait for follow-up.',
      suggestedReply: 'Sounds good, looking forward to circling back next week.',
      confidence: 'high',
    };
  }

  if (/per my last email|conform emailului/i.test(lower)) {
    return {
      meaning: 'The sender feels the information was already provided previously, but wants to confirm you have seen the details.',
      urgency: 'Medium — verify details.',
      suggestedReply: 'Thank you for pointing that out. I have re-checked the previous email and noted the specifications.',
      confidence: 'high',
    };
  }

  if (/can we talk|putem vorbi/i.test(lower)) {
    return {
      meaning: 'Direct request for 1:1 alignment. Usually operational or scheduling. Take a deep breath; this is normal workplace coordination.',
      urgency: 'Medium — schedule a slot.',
      suggestedReply: 'Happy to connect. Does 14:00 today work for you, or would tomorrow morning be better?',
      confidence: 'medium',
    };
  }

  if (/thoughts\?|ce parere ai/i.test(lower)) {
    return {
      meaning: 'Open-ended invitation for your perspective on a proposal, draft, or deliverable.',
      urgency: 'Low/Medium — 1–2 workdays.',
      suggestedReply: 'Reviewing this now. I will leave two specific bullet points in the document by end of day.',
      confidence: 'high',
    };
  }

  return {
    meaning: 'This message appears to be routine workplace communication. If the tone feels brief, it usually reflects the sender’s busy schedule, not dissatisfaction.',
    urgency: 'Normal — acknowledge when convenient.',
    suggestedReply: 'Acknowledged, thank you. I am reviewing this and will follow up shortly.',
    confidence: 'low',
  };
}