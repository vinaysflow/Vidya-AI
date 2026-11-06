/**
 * Dialogue-eval harness gate. The happy-path golden transcript must produce
 * ZERO violations; the adversarial transcript must be caught by every rule.
 * This runs in Vidya CI via `pnpm --filter @vidya/api test`.
 */
import { describe, it, expect } from 'vitest';
import { evaluateTranscript } from '../runner';
import {
  oneQuestionPerTurn,
  noEssayProse,
  personaHold,
  type GoldenTranscript,
} from '../rules';

const HAPPY: GoldenTranscript = {
  name: 'counseling-happy-path',
  persona: 'counselor',
  candidatesExpectedByTurn: 7,
  minCandidates: 3,
  turns: [
    { role: 'user', content: 'I want help finding my college essay story.' },
    { role: 'assistant', content: 'What moment this year made you lose track of time?', candidatesSoFar: 0 },
    { role: 'user', content: 'Rebuilding the school garden after it flooded.' },
    { role: 'assistant', content: 'What were you actually trying to change there?', candidatesSoFar: 1 },
    { role: 'user', content: 'I wanted younger kids to have somewhere calm.' },
    { role: 'assistant', content: 'Who noticed the difference, and what did they say?', candidatesSoFar: 2 },
    { role: 'user', content: 'A teacher said it became the heart of the school.' },
    { role: 'assistant', content: 'Which detail from that would you never forget?', candidatesSoFar: 3 },
  ],
};

const BAD: GoldenTranscript = {
  name: 'counseling-violations',
  persona: 'counselor',
  candidatesExpectedByTurn: 4,
  minCandidates: 3,
  turns: [
    { role: 'user', content: 'Help with my essay.' },
    // prose + cliché, no question
    { role: 'assistant', content: 'Growing up, I learned so much. It changed my perspective forever.', candidatesSoFar: 0 },
    { role: 'user', content: 'ok' },
    // two questions
    { role: 'assistant', content: 'What happened? And how did you feel about it?', candidatesSoFar: 1 },
    { role: 'user', content: 'fine' },
    // persona break
    { role: 'assistant', content: 'As an AI, what would you like to explore next?', candidatesSoFar: 1 },
  ],
};

describe('dialogue-eval rules (unit)', () => {
  it('oneQuestionPerTurn flags zero or many questions', () => {
    expect(oneQuestionPerTurn('What happened?')).toBeNull();
    expect(oneQuestionPerTurn('No question here.')?.rule).toBe('oneQuestionPerTurn');
    expect(oneQuestionPerTurn('Why? And when?')?.rule).toBe('oneQuestionPerTurn');
  });

  it('noEssayProse flags clichés and multi-sentence prose', () => {
    expect(noEssayProse('What mattered most to you?')).toBeNull();
    expect(noEssayProse('Growing up changed me. I realized that I grew.')?.rule).toBe('noEssayProse');
  });

  it('personaHold flags model self-reveal', () => {
    expect(personaHold('What did you notice?')).toBeNull();
    expect(personaHold('As an AI, I think...')?.rule).toBe('personaHold');
  });
});

describe('golden-transcript runner (CI gate)', () => {
  it('happy path has zero violations', () => {
    expect(evaluateTranscript(HAPPY)).toEqual([]);
  });

  it('adversarial transcript is caught by every rule', () => {
    const rules = new Set(evaluateTranscript(BAD).map((v) => v.rule));
    expect(rules).toContain('oneQuestionPerTurn');
    expect(rules).toContain('noEssayProse');
    expect(rules).toContain('personaHold');
    expect(rules).toContain('candidatesByTurn');
  });
});
