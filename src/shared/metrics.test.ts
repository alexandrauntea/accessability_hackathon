/**
 * Verification tests for metrics.ts and capacity derivation contract.
 */
import { METRICS, MetricDef, deriveCapacity, anchorFor } from './metrics';
import type { Checkin, MetricKey } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Running metrics tests ---');

// 1. deriveCapacity inverts higher_is_worse metrics
{
  const result = deriveCapacity({ pain: 8, physical_energy: 3, brain_fog: 7 });
  console.log('Test 1 (pain 8, energy 3, brain_fog 7):', result);
  assert(result.capacityScore === 3, `Expected capacityScore 3, got ${result.capacityScore}`);
  assert(result.capacity === 'low', `Expected capacity "low", got "${result.capacity}"`);
  console.log('? Check 1 passed: deriveCapacity inverts higher_is_worse metrics.');
}

// 2. Result always integer 1..10, works with 2 or 3 metrics, ignores unknown keys
{
  // Works with 2 metrics
  const res2 = deriveCapacity({ anxiety: 5, overwhelm: 5 });
  assert(Number.isInteger(res2.capacityScore), 'capacityScore must be an integer');
  assert(res2.capacityScore >= 1 && res2.capacityScore <= 10, 'capacityScore must be between 1 and 10');

  // Works with 3 metrics
  const res3 = deriveCapacity({ focus: 8, sensory_load: 2, social_battery: 8 });
  assert(Number.isInteger(res3.capacityScore), 'capacityScore must be an integer');
  assert(res3.capacityScore >= 1 && res3.capacityScore <= 10, 'capacityScore must be between 1 and 10');

  // All combinations of 1..10 yield integers 1..10
  for (let p = 1; p <= 10; p++) {
    for (let e = 1; e <= 10; e++) {
      const res = deriveCapacity({ pain: p, physical_energy: e });
      assert(Number.isInteger(res.capacityScore), `Score must be integer for p=${p}, e=${e}`);
      assert(res.capacityScore >= 1 && res.capacityScore <= 10, `Score out of bounds: ${res.capacityScore}`);
    }
  }

  // Ignores unknown keys
  const resUnknown = deriveCapacity({ pain: 8, physical_energy: 3, invalid_metric: 10 } as any);
  assert(resUnknown.capacityScore === 3, `Expected unknown key to be ignored and result in 3, got ${resUnknown.capacityScore}`);

  console.log('? Check 2 passed: integer 1..10, works with 2 or 3 metrics, ignores unknown keys.');
}

// 3. Every metric has an operational question, anchors for 1..10, no emojis
{
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const metricKeys = Object.keys(METRICS) as MetricKey[];
  assert(metricKeys.length === 8, `Expected 8 metrics, found ${metricKeys.length}`);

  for (const key of metricKeys) {
    const def = METRICS[key];
    // Operational question
    assert(typeof def.question === 'string' && def.question.length > 10, `${key} must have an operational question`);
    assert(!emojiRegex.test(def.question), `${key} question contains emojis`);
    assert(!emojiRegex.test(def.label), `${key} label contains emojis`);

    // Anchors
    assert(typeof def.anchors[1] === 'string' && def.anchors[1].length > 0, `${key} missing anchor 1`);
    assert(typeof def.anchors[5] === 'string' && def.anchors[5].length > 0, `${key} missing anchor 5`);
    assert(typeof def.anchors[10] === 'string' && def.anchors[10].length > 0, `${key} missing anchor 10`);

    // Every value 1..10 produces an anchor text via anchorFor
    for (let v = 1; v <= 10; v++) {
      const a = anchorFor(def, v);
      assert(typeof a === 'string' && a.length > 0, `${key} anchorFor failed for value ${v}`);
      assert(!emojiRegex.test(a), `${key} anchor ${v} contains emojis: "${a}"`);
    }
  }
  console.log('? Check 3 passed: all metrics have operational questions, factual anchors, and no emojis.');
}

// 4. Metric directions check
{
  assert(METRICS.physical_energy.direction === 'higher_is_better', 'physical_energy must be higher_is_better');
  assert(METRICS.pain.direction === 'higher_is_worse', 'pain must be higher_is_worse');
  assert(METRICS.brain_fog.direction === 'higher_is_worse', 'brain_fog must be higher_is_worse');
  assert(METRICS.focus.direction === 'higher_is_better', 'focus must be higher_is_better');
  assert(METRICS.sensory_load.direction === 'higher_is_worse', 'sensory_load must be higher_is_worse');
  assert(METRICS.social_battery.direction === 'higher_is_better', 'social_battery must be higher_is_better');
  assert(METRICS.anxiety.direction === 'higher_is_worse', 'anxiety must be higher_is_worse');
  assert(METRICS.overwhelm.direction === 'higher_is_worse', 'overwhelm must be higher_is_worse');
  console.log('? Check 4 passed: metric directions.');
}

console.log('All metric checks passed successfully!');