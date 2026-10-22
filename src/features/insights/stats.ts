// Owner: Andreea. Deterministic statistics. The LLM only EXPLAINS these numbers; it never invents them.
import type { Checkin, MetricKey, Stats, WeekdayStat } from '@/src/shared/types';
import { WEEKDAYS } from '@/src/shared/dates';
import { METRICS } from '@/src/shared/metrics';

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
const avgMetrics = (cs: Checkin[], keys: MetricKey[]) =>
  Object.fromEntries(keys.map((k) => [k, avg(cs.map((c) => c.metrics[k]).filter((v): v is number => typeof v === 'number'))])) as Partial<Record<MetricKey, number>>;

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 7) return null;
  const mx = avg(xs), my = avg(ys);
  let num = 0, dx = 0, dy = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); dx += (x - mx) ** 2; dy += (ys[i] - my) ** 2; });
  return dx && dy ? Math.round((num / Math.sqrt(dx * dy)) * 100) / 100 : null;
}

/** checkins: newest first (as returned by listCheckins). tracked: the user's chosen metrics. */
export function computeStats(checkins: Checkin[], tracked: MetricKey[]): Stats {
  const keys = tracked.length ? tracked : (Array.from(new Set(checkins.flatMap((c) => Object.keys(c.metrics)))) as MetricKey[]);
  const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const day = checkins.filter((c) => new Date(c.date + 'T12:00:00').getDay() === wd);
    return { weekday: wd, label: WEEKDAYS[wd], avgCapacity: avg(day.map((c) => c.capacityScore)), avg: avgMetrics(day, keys), n: day.length };
  });
  const last7 = checkins.slice(0, 7), prev7 = checkins.slice(7, 14);
  const withSleep = checkins.filter((c) => typeof c.sleepHours === 'number');
  return {
    days: checkins.length,
    tracked: keys,
    byWeekday,
    last7: {
      avgCapacity: avg(last7.map((c) => c.capacityScore)), avg: avgMetrics(last7, keys),
      lateNights: last7.filter((c) => c.workedLateYesterday).length,
      lowCapacityDays: last7.filter((c) => c.capacity === 'low').length,
    },
    prev7: { avgCapacity: avg(prev7.map((c) => c.capacityScore)), avg: avgMetrics(prev7, keys) },
    sleepCapacityCorrelation: pearson(withSleep.map((c) => c.sleepHours!), withSleep.map((c) => c.capacityScore)),
  };
}

/** Rule-based early-warning (e.g. "worked after 8 pm 4 days in a row + low capacity"). */
export function overloadSignal(s: Stats): string | null {
  if (s.last7.lateNights >= 4 && s.last7.lowCapacityDays >= 2)
    return `You worked after 8 pm on ${s.last7.lateNights} of the last 7 workdays and reported low capacity ${s.last7.lowCapacityDays} times. Consider asking to redistribute tasks.`;
  return null;
}

/** Finds the weekday with lowest average capacity among days with check-ins. */
export function findLowestWeekday(byWeekday: WeekdayStat[]): WeekdayStat | null {
  const withData = byWeekday.filter((d) => d.n > 0);
  if (!withData.length) return null;
  return [...withData].sort((a, b) => a.avgCapacity - b.avgCapacity)[0];
}

/** Finds the weekday with highest average capacity among days with check-ins. */
export function findHighestWeekday(byWeekday: WeekdayStat[]): WeekdayStat | null {
  const withData = byWeekday.filter((d) => d.n > 0);
  if (!withData.length) return null;
  return [...withData].sort((a, b) => b.avgCapacity - a.avgCapacity)[0];
}

/** Screen reader / speakText plain-language summary of computed stats. */
export function buildInsightsSpeakText(stats: Stats): string {
  if (stats.days < 14) {
    return `Not enough data yet (need 2 weeks). You have ${stats.days} check-in${stats.days === 1 ? '' : 's'} recorded. You need at least 14 check-ins to see patterns.`;
  }
  const lowest = findLowestWeekday(stats.byWeekday);
  const highest = findHighestWeekday(stats.byWeekday);
  const parts: string[] = [];
  parts.push(`Over ${stats.days} check-ins:`);
  if (lowest && highest && lowest.weekday !== highest.weekday) {
    parts.push(`Daily capacity is lowest on ${lowest.label}s, average ${lowest.avgCapacity} of 10, and highest on ${highest.label}s, average ${highest.avgCapacity} of 10.`);
  } else if (lowest) {
    parts.push(`Average capacity is ${lowest.avgCapacity} of 10.`);
  }
  parts.push(`In the last 7 days, your average capacity was ${stats.last7.avgCapacity} of 10, compared to ${stats.prev7.avgCapacity} in the previous 7 days.`);

  if (stats.tracked.length > 0) {
    const metricSummary = stats.tracked
      .filter((k) => typeof stats.last7.avg[k] === 'number')
      .map((k) => `${METRICS[k]?.label ?? k}: ${stats.last7.avg[k]} of 10 (was ${stats.prev7.avg[k] ?? 'not recorded'})`);
    if (metricSummary.length > 0) {
      parts.push(`Metric averages for the last 7 days versus previous: ${metricSummary.join(', ')}.`);
    }
  }

  if (stats.last7.lateNights > 0) {
    parts.push(`You worked late ${stats.last7.lateNights} of the last 7 workdays.`);
  }

  const signal = overloadSignal(stats);
  if (signal) {
    parts.push(`Early overload warning: ${signal}`);
  }

  return parts.join(' ');
}
