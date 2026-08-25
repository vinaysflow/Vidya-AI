/**
 * tutorDirector.ts
 *
 * Phase 4 of the learner model: the layer that sits ABOVE the per-turn
 * SocraticEngine. It reads the learner model (mastery + open misconceptions +
 * traits + due reviews) and emits a SessionPlan — an ordered set of phases, each
 * with a concept, an optional target misconception, a representation (from the
 * channel model + misconception remediation), and a mode.
 *
 * The five modes are textures, not labels:
 *   warm-up    = spaced retrieval (getDueReviews)
 *   learn      = guided instruction in the kid's best representation
 *   struggle   = Socratic at the kid's struggleTolerance hint pacing
 *   teach-back = explain-back (the protege effect)
 *   reflect    = spotlight the habit-of-mind that moved
 *
 * engine.processMessage still executes each turn; the director owns phase
 * transitions and content/representation selection.
 */

import type { Subject } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getDueReviews, getMasteryByConceptKey } from '../learning/masteryTracker';
import { getActiveMisconceptions, type ActiveMisconception } from './misconceptionTracker';
import { getLearnerTraits, type LearnerTraitsView } from './learnerTraits';

export type SessionMode = 'warm-up' | 'learn' | 'struggle' | 'teach-back' | 'reflect';
export type Representation = 'manipulative' | 'visual' | 'symbolic' | 'story';

export interface SessionPhase {
  id: string;
  mode: SessionMode;
  label: string;
  conceptKey: string | null;
  conceptName: string | null;
  misconceptionTarget: { id: string; description: string } | null;
  representation: Representation;
  /** How long to let the kid productively struggle before the first hint. */
  hintDelaySeconds: number;
  /** For the reflect phase: which habit to celebrate. */
  habitSpotlight: string | null;
  /** A short directive the engine/overlay can act on for this phase. */
  directive: string;
}

export interface SessionPlan {
  userId: string;
  subject: Subject;
  generatedAt: string;
  focusConceptKey: string | null;
  focusConceptName: string | null;
  rationale: string;
  phases: SessionPhase[];
}

const DEFAULT_REPRESENTATION: Representation = 'visual';

function hintDelayFromTolerance(struggleTolerance: number): number {
  // 0.0 tolerance -> ~10s, 1.0 -> ~60s
  return Math.round(10 + struggleTolerance * 50);
}

async function conceptNames(conceptKeys: string[]): Promise<Map<string, string>> {
  const keys = conceptKeys.filter(Boolean);
  if (keys.length === 0) return new Map();
  const rows = await prisma.concept.findMany({
    where: { conceptKey: { in: keys } },
    select: { conceptKey: true, name: true },
  });
  return new Map(rows.filter((r) => r.conceptKey).map((r) => [r.conceptKey!, r.name]));
}

/** Pick the representation for a phase: misconception remediation overrides the channel model. */
function representationForPhase(
  misconception: ActiveMisconception | null,
  traits: LearnerTraitsView | null,
): Representation {
  const remediationRep = misconception?.remediation?.representation as Representation | undefined;
  if (remediationRep) return remediationRep;
  if (traits?.bestChannel) return traits.bestChannel;
  return DEFAULT_REPRESENTATION;
}

/** Of the five habits, find the one to spotlight (an upward trend, else the strongest). */
function pickHabitSpotlight(traits: LearnerTraitsView | null): string | null {
  if (!traits?.habits) return null;
  const entries = Object.entries(traits.habits);
  if (entries.length === 0) return null;
  const rising = entries.filter(([, h]) => h.trend === 'up');
  const pool = rising.length > 0 ? rising : entries;
  pool.sort((a, b) => b[1].score - a[1].score);
  return pool[0]?.[0] ?? null;
}

/**
 * Builds a SessionPlan for the given user + subject from the current learner model.
 * Pure read; does not mutate state. Falls back to a sensible default arc for new users.
 */
