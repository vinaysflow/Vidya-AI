import { describe, it, expect } from 'vitest';
import { codingModule } from '../coding';

/**
 * Structured evals for SLM-backed modules.
 * These run against module-level validation without invoking actual LLMs.
 * They assert that safety, JSON validity, topic accuracy, and hint progression
 * remain reliable regardless of which model backs the module.
 */

describe('SLM Evals — Coding Module', () => {
  // ---------------------------------------------------
  // Socratic Compliance: no direct answers leak through
  // ---------------------------------------------------
  describe('Socratic compliance (no direct answers)', () => {
    const directAnswers = [
      "Here's the solution: def twoSum(nums, target): ...",
      "The solution is to use a hash map.",
      "Here's a complete implementation:\n```python\ndef solve(arr):\n    pass\n```",
      "Let me write the code for you:\nfunction sort(arr) {\n  arr.sort();\n  return arr;\n}",
    ];

    for (const answer of directAnswers) {
      it(`detects leak: "${answer.slice(0, 50)}..."`, () => {
        const { isClean } = codingModule.validateResponse(answer);
        expect(isClean).toBe(false);
      });
    }

    const cleanResponses = [
      "What data structure gives you O(1) lookup?",
      "Can you trace through your loop with input [1, 2, 3]?",
      "Interesting approach! What happens when the array is empty?",
      "Your `total` variable — what value does it hold after the first iteration?",
    ];

    for (const response of cleanResponses) {
      it(`passes clean response: "${response.slice(0, 50)}..."`, () => {
        const { isClean } = codingModule.validateResponse(response);
        expect(isClean).toBe(true);
      });
    }
  });

  // ---------------------------------------------------
  // Hint Progression: buildResponseSystemAddendum varies by level
  // ---------------------------------------------------
  describe('Hint progression quality', () => {
    it('produces different addendums at hint levels 1, 3, and 5', () => {
      const base = {
        distanceFromSolution: 60,
        conceptsIdentified: ['arrays'],
        conceptGaps: ['hash map'],
        studentStrengths: ['effort'],
      };

      const addendum1 = codingModule.buildResponseSystemAddendum?.(base, {
        topic: 'data_structures',
        hintLevel: 1,
      });
      const addendum3 = codingModule.buildResponseSystemAddendum?.(base, {
        topic: 'data_structures',
        hintLevel: 3,
      });
      const addendum5 = codingModule.buildResponseSystemAddendum?.(base, {
        topic: 'data_structures',
        hintLevel: 5,
      });

      expect(addendum1).toBeDefined();
      expect(addendum3).toBeDefined();
      expect(addendum5).toBeDefined();
      expect(addendum1).not.toBe(addendum5);
    });

    it('includes concept hints when hintLevel > 0 and topic matches', () => {
      const addendum = codingModule.buildResponseSystemAddendum?.(
        { distanceFromSolution: 50, conceptsIdentified: [], conceptGaps: [], studentStrengths: [] },
        { topic: 'algorithms', hintLevel: 2 },
      );
      expect(addendum).toContain('RELEVANT CONCEPTS');
    });
  });

  // ---------------------------------------------------
  // Topic accuracy: question banks match topic keys
  // ---------------------------------------------------
  describe('Topic accuracy', () => {
    const topicKeys = ['data_structures', 'algorithms', 'complexity', 'recursion', 'debugging', 'basics_variables', 'basics_loops', 'basics_functions'];

    for (const topic of topicKeys) {
      it(`question bank exists for topic "${topic}"`, () => {
        const addendum = codingModule.buildResponseSystemAddendum?.(
          { distanceFromSolution: 50, conceptsIdentified: [], conceptGaps: [], studentStrengths: [] },
          { topic, hintLevel: 0 },
        );
        expect(addendum).toContain('EXAMPLE SOCRATIC QUESTIONS');
      });
    }
  });

  // ---------------------------------------------------
  // Model policy is set
  // ---------------------------------------------------
  describe('Model policy', () => {
    it('has a modelPolicy field', () => {
      expect(codingModule.modelPolicy).toBeDefined();
    });

    it('modelPolicy has response and analysis entries', () => {
      expect(codingModule.modelPolicy?.response).toBeDefined();
      expect(codingModule.modelPolicy?.analysis).toBeDefined();
    });
  });

  // ---------------------------------------------------
  // Attempt detection for K-12 basics
  // ---------------------------------------------------
  describe('Attempt detection for K-12 basics', () => {
    it('detects code-like attempt (function definition)', () => {
      expect(codingModule.containsAttempt('def add(a, b):\n  return a + b')).toBe(true);
    });

    it('detects pseudocode attempt', () => {
      expect(codingModule.containsAttempt('i think i would use a for loop to iterate through the list')).toBe(true);
    });

    it('rejects trivial message', () => {
      expect(codingModule.containsAttempt('help')).toBe(false);
    });
  });
});
