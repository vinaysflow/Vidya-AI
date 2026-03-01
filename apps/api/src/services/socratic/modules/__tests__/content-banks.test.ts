import { describe, it, expect } from 'vitest';
import { codingModule } from '../coding';
import { economicsModule } from '../economics';
import { stemModule } from '../stem';

const baseAnalysis = {
  distanceFromSolution: 55,
  conceptsIdentified: ['test'],
  conceptGaps: ['gap'],
  studentStrengths: ['effort'],
};

describe('Subject content banks', () => {
  it('injects coding question bank by topic', () => {
    const addendum = codingModule.buildResponseSystemAddendum?.(baseAnalysis, {
      topic: 'algorithms',
      hintLevel: 2,
    });
    expect(addendum).toContain("What's the brute-force solution");
  });

  it('injects economics question bank by topic', () => {
    const addendum = economicsModule.buildResponseSystemAddendum?.(baseAnalysis, {
      topic: 'macro',
      hintLevel: 2,
    });
    expect(addendum).toContain('aggregate demand curve');
  });

  it('injects STEM subject questions by topic', () => {
    const addendum = stemModule.buildResponseSystemAddendum?.(baseAnalysis, {
      subject: 'PHYSICS',
      topic: 'mechanics',
    });
    expect(addendum).toContain('free body diagram');
  });
});
