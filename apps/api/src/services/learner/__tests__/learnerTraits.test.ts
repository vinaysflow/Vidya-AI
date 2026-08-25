/**
 * learnerTraits.ts — pure trait-rollup math.
 *
 * Covers the four computations the rollup composes:
 *  - computeHabitScores   (persistence, precision, self-correction, explanation, pattern-seeking)
 *  - computeChannelWeights (breakthrough-representation tallies + EMA blend)
 *  - computeStruggleAffect (struggle tolerance & frustration proneness)
 *  - trendOf / bestChannelOf thresholds
 */

import { describe, it, expect } from 'vitest';
import type { LearnerEvent } from '@prisma/client';
import {
  computeHabitScores,
  computeChannelWeights,
  computeStruggleAffect,
  trendOf,
  bestChannelOf,
} from '../learnerTraits';

let seq = 0;
function ev(partial: Partial<LearnerEvent>): LearnerEvent {
  seq += 1;
  return {
    id: partial.id ?? `e${seq}`,
    userId: 'u',
    sessionId: partial.sessionId ?? 's1',
    conceptKey: partial.conceptKey ?? 'c1',
    templateId: null,
    kind: partial.kind ?? 'ATTEMPT',
    correct: partial.correct ?? null,
    distanceFromSolution: partial.distanceFromSolution ?? null,
    errorType: partial.errorType ?? null,
    errorDescription: null,
    misconceptionId: null,
    hintLevel: partial.hintLevel ?? null,
    latencyMs: partial.latencyMs ?? null,
    representation: partial.representation ?? null,
    payload: null,
    ts: partial.ts ?? new Date(2026, 0, 1, 0, 0, seq),
  } as unknown as LearnerEvent;
}

describe('computeHabitScores', () => {
  it('credits persistence when the kid attempts again after a wrong answer', () => {
    const events = [
      ev({ kind: 'ATTEMPT', correct: false, ts: new Date(2026, 0, 1, 0, 0, 1) }),
      ev({ kind: 'ATTEMPT', correct: true, ts: new Date(2026, 0, 1, 0, 0, 2) }),
    ];
    const { persistence, selfCorrection } = computeHabitScores(events);
    expect(persistence).toBe(1);
    // wrong -> right in the same session with hint < 5 is a self-correction.
    expect(selfCorrection).toBe(1);
  });

  it('precision is the inverse of computational-error frequency', () => {
    const events = [
      ev({ kind: 'ATTEMPT', correct: false, errorType: 'computational' }),
      ev({ kind: 'ATTEMPT', correct: true }),
    ];
    // 1 computational error across 2 attempts -> 1 - 1/2 = 0.5
    expect(computeHabitScores(events).precision).toBe(0.5);
  });

  it('rewards pattern-seeking for low-hint breakthroughs', () => {
    const events = [
      ev({ kind: 'BREAKTHROUGH', correct: true, hintLevel: 0 }),
      ev({ kind: 'BREAKTHROUGH', correct: true, hintLevel: 4 }),
    ];
    // 1 of 2 breakthroughs reached with hintLevel <= 1
    expect(computeHabitScores(events).patternSeeking).toBe(0.5);
  });

  it('scores explanation by explain-backs relative to wins', () => {
    const events = [
      ev({ kind: 'ATTEMPT', correct: true }),
      ev({ kind: 'EXPLAIN_BACK', correct: true }),
    ];
    expect(computeHabitScores(events).explanation).toBe(1);
  });

  it('uses neutral priors when there is no signal', () => {
    const h = computeHabitScores([]);
    expect(h.persistence).toBe(0.5);
    expect(h.precision).toBe(0.5);
    expect(h.patternSeeking).toBe(0.5);
  });
});

describe('computeChannelWeights', () => {
  it('tallies breakthrough representations and EMA-blends with a uniform prior', () => {
    const events = [
      ev({ kind: 'BREAKTHROUGH', representation: 'visual' }),
      ev({ kind: 'BREAKTHROUGH', representation: 'visual' }),
    ];
    const w = computeChannelWeights(events, {});
    // session = {visual:1}, prior uniform 0.25, alpha 0.4 -> visual 0.55, others 0.15
    expect(w.visual).toBeCloseTo(0.55, 3);
    expect(w.symbolic).toBeCloseTo(0.15, 3);
    const sum = w.manipulative + w.visual + w.symbolic + w.story;
    expect(sum).toBeCloseTo(1, 2);
  });

  it('blends toward an existing prior', () => {
    const events = [ev({ kind: 'BREAKTHROUGH', representation: 'visual' })];
    const w = computeChannelWeights(events, { visual: 0.55, manipulative: 0.15, symbolic: 0.15, story: 0.15 });
    // visual = 0.55*0.6 + 1*0.4 = 0.73
    expect(w.visual).toBeCloseTo(0.73, 2);
  });

  it('defaults to uniform when there is no representation signal', () => {
    const w = computeChannelWeights([ev({ kind: 'ATTEMPT', correct: true })], {});
    expect(w.visual).toBeCloseTo(0.25, 3);
  });
});

describe('computeStruggleAffect', () => {
  it('high think-time and high hint-at-breakthrough => high tolerance, no frustration', () => {
    const events = [
      ev({ kind: 'ATTEMPT', correct: false, latencyMs: 60_000 }),
      ev({ kind: 'BREAKTHROUGH', correct: true, hintLevel: 5 }),
    ];
    const { struggleTolerance, frustrationProneness } = computeStruggleAffect(events);
    expect(struggleTolerance).toBe(1);
    expect(frustrationProneness).toBe(0);
  });

  it('abandonment and rapid hint escalation raise frustration', () => {
    const events = [
      ev({ kind: 'ATTEMPT', correct: false }),
      ev({ kind: 'HINT_ESCALATED' }),
      ev({ kind: 'ABANDON' }),
    ];
    expect(computeStruggleAffect(events).frustrationProneness).toBeGreaterThan(0);
  });
});

describe('trendOf', () => {
  it('classifies up / flat / down by a 0.07 band', () => {
    expect(trendOf(0.5, 0.65)).toBe('up');
    expect(trendOf(0.5, 0.5)).toBe('flat');
    expect(trendOf(0.6, 0.5)).toBe('down');
  });
});

describe('bestChannelOf', () => {
  it('returns the dominant channel only when meaningfully above uniform', () => {
    expect(bestChannelOf({ manipulative: 0.15, visual: 0.55, symbolic: 0.15, story: 0.15 })).toBe('visual');
    expect(bestChannelOf({ manipulative: 0.25, visual: 0.25, symbolic: 0.25, story: 0.25 })).toBeNull();
  });
});
