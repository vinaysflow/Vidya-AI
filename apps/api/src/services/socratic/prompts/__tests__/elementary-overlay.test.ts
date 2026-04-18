/**
 * Tests for buildLearningProfileOverlay in elementary-overlay.ts
 */

import { describe, it, expect } from 'vitest';
import { buildLearningProfileOverlay, buildElementaryOverlay } from '../elementary-overlay';

describe('buildLearningProfileOverlay', () => {
  it('returns empty string when profile is empty', () => {
    expect(buildLearningProfileOverlay({})).toBe('');
    expect(buildLearningProfileOverlay({ learnsBestBy: [], focusHelpers: [], hardSubjects: [], accommodations: [] })).toBe('');
  });

  it('includes visual learning instruction when learnsBestBy: visual', () => {
    const result = buildLearningProfileOverlay({ learnsBestBy: ['visual'] });
    expect(result).toContain('LEARNER PROFILE');
    expect(result.toLowerCase()).toContain('diagram');
  });

  it('includes listening instruction when learnsBestBy: listening', () => {
    const result = buildLearningProfileOverlay({ learnsBestBy: ['listening'] });
    expect(result.toLowerCase()).toContain('conversational');
  });

  it('includes hands-on instruction when learnsBestBy: hands-on', () => {
    const result = buildLearningProfileOverlay({ learnsBestBy: ['hands-on'] });
    expect(result.toLowerCase()).toContain('try it yourself');
  });

  it('includes short pacing note for short-sessions focus helper', () => {
    const result = buildLearningProfileOverlay({ focusHelpers: ['short-sessions'] });
    expect(result).toContain('Pacing');
    expect(result).toContain('brief');
  });

  it('includes calm tone note for quiet-mode focus helper', () => {
    const result = buildLearningProfileOverlay({ focusHelpers: ['quiet-mode'] });
    expect(result.toLowerCase()).toContain('calm');
  });

  it('includes math support for hardSubjects: math', () => {
    const result = buildLearningProfileOverlay({ hardSubjects: ['math'] });
    expect(result).toContain('Math support');
  });

  it('includes extra-time accommodation note', () => {
    const result = buildLearningProfileOverlay({ accommodations: ['extra-time'] });
    expect(result.toLowerCase()).toContain('never rush');
  });

  it('includes read-aloud note for read-aloud accommodation', () => {
    const result = buildLearningProfileOverlay({ accommodations: ['read-aloud'] });
    expect(result.toLowerCase()).toContain('text-to-speech');
  });

  it('includes visual-aids note for visual-aids accommodation', () => {
    const result = buildLearningProfileOverlay({ accommodations: ['visual-aids'] });
    expect(result.toLowerCase()).toContain('visual');
  });

  it('combines multiple profile items', () => {
    const result = buildLearningProfileOverlay({
      learnsBestBy: ['visual', 'hands-on'],
      focusHelpers: ['short-sessions'],
      accommodations: ['extra-time'],
    });
    expect(result).toContain('LEARNER PROFILE');
    expect(result.toLowerCase()).toContain('diagram');
    expect(result.toLowerCase()).toContain('try it yourself');
    expect(result.toLowerCase()).toContain('brief');
    expect(result.toLowerCase()).toContain('never rush');
  });

  it('ignores unknown profile values gracefully', () => {
    const result = buildLearningProfileOverlay({
      learnsBestBy: ['unknown_style' as any],
      focusHelpers: [],
    });
    // Unknown value should not crash, but also not produce instruction text
    expect(result).toBe('');
  });
});

// Tests for praise-removal from buildElementaryOverlay (plan 2C, P8 — structural enforcement)
describe('buildElementaryOverlay — praise language removed', () => {
  it('does NOT contain "Celebrate" instruction', () => {
    const result = buildElementaryOverlay(5, 5);
    expect(result).not.toContain('Celebrate correct answers');
  });

  it('does NOT contain "Yes!" as celebration instruction', () => {
    const result = buildElementaryOverlay(5, 5);
    expect(result).not.toContain('"Yes!", "Boom!", "Nailed it!"');
  });

  it('does NOT contain "Amazing" as celebration instruction in level-up note', () => {
    const result = buildElementaryOverlay(5, 6); // effectiveGrade > grade triggers level-up note
    expect(result).not.toContain('"Amazing!"');
    expect(result).not.toContain('"Wow!"');
  });

  it('does NOT contain "Celebrate small wins" instruction', () => {
    const result = buildElementaryOverlay(5, 5);
    expect(result).not.toContain('Celebrate small wins');
  });

  it('DOES contain "Acknowledge" as replacement instruction', () => {
    const result = buildElementaryOverlay(5, 5);
    expect(result).toContain('Acknowledge correct answers');
  });
});
