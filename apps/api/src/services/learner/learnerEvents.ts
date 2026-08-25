/**
 * learnerEvents.ts
 *
 * Telemetry spine for the learner model. Writes append-only, queryable
 * LearnerEvent rows capturing the structured per-turn signals the Socratic
 * engine computes (distanceFromSolution, errorType, errorDescription, hint
 * escalation, explain-back, breakthroughs) which were previously buried in
 * Message.metadata and the fire-and-forget AnalyticsEvent.
 *
 * Every write is fire-and-forget: failures are swallowed so instrumentation
 * never blocks or breaks a tutoring request.
 */

import { LearnerEventKind, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type { LearnerEventKind };

/** Representation modalities we credit for the learning-channel model. */
export type Representation = 'manipulative' | 'visual' | 'symbolic' | 'story';

export interface LearnerEventInput {
  userId: string;
  sessionId?: string | null;
  conceptKey?: string | null;
  templateId?: string | null;
  kind: LearnerEventKind;
  correct?: boolean | null;
  distanceFromSolution?: number | null;
  errorType?: string | null;
  errorDescription?: string | null;
  misconceptionId?: string | null;
  hintLevel?: number | null;
  latencyMs?: number | null;
  representation?: Representation | string | null;
  payload?: Prisma.InputJsonValue;
}

/** Low-level fire-and-forget writer for a single LearnerEvent. */
export async function logLearnerEvent(input: LearnerEventInput): Promise<void> {
  await prisma.learnerEvent
    .create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        conceptKey: input.conceptKey ?? null,
        templateId: input.templateId ?? null,
        kind: input.kind,
        correct: input.correct ?? null,
        distanceFromSolution: input.distanceFromSolution ?? null,
        errorType: input.errorType ?? null,
        errorDescription: input.errorDescription ?? null,
        misconceptionId: input.misconceptionId ?? null,
        hintLevel: input.hintLevel ?? null,
        latencyMs: input.latencyMs ?? null,
        representation: (input.representation as string | null) ?? null,
        payload: input.payload,
      },
    })
    .catch(() => {}); // intentionally swallowed
}

/**
 * Minimal shape of the engine's per-turn metadata that this module reads.
 * Kept loose so we never couple the telemetry write path to engine internals.
 */
export interface TurnMetadataLike {
  questionType?: string;
  hintLevel?: number;
  distanceFromSolution?: number;
  conceptsIdentified?: string[];
  analysisResult?: {
    errorType?: string | null;
    errorDescription?: string | null;
    conceptGaps?: string[];
    studentStrengths?: string[];
    distanceFromSolution?: number;
  } | null;
}

export interface RecordTurnInput {
  userId: string;
  sessionId: string;
  conceptKey?: string | null;
  templateId?: string | null;
  metadata: TurnMetadataLike;
  prevHintLevel: number;
  newHintLevel: number;
  latencyMs?: number | null;
  representation?: Representation | string | null;
  /** Set when the student picked a choice card; index of the chosen distractor. */
  pickedDistractorIndex?: number | null;
  /** A misconception inferred for this turn (Phase 1 wires this in). */
  misconceptionId?: string | null;
}

/** A turn ended in a "got it" state. */
export function isCorrectTurn(questionType?: string): boolean {
  return questionType === 'celebration' || questionType === 'celebrate_then_explain_back';
}

/**
 * Derives and writes the LearnerEvents implied by a single tutor turn:
 *   - ATTEMPT          (always; the primary signal row)
 *   - CHOICE_SELECTED  (when a distractor index is provided)
 *   - HINT_ESCALATED   (when hint level rose this turn)
 *   - EXPLAIN_BACK     (when the engine asked the kid to teach back)
 *   - BREAKTHROUGH     (when the turn resolved correctly — credits representation)
 *
 * All writes are independent and fire-and-forget.
 */
export async function recordTurnEvents(input: RecordTurnInput): Promise<void> {
  const { metadata } = input;
  const correct = isCorrectTurn(metadata.questionType);
  const analysis = metadata.analysisResult ?? null;
  const distance = metadata.distanceFromSolution ?? analysis?.distanceFromSolution ?? null;
  const conceptKey = input.conceptKey ?? null;

  const base = {
    userId: input.userId,
    sessionId: input.sessionId,
    conceptKey,
    templateId: input.templateId ?? null,
    misconceptionId: input.misconceptionId ?? null,
    hintLevel: input.newHintLevel,
    latencyMs: input.latencyMs ?? null,
    representation: input.representation ?? null,
  } as const;

  const writes: Promise<void>[] = [];

  // Primary attempt row — the spine.
  writes.push(
    logLearnerEvent({
      ...base,
      kind: 'ATTEMPT',
      correct,
      distanceFromSolution: distance,
      errorType: analysis?.errorType ?? null,
      errorDescription: analysis?.errorDescription ?? null,
    }),
  );

  if (input.pickedDistractorIndex != null) {
    writes.push(
      logLearnerEvent({
        ...base,
        kind: 'CHOICE_SELECTED',
        correct,
        payload: { pickedDistractorIndex: input.pickedDistractorIndex },
      }),
    );
  }

  if (input.newHintLevel > input.prevHintLevel) {
    writes.push(
      logLearnerEvent({
        ...base,
        kind: 'HINT_ESCALATED',
        payload: { from: input.prevHintLevel, to: input.newHintLevel },
      }),
    );
  }

  if (metadata.questionType === 'celebrate_then_explain_back') {
    writes.push(logLearnerEvent({ ...base, kind: 'EXPLAIN_BACK', correct: true }));
  }

  // A breakthrough = resolved this turn. Credit the representation that was on
  // screen so the channel model can learn what precedes this kid's "aha".
  if (correct) {
    writes.push(
      logLearnerEvent({
        ...base,
        kind: 'BREAKTHROUGH',
        correct: true,
        distanceFromSolution: distance,
      }),
    );
  }

  await Promise.all(writes);
}
