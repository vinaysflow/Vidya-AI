/**
 * Dialogue-eval hard-fail rules for the Socratic contract.
 *
 * These are pure functions over assistant turns / transcripts so they can be
 * unit-tested and run in CI as a quality gate. A violation = CI-failing.
 *
 * Rules:
 *  - oneQuestionPerTurn: each assistant turn asks exactly one question.
 *  - noEssayProse: the tutor never writes essay prose for the student
 *    (seeded from the ESSAY_CLICHES dictionary + a declarative-sentence cap).
 *  - personaHold: the tutor never breaks character ("as an AI", etc.).
 *  - candidatesByTurn: >= N story candidates surfaced by a given turn.
 */
import { ESSAY_CLICHES } from '../services/nlp/cliches';

export interface Violation {
  rule: string;
  turnIndex?: number;
  detail: string;
}

export interface EvalTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Running count of distinct story candidates surfaced after this turn. */
  candidatesSoFar?: number;
}

export interface GoldenTranscript {
  name: string;
  persona: string;
  /** By this turn index, at least `minCandidates` must have been surfaced. */
  candidatesExpectedByTurn: number;
  minCandidates: number;
  turns: EvalTurn[];
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Exactly one question per assistant turn. */
export function oneQuestionPerTurn(content: string): Violation | null {
  const questionMarks = (content.match(/\?/g) ?? []).length;
  if (questionMarks === 0) {
    return { rule: 'oneQuestionPerTurn', detail: 'assistant turn asked no question' };
  }
  if (questionMarks > 1) {
    return { rule: 'oneQuestionPerTurn', detail: `assistant turn asked ${questionMarks} questions` };
  }
  return null;
}

/**
 * The tutor must not write essay prose. Heuristic: at most one short
 * declarative (a brief acknowledgment) is allowed before the question, and the
 * turn must not contain admissions-essay clichés (a sign it is generating prose).
 */
export function noEssayProse(content: string, maxDeclaratives = 1): Violation | null {
  const declaratives = sentences(content).filter((s) => !s.endsWith('?'));
  if (declaratives.length > maxDeclaratives) {
    return {
      rule: 'noEssayProse',
      detail: `found ${declaratives.length} declarative sentences (max ${maxDeclaratives}) — looks like prose`,
    };
  }
  const lower = content.toLowerCase();
  const cliche = ESSAY_CLICHES.find((c) => lower.includes(c));
  if (cliche) {
    return { rule: 'noEssayProse', detail: `contains essay cliché: "${cliche}"` };
  }
  return null;
}

const PERSONA_BREAKS = [
  'as an ai',
  'as a large language model',
  'i am an ai',
  "i'm an ai",
  'language model',
  'i cannot help with that',
];

/** The tutor holds persona and never reveals itself as a generic model. */
export function personaHold(content: string): Violation | null {
  const lower = content.toLowerCase();
  const broke = PERSONA_BREAKS.find((p) => lower.includes(p));
  return broke ? { rule: 'personaHold', detail: `persona break: "${broke}"` } : null;
}

/** By `byTurn`, at least `min` candidates must have been surfaced. */
export function candidatesByTurn(t: GoldenTranscript): Violation | null {
  const upTo = t.turns.slice(0, t.candidatesExpectedByTurn + 1);
  const max = upTo.reduce((m, turn) => Math.max(m, turn.candidatesSoFar ?? 0), 0);
  if (max < t.minCandidates) {
    return {
      rule: 'candidatesByTurn',
      turnIndex: t.candidatesExpectedByTurn,
      detail: `only ${max} candidates by turn ${t.candidatesExpectedByTurn} (need ${t.minCandidates})`,
    };
  }
  return null;
}
