/**
 * SHARED CONTRACT (owner: Andreea). Metric definitions: operational questions + factual anchors.
 * No emojis, no vague "how do you feel". Every scale is 1..10.
 */
import type { Capacity, Checkin, MetricKey, UserCategory } from './types';

export interface MetricDef {
  key: MetricKey;
  label: string;
  question: string; // operational, explicit
  direction: 'higher_is_better' | 'higher_is_worse';
  anchors: { 1: string; 5: string; 10: string };
  category: UserCategory;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  physical_energy: { key: 'physical_energy', label: 'Physical energy', category: 'chronic', direction: 'higher_is_better',
    question: 'How much physical work can your body do today?',
    anchors: { 1: 'Only short tasks from bed or sofa', 5: 'A normal desk day with breaks', 10: 'A full day, including travel and standing' } },
  pain: { key: 'pain', label: 'Pain', category: 'chronic', direction: 'higher_is_worse',
    question: 'How much does pain limit your work right now?',
    anchors: { 1: 'No pain', 5: 'Noticeable; I need breaks every hour', 10: 'I cannot work through it' } },
  brain_fog: { key: 'brain_fog', label: 'Brain fog', category: 'chronic', direction: 'higher_is_worse',
    question: 'How hard is it to think clearly and remember things today?',
    anchors: { 1: 'Clear thinking', 5: 'I need notes and written steps', 10: 'I cannot follow a complex discussion' } },
  focus: { key: 'focus', label: 'Focus', category: 'neurodivergent', direction: 'higher_is_better',
    question: 'How long can you hold attention on one task today?',
    anchors: { 1: 'Under 5 minutes', 5: 'About 25 minutes at a time', 10: '2+ hours of deep work' } },
  sensory_load: { key: 'sensory_load', label: 'Sensory load', category: 'neurodivergent', direction: 'higher_is_worse',
    question: 'How much noise, light and interruption can you take today?',
    anchors: { 1: 'An open office is fine', 5: 'I need headphones and a quiet slot', 10: 'Any extra input is too much' } },
  social_battery: { key: 'social_battery', label: 'Social battery', category: 'neurodivergent', direction: 'higher_is_better',
    question: 'What is your capacity for social interaction today?',
    anchors: { 1: 'Written, asynchronous contact only', 5: 'One or two short meetings', 10: 'Workshops and presentations are fine' } },
  anxiety: { key: 'anxiety', label: 'Anxiety', category: 'psychosocial', direction: 'higher_is_worse',
    question: 'How much is anxiety affecting your ability to work today?',
    anchors: { 1: 'Not at all', 5: 'I avoid calls and need a clear plan', 10: 'I cannot start or reply to messages' } },
  overwhelm: { key: 'overwhelm', label: 'Overwhelm', category: 'psychosocial', direction: 'higher_is_worse',
    question: 'How overwhelming does your workload feel today?',
    anchors: { 1: 'Manageable', 5: 'Too many open items; I need priorities', 10: 'I cannot decide where to start' } },
};

export const CATEGORY_DEFAULTS: Record<UserCategory, { label: string; metrics: MetricKey[]; aiRole: string }> = {
  chronic: { label: 'Chronic illness (e.g. endometriosis, fibromyalgia)', metrics: ['physical_energy', 'pain', 'brain_fog'],
    aiRole: 'Reschedules meetings, adds break blocks, drafts messages to make meetings asynchronous' },
  neurodivergent: { label: 'Neurodivergence (e.g. ADHD, autism)', metrics: ['focus', 'sensory_load', 'social_battery'],
    aiRole: 'Breaks large Jira tasks into 5-minute steps, blocks deep-work time, cancels non-essential 1:1s' },
  psychosocial: { label: 'Psychosocial (e.g. anxiety, depression, burnout)', metrics: ['anxiety', 'overwhelm'],
    aiRole: 'Hard-day mode with fewer notifications, simplifies daily decisions, drafts Slack replies' },
};

/** Unified daily capacity anchors (the only number that may reach an employer, inside a request the user sends). */
export const CAPACITY_ANCHORS = { 1: 'Only short asynchronous tasks', 5: 'Normal working capacity', 10: 'Full flow, ready for complex meetings' };

/** Convert any metric to "goodness" 1..10, average, round. Deterministic and explainable. */
export function deriveCapacity(metrics: Checkin['metrics']): { capacityScore: number; capacity: Capacity } {
  const vals = (Object.keys(metrics) as MetricKey[])
    .filter((k) => typeof metrics[k] === 'number')
    .map((k) => (METRICS[k].direction === 'higher_is_better' ? metrics[k]! : 11 - metrics[k]!));
  const capacityScore = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 5;
  const capacity: Capacity = capacityScore <= 3 ? 'low' : capacityScore >= 7 ? 'high' : 'medium';
  return { capacityScore, capacity };
}

/** Nearest anchor text for screen readers and the visible caption. */
export function anchorFor(def: { anchors: { 1: string; 5: string; 10: string } }, v: number) {
  return v <= 3 ? def.anchors[1] : v >= 8 ? def.anchors[10] : def.anchors[5];
}
