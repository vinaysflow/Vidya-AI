/**
 * learnerTraits.ts
 *
 * Phases 2 & 3 of the learner model: the slow-moving traits computed by rolling
 * up the LearnerEvent spine.
 *
 *  - Habits of mind (Phase 2): persistence, patternSeeking, precision,
 *    selfCorrection, explanation. Each as { score 0..1, trend }. This is the
 *    no-scores feedback currency surfaced to kids and parents.
 *  - Learning-channel model (Phase 3): channelWeights — which representation
 *    precedes this kid's breakthroughs.
 *  - Struggle/affect model (Phase 3): struggleTolerance, frustrationProneness.
 *
 * The heavy rollup runs at session end (cheap online updates happen per-turn via
 * the telemetry spine). EMA blending keeps the model stable across sessions.
 */

import type { LearnerEvent } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const EMA_ALPHA = 0.4; // weight of the new session's signal vs. accumulated history
const REPRESENTATIONS = ['manipulative', 'visual', 'symbolic', 'story'] as const;
type Representation = (typeof REPRESENTATIONS)[number];

export type Trend = 'up' | 'flat' | 'down';
export interface HabitScore {
  score: number; // 0..1
  trend: Trend;
}
export type HabitKey =
  | 'persistence'
  | 'patternSeeking'
  | 'precision'
  | 'selfCorrection'
  | 'explanation';

export type Habits = Record<HabitKey, HabitScore>;
export type ChannelWeights = Record<Representation, number>;

