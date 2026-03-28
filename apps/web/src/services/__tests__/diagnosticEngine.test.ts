/**
 * Tests for diagnosticEngine.ts pure functions.
 * All functions are deterministic (except buildChoices which is shuffled).
 */

import {
  computeSuggestedGrade,
  evaluateAnswer,
  buildChoices,
  shouldComplete,
} from '../diagnosticEngine';

describe('computeSuggestedGrade', () => {
  it('returns max(3, baseGrade - 1) when 0 correct', () => {
    const results = [
      { gradeLevel: 4, correct: false },
      { gradeLevel: 4, correct: false },
    ];
    expect(computeSuggestedGrade(results, 5)).toBe(4);
    expect(computeSuggestedGrade(results, 3)).toBe(3); // max(3, 2) = 3
  });

  it('returns baseGrade when 1 correct', () => {
    const results = [
      { gradeLevel: 5, correct: true },
      { gradeLevel: 4, correct: false },
      { gradeLevel: 4, correct: false },
    ];
    expect(computeSuggestedGrade(results, 4)).toBe(4);
  });

  it('returns baseGrade when 2 correct', () => {
    const results = [
      { gradeLevel: 5, correct: true },
      { gradeLevel: 6, correct: true },
      { gradeLevel: 4, correct: false },
    ];
    expect(computeSuggestedGrade(results, 4)).toBe(4);
  });

  it('returns weighted average of correct answers when 3+ correct', () => {
    const results = [
      { gradeLevel: 4, correct: true },
      { gradeLevel: 5, correct: true },
      { gradeLevel: 6, correct: true },
    ];
    // avg = (4+5+6)/3 = 5
    expect(computeSuggestedGrade(results, 4)).toBe(5);
  });

  it('clamps result to minimum of 3', () => {
    const results = [
      { gradeLevel: 3, correct: true },
      { gradeLevel: 3, correct: true },
      { gradeLevel: 3, correct: true },
    ];
    expect(computeSuggestedGrade(results, 3)).toBe(3);
  });

  it('clamps result to maximum of 9', () => {
    const results = [
      { gradeLevel: 9, correct: true },
      { gradeLevel: 9, correct: true },
      { gradeLevel: 9, correct: true },
    ];
    expect(computeSuggestedGrade(results, 8)).toBe(9);
  });

  it('handles all 5 correct at grade 4 returning weighted average', () => {
    const results = [
      { gradeLevel: 4, correct: true },
      { gradeLevel: 5, correct: true },
      { gradeLevel: 5, correct: true },
      { gradeLevel: 4, correct: true },
      { gradeLevel: 6, correct: true },
    ];
    // avg = (4+5+5+4+6)/5 = 24/5 = 4.8 -> rounded = 5
    expect(computeSuggestedGrade(results, 4)).toBe(5);
  });
});

describe('evaluateAnswer', () => {
  it('returns correct: true when picked matches answerFormula', () => {
    const result = evaluateAnswer('42', '42', 'multiplication_basic', 4);
    expect(result).toEqual({
      conceptKey: 'multiplication_basic',
      gradeLevel: 4,
      correct: true,
    });
  });

  it('returns correct: false when picked does not match', () => {
    const result = evaluateAnswer('40', '42', 'multiplication_basic', 4);
    expect(result).toEqual({
      conceptKey: 'multiplication_basic',
      gradeLevel: 4,
      correct: false,
    });
  });

  it('is case and whitespace sensitive (strict equality)', () => {
    expect(evaluateAnswer(' 42', '42', 'concept', 3).correct).toBe(false);
    expect(evaluateAnswer('42', '42', 'concept', 3).correct).toBe(true);
  });
});

describe('buildChoices', () => {
  const answer = '42';
  const distractors = ['40', '44'];

  it('returns array of length distractors + 1', () => {
    const choices = buildChoices(answer, distractors);
    expect(choices).toHaveLength(3);
  });

  it('contains the answer formula', () => {
    const choices = buildChoices(answer, distractors);
    expect(choices).toContain(answer);
  });

  it('contains all distractors', () => {
    const choices = buildChoices(answer, distractors);
    expect(choices).toContain('40');
    expect(choices).toContain('44');
  });

  it('contains no duplicates', () => {
    const choices = buildChoices(answer, distractors);
    const unique = new Set(choices);
    expect(unique.size).toBe(choices.length);
  });

  it('works with 0 distractors', () => {
    const choices = buildChoices('5', []);
    expect(choices).toHaveLength(1);
    expect(choices[0]).toBe('5');
  });
});

describe('shouldComplete', () => {
  it('returns true when currentIdx + 1 >= totalQuestions', () => {
    expect(shouldComplete(4, 5)).toBe(true); // idx 4, total 5 (0-indexed last)
    expect(shouldComplete(0, 1)).toBe(true); // single question
  });

  it('returns false when more questions remain', () => {
    expect(shouldComplete(3, 5)).toBe(false);
    expect(shouldComplete(0, 5)).toBe(false);
  });

  it('handles boundary correctly', () => {
    expect(shouldComplete(4, 5)).toBe(true);
    expect(shouldComplete(5, 5)).toBe(true); // edge: idx exceeds (shouldn't happen but safe)
  });
});
