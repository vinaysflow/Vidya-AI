/**
 * diagnosticEngine.ts
 *
 * Pure functions for the diagnostic placement quiz logic.
 * Extracted from DiagnosticQuizScreen to be independently testable.
 *
 * None of these functions have side effects. All UI concerns remain in the component.
 */

/**
 * Computes the suggested grade level based on diagnostic results and the parent-selected base grade.
 *
 * Algorithm (mirrors original computeSuggestedGrade):
 *  - 0 correct  → max(3, baseGrade - 1)   (student struggling, step down)
 *  - 1–2 correct → baseGrade              (at grade level)
 *  - 3+ correct  → weighted avg of correct answers' gradeLevel, clamped to [3, 9]
 */
export function computeSuggestedGrade(
  results: Array<{ gradeLevel: number; correct: boolean }>,
  baseGrade: number,
): number {
  const correct = results.filter((r) => r.correct);
  if (correct.length === 0) return Math.max(3, baseGrade - 1);
  if (correct.length <= 2) return baseGrade;
  const avgCorrectGrade = correct.reduce((s, r) => s + r.gradeLevel, 0) / correct.length;
  return Math.round(Math.min(9, Math.max(3, avgCorrectGrade)));
}

/**
 * Evaluates whether a picked answer is correct and returns a structured result.
 * Uses strict string equality — the answerFormula from the DB is the source of truth.
 */
export function evaluateAnswer(
  picked: string,
  answerFormula: string,
  conceptKey: string,
  gradeLevel: number,
): { conceptKey: string; gradeLevel: number; correct: boolean } {
  return {
    conceptKey,
    gradeLevel,
    correct: picked === answerFormula,
  };
}

/**
 * Builds and shuffles the choice array for a question.
 * Returns answerFormula + all distractors in a random order.
 *
 * Testing note: tests should verify set equality and length, not exact order.
 */
export function buildChoices(answerFormula: string, distractors: string[]): string[] {
  return [answerFormula, ...distractors].sort(() => Math.random() - 0.5);
}

/**
 * Returns true when the current question index is the last one (quiz is complete).
 */
export function shouldComplete(currentIdx: number, totalQuestions: number): boolean {
  return currentIdx + 1 >= totalQuestions;
}
