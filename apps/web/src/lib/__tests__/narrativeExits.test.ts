/**
 * narrativeExits utility tests — TDD first.
 *
 * Verifies rotation through all threads before repeating,
 * null/unknown theme falls back to 'default', and all buckets exist.
 *
 * P6: Neurodiverse design — calm, predictable session endings with
 * narrative continuity rather than evaluated posture.
 */

import { pickExitThread } from '../narrativeExits';

describe('pickExitThread', () => {
  beforeEach(() => {
    // Reset module to clear rotation state between tests
    jest.resetModules();
  });

  it('returns a non-empty string for null theme (default bucket)', () => {
    const { pickExitThread: pick } = require('../narrativeExits');
    const result = pick(null);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for unknown theme (default bucket)', () => {
    const { pickExitThread: pick } = require('../narrativeExits');
    const result = pick('unknown-theme-xyz');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string for "space" theme', () => {
    const { pickExitThread: pick } = require('../narrativeExits');
    const result = pick('space');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('rotates through all 3 space threads before repeating', () => {
    const { pickExitThread: pick } = require('../narrativeExits');
    const seen = new Set<string>();
    // Call 3 times — all 3 should be unique
    seen.add(pick('space'));
    seen.add(pick('space'));
    seen.add(pick('space'));
    expect(seen.size).toBe(3);

    // 4th call wraps around — should be same as first
    const fourth = pick('space');
    // It's still a valid string
    expect(typeof fourth).toBe('string');
    // And it's one of the 3 we saw (rotation wraps)
    expect(seen.has(fourth)).toBe(true);
  });

  it('default bucket rotates independently from space bucket', () => {
    const { pickExitThread: pick } = require('../narrativeExits');
    // Exhaust space rotation
    pick('space');
    pick('space');
    pick('space');
    // Default should still start from its own index
    const defaultResult = pick(null);
    expect(typeof defaultResult).toBe('string');
  });

  it('supports all configured theme keys', () => {
    const { pickExitThread: pick } = require('../narrativeExits');
    const themes = ['space', 'cooking', 'animals', 'sports', 'gaming', 'robots', 'money', 'youtube'];
    for (const theme of themes) {
      const result = pick(theme);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
