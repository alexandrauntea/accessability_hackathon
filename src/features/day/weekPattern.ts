// Owner: Alexandra. Weekday capacity patterns & week-ahead insights.
// Reads stats computed by Andreea's slice (computeStats) without recalculating.
import type { Checkin, MetricKey, CalendarEvent, WeekdayPattern } from '@/src/shared/types';
import { computeStats } from '@/src/features/insights/stats';

export interface WeekPatternAnalysis {
  hasEnoughData: boolean;
  message?: string;
  pattern?: WeekdayPattern;
  lowestDay?: {
    weekday: number; // 1 = Monday .. 5 = Friday
    label: string;
    avgCapacity: number;
    avgOverall: number;
  };
  suggestion?: {
    text: string;
    meetingTitle?: string;
    draftMessage?: string;
  };
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

export function analyzeWeekPattern(
  checkins: Checkin[],
  trackedMetrics: MetricKey[] = [],
  upcomingEvents: CalendarEvent[] = []
): WeekPatternAnalysis {
  // If user has under 2 weeks of check-ins (fewer than 10 workdays)
  if (checkins.length < 10) {
    return {
      hasEnoughData: false,
      message: 'Not enough data yet (need 2 weeks)',
    };
  }

  const stats = computeStats(checkins, trackedMetrics);
  const allScores = checkins
    .map((c) => c.capacityScore)
    .filter((s): s is number => typeof s === 'number');
  const avgOverall = avg(allScores);

  // Mark weekdays with avgCapacity <= avgOverall - 1.0 (or below 4.5 for chronic profiles) and at least 3 check-ins
  const lowDays = stats.byWeekday.filter(
    (w) => w.n >= 3 && (w.avgCapacity <= avgOverall - 1.0 || (avgOverall <= 5.5 && w.avgCapacity <= 4.0))
  );

  let lowestDay: WeekPatternAnalysis['lowestDay'] | undefined;
  if (lowDays.length > 0) {
    const sorted = [...lowDays].sort((a, b) => a.avgCapacity - b.avgCapacity);
    const lowest = sorted[0];
    lowestDay = {
      weekday: lowest.weekday,
      label: lowest.label,
      avgCapacity: lowest.avgCapacity,
      avgOverall,
    };
  }

  // Today check (1 = Mon .. 5 = Fri)
  const todayWd = new Date().getDay();
  const todayStat = stats.byWeekday.find((w) => w.weekday === todayWd);
  const todayIsUsuallyLow = todayStat
    ? todayStat.n >= 3 && todayStat.avgCapacity <= avgOverall - 1.5
    : false;

  const pattern: WeekdayPattern = {
    todayIsUsuallyLow,
    avgToday: todayStat?.avgCapacity ?? avgOverall,
    avgOverall,
    lowestWeekdayLabel: lowestDay?.label,
  };

  // Week-ahead card: check upcoming events in the next 5 days
  let suggestion: WeekPatternAnalysis['suggestion'] | undefined;
  if (lowestDay) {
    // Find events on the lowest weekday
    const targetEvents = upcomingEvents.filter((e) => {
      const d = new Date(e.start);
      return d.getDay() === lowestDay!.weekday;
    });

    const sprintEvent = targetEvents.find((e) => /sprint planning/i.test(e.title));
    const significantEvent = sprintEvent || targetEvents.find((e) => e.movable) || targetEvents[0];

    if (significantEvent) {
      const timeStr = significantEvent.start.includes('T')
        ? significantEvent.start.split('T')[1].slice(0, 5)
        : '';
      const dayName = lowestDay.label; // e.g. "Monday"
      const betterDay = stats.byWeekday.find(
        (w) => w.weekday !== lowestDay!.weekday && w.avgCapacity > lowestDay!.avgCapacity
      );
      const betterDayLabel = betterDay?.label ?? 'Tuesday';

      suggestion = {
        text: `${dayName}s are usually your lowest day (avg ${lowestDay.avgCapacity} vs ${avgOverall}). ${significantEvent.title} is on ${dayName}${timeStr ? ' ' + timeStr : ''}. Suggest moving it to ${betterDayLabel}?`,
        meetingTitle: significantEvent.title,
        draftMessage: `Hi team, could we explore moving ${significantEvent.title} to ${betterDayLabel}? I want to ensure I can contribute with maximum focus and energy.`,
      };
    } else {
      suggestion = {
        text: `${lowestDay.label}s are usually your lowest day (avg ${lowestDay.avgCapacity} vs ${avgOverall}). Consider keeping this day light with minimal meetings.`,
      };
    }
  }

  return {
    hasEnoughData: true,
    pattern,
    lowestDay,
    suggestion,
  };
}