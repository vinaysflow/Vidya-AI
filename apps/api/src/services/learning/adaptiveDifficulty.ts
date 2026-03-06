import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface QuestPerformance {
  conceptKey: string;
  messageCount: number;
  resolved: boolean;
  hintLevel: number;
  completedAt: string; // ISO date string
}

export interface AdaptiveState {
  effectiveGrade: number;
  recentPerformance: QuestPerformance[]; // last 8 sessions
  streakAtCurrentGrade: number;
}

const MAX_WINDOW = 8;
const MAX_GRADE_BOOST = 4;

/**
 * Computes the effective grade based on recent performance.
 * Rules:
 * - Fast-track up: last 2 resolved with <=4 messages and hintLevel 0 → +1 grade
 * - Standard up: last 3 resolved with <=6 messages and hintLevel 0 → +1 grade
 * - Down: last 3 all had hintLevel >= 3 → -1 grade
 * - Floor: never below baseGrade
 * - Ceiling: never above baseGrade + 4
 */
export function computeEffectiveGrade(
  baseGrade: number,
  state: AdaptiveState | null
): { effectiveGrade: number; leveledUp: boolean; leveledDown: boolean } {
  if (!state || state.recentPerformance.length === 0) {
    return { effectiveGrade: baseGrade, leveledUp: false, leveledDown: false };
  }

  const prev = state.effectiveGrade;
  const recent = state.recentPerformance;
  const last3 = recent.slice(-3);
  const last2 = recent.slice(-2);

  // Fast-track up: last 2 solved super fast with no hints
  const fastTrack =
    last2.length === 2 &&
    last2.every((q) => q.resolved && q.messageCount <= 4 && q.hintLevel === 0);

  // Standard up: last 3 solved quickly with no hints
  const standardUp =
    last3.length === 3 &&
    last3.every((q) => q.resolved && q.messageCount <= 6 && q.hintLevel === 0);

  // Down: consistent struggling
  const struggling =
    last3.length === 3 && last3.every((q) => q.hintLevel >= 3);

  let grade = prev;
  if (fastTrack || standardUp) {
    grade = Math.min(prev + 1, baseGrade + MAX_GRADE_BOOST);
  } else if (struggling) {
    grade = Math.max(prev - 1, baseGrade);
  }

  return {
    effectiveGrade: grade,
    leveledUp: grade > prev,
    leveledDown: grade < prev,
  };
}

export function buildPerformanceEntry(session: {
  conceptKey: string | null;
  messageCount: number;
  resolved: boolean;
  hintLevel: number;
}): QuestPerformance {
  return {
    conceptKey: session.conceptKey || 'unknown',
    messageCount: session.messageCount,
    resolved: session.resolved,
    hintLevel: session.hintLevel,
    completedAt: new Date().toISOString(),
  };
}

export function updateAdaptiveState(
  current: AdaptiveState | null,
  baseGrade: number,
  newEntry: QuestPerformance
): { state: AdaptiveState; leveledUp: boolean; leveledDown: boolean } {
  const recentPerformance = [
    ...(current?.recentPerformance ?? []),
    newEntry,
  ].slice(-MAX_WINDOW);

  const tempState: AdaptiveState = {
    effectiveGrade: current?.effectiveGrade ?? baseGrade,
    recentPerformance,
    streakAtCurrentGrade: current?.streakAtCurrentGrade ?? 0,
  };

  const { effectiveGrade, leveledUp, leveledDown } = computeEffectiveGrade(
    baseGrade,
    tempState
  );

  return {
    state: {
      effectiveGrade,
      recentPerformance,
      streakAtCurrentGrade: leveledUp
        ? 0
        : (tempState.streakAtCurrentGrade ?? 0) + 1,
    },
    leveledUp,
    leveledDown,
  };
}

export async function getAdaptiveState(
  userId: string
): Promise<AdaptiveState | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adaptiveState: true },
  });
  return (user?.adaptiveState as AdaptiveState | null) ?? null;
}

export async function persistAdaptiveState(
  userId: string,
  state: AdaptiveState
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { adaptiveState: JSON.parse(JSON.stringify(state)) },
  });
}
