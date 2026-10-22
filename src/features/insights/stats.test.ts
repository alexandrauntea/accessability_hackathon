import { PERSONAS, personaMetrics } from '../../mocks/personas';
import { computeStats, overloadSignal } from './stats';
import { deriveCapacity } from '../../shared/metrics';
import { todayISO } from '../../shared/dates';
import type { Checkin } from '../../shared/types';

function generatePersonaCheckins(id: 'ioana' | 'matei' | 'elena', days = 42): Checkin[] {
  const p = PERSONAS[id];
  const checkins: Checkin[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue; // skip weekends
    const m = personaMetrics(id, i, wd);
    const cap = deriveCapacity(m.metrics);
    checkins.push({
      date: todayISO(d),
      metrics: m.metrics,
      sleepHours: m.sleepHours,
      symptoms: m.symptoms,
      workedLateYesterday: m.late,
      source: 'manual',
      capacityScore: cap.capacityScore,
      capacity: cap.capacity,
      createdAt: d.toISOString(),
    });
  }
  return checkins;
}

console.log('--- Testing computeStats & Personas ---');

// Test Ioana
{
  const checkins = generatePersonaCheckins('ioana');
  const stats = computeStats(checkins, PERSONAS.ioana.trackedMetrics);
  console.log('Ioana stats:');
  console.log('  By weekday:', stats.byWeekday.map((w) => `${w.label}: ${w.avgCapacity}`));
  console.log(`  Last 7 avg: ${stats.last7.avgCapacity} vs Prev 7: ${stats.prev7.avgCapacity}`);

  const mon = stats.byWeekday.find((w) => w.weekday === 1)!;
  const tue = stats.byWeekday.find((w) => w.weekday === 2)!;
  const wed = stats.byWeekday.find((w) => w.weekday === 3)!;
  const thu = stats.byWeekday.find((w) => w.weekday === 4)!;
  const fri = stats.byWeekday.find((w) => w.weekday === 5)!;

  const lowDaysAvg = (mon.avgCapacity + tue.avgCapacity) / 2;
  const otherDaysAvg = (wed.avgCapacity + thu.avgCapacity + fri.avgCapacity) / 3;

  if (lowDaysAvg >= otherDaysAvg) {
    throw new Error(`Ioana Monday/Tuesday (${lowDaysAvg}) not lower than other days (${otherDaysAvg})`);
  }
  if (stats.last7.avgCapacity >= stats.prev7.avgCapacity) {
    throw new Error(`Ioana last 7 (${stats.last7.avgCapacity}) not worse than prev 7 (${stats.prev7.avgCapacity})`);
  }
  console.log('✓ Ioana: Monday/Tuesday capacity lower & last 7 worse than previous 7.');
}

// Test Matei
{
  const checkins = generatePersonaCheckins('matei');
  const stats = computeStats(checkins, PERSONAS.matei.trackedMetrics);
  const tue = stats.byWeekday.find((w) => w.weekday === 2)!;
  const thu = stats.byWeekday.find((w) => w.weekday === 4)!;
  const mon = stats.byWeekday.find((w) => w.weekday === 1)!;

  const meetingDaysSensory = (tue.avg.sensory_load! + thu.avg.sensory_load!) / 2;
  const otherDaysSensory = mon.avg.sensory_load!;

  console.log(`Matei meeting days sensory load: ${meetingDaysSensory} vs Mon: ${otherDaysSensory}`);
  if (meetingDaysSensory <= otherDaysSensory) {
    throw new Error(`Matei meeting days sensory load (${meetingDaysSensory}) not higher than quiet days (${otherDaysSensory})`);
  }
  console.log('✓ Matei: meeting days (Tue/Thu) have high sensory load.');
}

// Test Elena
{
  const checkins = generatePersonaCheckins('elena');
  const stats = computeStats(checkins, PERSONAS.elena.trackedMetrics);
  console.log(`Elena late nights in last 7: ${stats.last7.lateNights}`);
  console.log(`Elena last 7 overwhelm: ${stats.last7.avg.overwhelm} vs prev 7: ${stats.prev7.avg.overwhelm}`);
  console.log(`Elena signal:`, overloadSignal(stats));

  if (stats.last7.lateNights < 4) {
    throw new Error(`Elena expected at least 4-5 late nights in last 7, got ${stats.last7.lateNights}`);
  }
  if ((stats.last7.avg.overwhelm ?? 0) <= (stats.prev7.avg.overwhelm ?? 0)) {
    throw new Error(`Elena overwhelm in last 7 not higher than prev 7`);
  }
  console.log('✓ Elena: late nights >= 4 in last 7, overwhelm rising over last 2 weeks.');
}

console.log('All persona and computeStats tests passed!');