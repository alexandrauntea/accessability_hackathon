import { extractAllNumbers, validateCitedNumbers, generateFallbackSummary } from './summarizeState';
import type { Stats } from '../lib/types';

console.log('--- Testing summarizeState grounding and fallback ---');

const mockStats: Stats = {
  days: 30,
  tracked: ['physical_energy', 'pain'],
  byWeekday: [
    { weekday: 1, label: 'Monday', avgCapacity: 3.5, avg: { physical_energy: 3, pain: 6 }, n: 6 },
    { weekday: 2, label: 'Tuesday', avgCapacity: 3.0, avg: { physical_energy: 3, pain: 6 }, n: 6 },
    { weekday: 3, label: 'Wednesday', avgCapacity: 6.0, avg: { physical_energy: 6, pain: 3 }, n: 6 },
    { weekday: 4, label: 'Thursday', avgCapacity: 6.5, avg: { physical_energy: 7, pain: 2 }, n: 6 },
    { weekday: 5, label: 'Friday', avgCapacity: 6.5, avg: { physical_energy: 7, pain: 2 }, n: 6 },
  ],
  last7: {
    avgCapacity: 3.4,
    avg: { physical_energy: 3, pain: 7 },
    lateNights: 5,
    lowCapacityDays: 4,
  },
  prev7: {
    avgCapacity: 5.7,
    avg: { physical_energy: 6, pain: 3 },
  },
  sleepCapacityCorrelation: 0.65,
};

// 1. Test number extraction
const extracted = extractAllNumbers(mockStats);
console.log('Extracted numbers count:', extracted.length);
if (!extracted.includes(3.5) || !extracted.includes(3.4) || !extracted.includes(5.7) || !extracted.includes(0.65)) {
  throw new Error('Number extraction missed key statistics');
}
console.log('✓ extractAllNumbers successfully captured stats.');

// 2. Test validation of cited numbers
const validCitations = [3.5, 3.4, 5.7];
const hallucinatedCitations = [3.5, 9.9]; // 9.9 was invented

if (!validateCitedNumbers(validCitations, extracted)) {
  throw new Error('Valid citations were wrongly flagged as invalid');
}
if (validateCitedNumbers(hallucinatedCitations, extracted)) {
  throw new Error('Hallucinated citation (9.9) was wrongly accepted!');
}
console.log('✓ validateCitedNumbers correctly accepts grounded numbers and rejects hallucinations.');

// 3. Test deterministic fallback summary
const fallback = generateFallbackSummary('2026-10-22', mockStats);
console.log('Fallback summary headline:', fallback.headline);
console.log('Fallback patterns:', fallback.patterns);
console.log('Fallback overload signal:', fallback.overloadSignal);

if (!fallback.headline.includes('3.4')) {
  throw new Error('Fallback headline does not quote real numbers');
}
if (!fallback.overloadSignal?.includes('5 of the last 7')) {
  throw new Error('Fallback failed to detect overload signal');
}
console.log('✓ generateFallbackSummary correctly produces grounded text and signals.');

console.log('All summarizeState tests passed!');