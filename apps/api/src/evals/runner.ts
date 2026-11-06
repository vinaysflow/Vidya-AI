/**
 * Golden-transcript runner. Applies the per-turn and whole-transcript hard-fail
 * rules and returns every violation. Used by the eval test (CI gate) and can be
 * pointed at live-generated transcripts later.
 */
import {
  oneQuestionPerTurn,
  noEssayProse,
  personaHold,
  candidatesByTurn,
  type GoldenTranscript,
  type Violation,
} from './rules';

export function evaluateTranscript(t: GoldenTranscript): Violation[] {
  const violations: Violation[] = [];

  t.turns.forEach((turn, i) => {
    if (turn.role !== 'assistant') return;
    for (const check of [oneQuestionPerTurn, noEssayProse, personaHold]) {
      const v = check(turn.content);
      if (v) violations.push({ ...v, turnIndex: i });
    }
  });

  const candidateViolation = candidatesByTurn(t);
  if (candidateViolation) violations.push(candidateViolation);

  return violations;
}
