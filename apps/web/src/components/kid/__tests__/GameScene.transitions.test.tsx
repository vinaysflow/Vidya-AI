/**
 * GameScene transition warning tests.
 *
 * Tests the getTransitionMessage pure function and TransitionCard rendering logic.
 * Using a unit test for the pure function rather than full GameScene mount
 * (avoids import.meta.env issues while providing full coverage of the logic).
 */

import { getTransitionMessage } from '../getTransitionMessage';

describe('getTransitionMessage pure function', () => {
  it('returns explain-back message for celebrate_then_explain_back', () => {
    const msg = getTransitionMessage('celebrate_then_explain_back', null);
    expect(msg).toContain('explain');
  });

  it('returns acknowledgment string for celebration (was: "quest complete") — changed per P5/plan-1E', () => {
    const msg = getTransitionMessage('celebration', null);
    // Changed from '🏆 Quest complete! Great job!' to neutral acknowledgment per P5
    expect(msg).toBe('✨ Nice thinking — onto the next one');
  });

  it('returns next question message for hint_with_question with quest context', () => {
    const msg = getTransitionMessage('hint_with_question', {
      id: 'q1',
      title: 'Fractions',
      chapter: '1',
      conceptKey: 'fractions_basic',
      subject: 'MATHEMATICS',
      tags: [],
      problemText: 'Solve fractions',
    } as any);
    expect(msg?.toLowerCase()).toContain('question');
  });

  it('returns message for foundational question type', () => {
    const msg = getTransitionMessage('foundational', null);
    expect(msg?.toLowerCase()).toContain('question');
  });

  it('returns null for question types that do not trigger a transition', () => {
    // Regular attempt_prompt and hint types should not trigger transition card
    expect(getTransitionMessage('attempt_prompt', null)).toBeNull();
    expect(getTransitionMessage('hint', null)).toBeNull();
  });

  it('returns null for null/undefined questionType', () => {
    expect(getTransitionMessage(null, null)).toBeNull();
    expect(getTransitionMessage(undefined, null)).toBeNull();
  });
});