export async function buildSessionPlan(
  userId: string,
  subject: Subject,
  options: { conceptKey?: string | null } = {},
): Promise<SessionPlan> {
  const [traits, due, openMisconceptions, masteryRows] = await Promise.all([
    getLearnerTraits(userId).catch(() => null),
    getDueReviews(userId).catch(() => []),
    getActiveMisconceptions(userId).catch(() => []),
    getMasteryByConceptKey(userId, subject).catch(() => []),
  ]);

  const struggleTolerance = traits?.struggleTolerance ?? 0.5;
  const hintDelaySeconds = hintDelayFromTolerance(struggleTolerance);

  // Focus concept: explicit override > a concept tied to an open misconception >
  // the lowest-mastery attempted concept.
  let focusConceptKey: string | null = options.conceptKey ?? null;
  if (!focusConceptKey && openMisconceptions.length > 0) {
    focusConceptKey = openMisconceptions[0].conceptKey;
  }
  if (!focusConceptKey && masteryRows.length > 0) {
    focusConceptKey = [...masteryRows].sort((a, b) => a.mastery - b.mastery)[0].conceptKey;
  }

  const targetMisconception =
    openMisconceptions.find((m) => m.conceptKey === focusConceptKey) ?? openMisconceptions[0] ?? null;

  const warmUpConceptKey = due[0]?.conceptKey ?? null;
  const nameMap = await conceptNames(
    [focusConceptKey, warmUpConceptKey].filter((k): k is string => !!k),
  );
  const focusConceptName = focusConceptKey ? nameMap.get(focusConceptKey) ?? null : null;

  const learnRep = representationForPhase(null, traits);
  const struggleRep = representationForPhase(targetMisconception, traits);

  const phases: SessionPhase[] = [];

  // 1) Warm-up — spaced retrieval if anything is due.
  if (warmUpConceptKey) {
    phases.push({
      id: 'warm-up',
      mode: 'warm-up',
      label: 'Quick warm-up',
      conceptKey: warmUpConceptKey,
      conceptName: due[0]?.name ?? null,
      misconceptionTarget: null,
      representation: representationForPhase(null, traits),
      hintDelaySeconds,
      habitSpotlight: null,
      directive: 'Spaced retrieval: a couple of fast questions on a concept due for review. Keep it light and confidence-building.',
    });
  }

  // 2) Learn — guided instruction in the kid's best representation.
  phases.push({
    id: 'learn',
    mode: 'learn',
    label: 'Learn it',
    conceptKey: focusConceptKey,
    conceptName: focusConceptName,
    misconceptionTarget: null,
    representation: learnRep,
    hintDelaySeconds,
    habitSpotlight: null,
    directive: `Guided instruction on ${focusConceptName ?? 'the focus concept'} using a ${learnRep} representation first.`,
  });

  // 3) Struggle — Socratic at this kid's pacing, aimed at the open misconception.
  phases.push({
    id: 'struggle',
    mode: 'struggle',
    label: 'Stretch it',
    conceptKey: focusConceptKey,
    conceptName: focusConceptName,
    misconceptionTarget: targetMisconception
      ? { id: targetMisconception.misconceptionId, description: targetMisconception.description }
      : null,
    representation: struggleRep,
    hintDelaySeconds,
    habitSpotlight: null,
    directive: targetMisconception
      ? `Socratic questioning targeting the misconception: ${targetMisconception.description}. Wait ~${hintDelaySeconds}s before the first hint.`
      : `Socratic questioning to deepen ${focusConceptName ?? 'the concept'}. Wait ~${hintDelaySeconds}s before the first hint.`,
  });

  // 4) Teach-back — the protege effect.
  phases.push({
    id: 'teach-back',
    mode: 'teach-back',
    label: 'Teach the buddy',
    conceptKey: focusConceptKey,
    conceptName: focusConceptName,
    misconceptionTarget: null,
    representation: learnRep,
    hintDelaySeconds,
    habitSpotlight: null,
    directive: `Ask the student to explain ${focusConceptName ?? 'what they learned'} back to the buddy in their own words.`,
  });

  // 5) Reflect — spotlight the habit of mind that moved.
  const habit = pickHabitSpotlight(traits);
  phases.push({
    id: 'reflect',
    mode: 'reflect',
    label: 'Reflect',
    conceptKey: null,
    conceptName: null,
    misconceptionTarget: null,
    representation: learnRep,
    hintDelaySeconds,
    habitSpotlight: habit,
    directive: habit
      ? `Close by naming the habit of mind that showed up today: ${habit}.`
      : 'Close by naming one thing the student did well as a thinker today.',
  });

  const rationale = buildRationale({ focusConceptName, targetMisconception, traits, due });

  return {
    userId,
    subject,
    generatedAt: new Date().toISOString(),
    focusConceptKey,
    focusConceptName,
    rationale,
    phases,
  };
}

function buildRationale(args: {
  focusConceptName: string | null;
  targetMisconception: ActiveMisconception | null;
  traits: LearnerTraitsView | null;
  due: Array<{ name: string }>;
}): string {
  const parts: string[] = [];
  if (args.due.length > 0) parts.push(`${args.due.length} concept(s) due for review`);
  if (args.focusConceptName) parts.push(`focusing on ${args.focusConceptName}`);
  if (args.targetMisconception) parts.push(`clearing "${args.targetMisconception.description}"`);
  if (args.traits?.bestChannel) parts.push(`leaning on ${args.traits.bestChannel} representations`);
  return parts.length > 0
    ? `Today's plan: ${parts.join(', ')}.`
    : 'Starter plan: warm up, learn a concept, stretch with Socratic questions, then teach it back.';
}