export interface LearnerTraitsView {
  habits: Habits;
  channelWeights: ChannelWeights;
  struggleTolerance: number;
  frustrationProneness: number;
  optimalSessionMinutes: number | null;
  bestChannel: Representation | null;
  lastRollupAt: Date | null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function trendOf(prev: number, next: number): Trend {
  const delta = next - prev;
  if (delta > 0.07) return 'up';
  if (delta < -0.07) return 'down';
  return 'flat';
}

/** Group events by session, each sorted by timestamp ascending. */
function bySession(events: LearnerEvent[]): LearnerEvent[][] {
  const map = new Map<string, LearnerEvent[]>();
  for (const e of events) {
    const key = e.sessionId ?? `__none_${e.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.values()].map((arr) => arr.sort((a, b) => a.ts.getTime() - b.ts.getTime()));
}

/**
 * Computes the five habit scores (0..1) over a set of events.
 * Pure function so trend can be derived by running it over two windows.
 */
export function computeHabitScores(events: LearnerEvent[]): Record<HabitKey, number> {
  const attempts = events.filter((e) => e.kind === 'ATTEMPT');
  const wrong = attempts.filter((e) => e.correct === false);
  const correct = attempts.filter((e) => e.correct === true);
  const breakthroughs = events.filter((e) => e.kind === 'BREAKTHROUGH');
  const explainBacks = events.filter((e) => e.kind === 'EXPLAIN_BACK');
  const abandons = events.filter((e) => e.kind === 'ABANDON');

  // Persistence: kept attempting after wrong answers, low abandonment.
  let followedAfterWrong = 0;
  for (const session of bySession(events)) {
    for (let i = 0; i < session.length; i++) {
      const e = session[i];
      if (e.kind === 'ATTEMPT' && e.correct === false) {
        const laterAttempt = session.slice(i + 1).some((n) => n.kind === 'ATTEMPT');
        if (laterAttempt) followedAfterWrong++;
      }
    }
  }
  const persistence =
    wrong.length === 0
      ? (attempts.length > 0 ? 0.7 : 0.5)
      : clamp01(followedAfterWrong / wrong.length - abandons.length * 0.1);

  // Pattern-seeking + explanation quality: breakthroughs reached with few hints,
  // plus the act of explaining back.
  const lowHintBreakthroughs = breakthroughs.filter((b) => (b.hintLevel ?? 0) <= 1).length;
  const patternSeeking =
    breakthroughs.length === 0
      ? 0.5
      : clamp01(lowHintBreakthroughs / breakthroughs.length);

  // Precision: inverse of computational-error frequency.
  const computationalErrors = wrong.filter((e) => e.errorType === 'computational').length;
  const precision =
    attempts.length === 0 ? 0.5 : clamp01(1 - computationalErrors / attempts.length);

  // Self-correction: wrong -> right within the same session without maxing hints.
  let selfCorrections = 0;
  let correctableWrongs = 0;
  for (const session of bySession(events)) {
    for (let i = 0; i < session.length; i++) {
      const e = session[i];
      if (e.kind === 'ATTEMPT' && e.correct === false) {
        correctableWrongs++;
        const recovered = session
          .slice(i + 1)
          .find((n) => n.kind === 'ATTEMPT' && n.correct === true && (n.hintLevel ?? 0) < 5);
        if (recovered) selfCorrections++;
      }
    }
  }
  const selfCorrection =
    correctableWrongs === 0 ? (correct.length > 0 ? 0.6 : 0.5) : clamp01(selfCorrections / correctableWrongs);

  // Explanation: how often the kid taught back relative to their wins.
  const explanation =
    correct.length === 0
      ? (explainBacks.length > 0 ? 0.6 : 0.5)
      : clamp01(explainBacks.length / Math.max(1, correct.length));

  return { persistence, patternSeeking, precision, selfCorrection, explanation };
}

function computeHabits(all: LearnerEvent[]): Habits {
  const sorted = [...all].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid);
  const newer = sorted.slice(mid);

  const overall = computeHabitScores(sorted);
  const olderScores = older.length >= 4 ? computeHabitScores(older) : overall;
  const newerScores = newer.length >= 4 ? computeHabitScores(newer) : overall;

  const keys: HabitKey[] = ['persistence', 'patternSeeking', 'precision', 'selfCorrection', 'explanation'];
  const habits = {} as Habits;
  for (const k of keys) {
    habits[k] = {
      score: Math.round(overall[k] * 100) / 100,
      trend: trendOf(olderScores[k], newerScores[k]),
    };
  }
  return habits;
}

/** Channel weights from the representation present at each breakthrough. */
export function computeChannelWeights(events: LearnerEvent[], prior: Partial<ChannelWeights>): ChannelWeights {
  const counts: ChannelWeights = { manipulative: 0, visual: 0, symbolic: 0, story: 0 };
  let total = 0;
  for (const e of events) {
    if (e.kind !== 'BREAKTHROUGH') continue;
    const rep = e.representation as Representation | null;
    if (rep && rep in counts) {
      counts[rep]++;
      total++;
    }
  }
  // Default to uniform if no representation signal yet.
  const sessionWeights: ChannelWeights =
    total === 0
      ? { manipulative: 0.25, visual: 0.25, symbolic: 0.25, story: 0.25 }
      : (Object.fromEntries(
          REPRESENTATIONS.map((r) => [r, counts[r] / total]),
        ) as ChannelWeights);

  // EMA blend with the prior so the channel model is stable across sessions.
  const blended = {} as ChannelWeights;
  for (const r of REPRESENTATIONS) {
    const priorW = prior[r] ?? 0.25;
    blended[r] = Math.round((priorW * (1 - EMA_ALPHA) + sessionWeights[r] * EMA_ALPHA) * 1000) / 1000;
  }
  return blended;
}

/** Struggle tolerance & frustration proneness from latency / hints / abandonment. */
export function computeStruggleAffect(events: LearnerEvent[]): {
  struggleTolerance: number;
  frustrationProneness: number;
} {
  const attempts = events.filter((e) => e.kind === 'ATTEMPT');
  const breakthroughs = events.filter((e) => e.kind === 'BREAKTHROUGH');
  const hintEscalations = events.filter((e) => e.kind === 'HINT_ESCALATED');
  const abandons = events.filter((e) => e.kind === 'ABANDON');
  const sessions = new Set(events.map((e) => e.sessionId ?? '')).size || 1;

  // Tolerance: how much productive struggle precedes this kid's breakthroughs.
  // Higher avg hint level at breakthrough + longer latency => they push through.
  const avgBreakthroughHint =
    breakthroughs.length === 0
      ? 1
      : breakthroughs.reduce((s, b) => s + (b.hintLevel ?? 0), 0) / breakthroughs.length;
  const latencies = attempts.map((a) => a.latencyMs ?? 0).filter((n) => n > 0);
  const avgLatency = latencies.length ? latencies.reduce((s, n) => s + n, 0) / latencies.length : 0;
  const latencyComponent = clamp01(avgLatency / 60_000); // 60s of think time => fully tolerant
  const struggleTolerance = clamp01(0.5 * (avgBreakthroughHint / 5) + 0.5 * latencyComponent);

  // Frustration: abandonment + rapid hint escalation per session.
  const abandonRate = clamp01(abandons.length / sessions);
  const escalationRate = clamp01(hintEscalations.length / Math.max(1, attempts.length));
  const frustrationProneness = clamp01(0.6 * abandonRate + 0.4 * escalationRate);

  return {
    struggleTolerance: Math.round(struggleTolerance * 1000) / 1000,
    frustrationProneness: Math.round(frustrationProneness * 1000) / 1000,
  };
}

export function bestChannelOf(weights: ChannelWeights): Representation | null {
  let best: Representation | null = null;
  let max = -1;
  for (const r of REPRESENTATIONS) {
    if (weights[r] > max) {
      max = weights[r];
      best = r;
    }
  }
  // Only call it a "best channel" if it's meaningfully above uniform.
  return max > 0.3 ? best : null;
}

/**
 * Rolls up the learner traits for a user from their LearnerEvent history and
 * persists them. Returns a view of the updated model. Safe to call at session
 * end; never throws to the caller (returns the prior/empty view on failure).
 */
export async function rollupLearnerModel(userId: string): Promise<LearnerTraitsView | null> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await prisma.learnerEvent.findMany({
      where: { userId, ts: { gte: thirtyDaysAgo } },
      orderBy: { ts: 'asc' },
      take: 1000,
    });

    const existing = await prisma.learnerTraits.findUnique({ where: { userId } });
    const priorChannel = (existing?.channelWeights as Partial<ChannelWeights> | null) ?? {};

    const habits = computeHabits(events);
    const channelWeights = computeChannelWeights(events, priorChannel);
    const { struggleTolerance, frustrationProneness } = computeStruggleAffect(events);

    const saved = await prisma.learnerTraits.upsert({
      where: { userId },
      update: {
        habits: habits as any,
        channelWeights: channelWeights as any,
        struggleTolerance,
        frustrationProneness,
        lastRollupAt: new Date(),
      },
      create: {
        userId,
        habits: habits as any,
        channelWeights: channelWeights as any,
        struggleTolerance,
        frustrationProneness,
        lastRollupAt: new Date(),
      },
    });

    return {
      habits,
      channelWeights,
      struggleTolerance,
      frustrationProneness,
      optimalSessionMinutes: saved.optimalSessionMinutes ?? null,
      bestChannel: bestChannelOf(channelWeights),
      lastRollupAt: saved.lastRollupAt,
    };
  } catch {
    return null;
  }
}

/** Read the persisted learner traits as a view (for director / parent / buddy). */
export async function getLearnerTraits(userId: string): Promise<LearnerTraitsView | null> {
  const row = await prisma.learnerTraits.findUnique({ where: { userId } });
  if (!row) return null;
  const channelWeights = (row.channelWeights as ChannelWeights) ?? {
    manipulative: 0.25,
    visual: 0.25,
    symbolic: 0.25,
    story: 0.25,
  };
  return {
    habits: (row.habits as unknown as Habits) ?? ({} as Habits),
    channelWeights,
    struggleTolerance: row.struggleTolerance,
    frustrationProneness: row.frustrationProneness,
    optimalSessionMinutes: row.optimalSessionMinutes ?? null,
    bestChannel: bestChannelOf(channelWeights),
    lastRollupAt: row.lastRollupAt,
  };
}
