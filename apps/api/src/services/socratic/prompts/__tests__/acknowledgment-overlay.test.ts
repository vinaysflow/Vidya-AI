/**
 * Tests for buildAcknowledgmentOverlay.
 *
 * TDD: This file was created BEFORE acknowledgment-overlay.ts.
 * Run it to confirm RED ("Cannot find module"), then implement.
 *
 * P5: No cheerleader praise in kid-path responses.
 * P8: Structural enforcement — constraint lives in code, not just in prompt text.
 */

import { describe, it, expect } from 'vitest';
import { buildAcknowledgmentOverlay } from '../acknowledgment-overlay';

describe('buildAcknowledgmentOverlay', () => {
  it('returns a non-empty string', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains "RESPONSE TONE CONSTRAINTS" section header', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(result).toContain('RESPONSE TONE CONSTRAINTS');
  });

  it('contains forbidden phrases list', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(result.toLowerCase()).toContain('forbidden');
  });

  it('explicitly forbids "Great job"', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(result).toContain('Great job');
  });

  it('explicitly forbids "YES!" and "Amazing"', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(result).toContain('YES!');
    expect(result).toContain('Amazing');
  });

  it('provides neutral acknowledgment alternatives', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(result).toContain('That works');
  });

  it('works for grade 3', () => {
    const result = buildAcknowledgmentOverlay(3, 3);
    expect(result).toContain('RESPONSE TONE CONSTRAINTS');
  });

  it('works for grade 9 (boundary)', () => {
    const result = buildAcknowledgmentOverlay(9, 9);
    expect(result).toContain('RESPONSE TONE CONSTRAINTS');
  });

  it('describes thinking posture, not evaluated posture', () => {
    const result = buildAcknowledgmentOverlay(5, 5);
    expect(result.toLowerCase()).toContain('thinking');
  });
});
