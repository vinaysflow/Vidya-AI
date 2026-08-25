/**
 * misconceptionTracker.ts
 *
 * Covers:
 *  - keywords()                     significant-token extraction
 *  - selectBestMisconceptionMatch() free-response scoring & threshold (pure)
 *  - applyCorrectTowardResolution() ACTIVE -> RESOLVING -> RESOLVED lifecycle (mocked prisma)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMiscFindMany, mockStateFindMany, mockStateUpdate } = vi.hoisted(() => ({
  mockMiscFindMany: vi.fn(),
  mockStateFindMany: vi.fn(),
  mockStateUpdate: vi.fn(),
}));

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    misconception: { findMany: mockMiscFindMany },
    misconceptionState: { findMany: mockStateFindMany, update: mockStateUpdate },
  },
}));

import {
  keywords,
  selectBestMisconceptionMatch,
  applyCorrectTowardResolution,
  MIN_MATCH_SCORE,
} from '../misconceptionTracker';

describe('keywords', () => {
  it('keeps only lowercase tokens longer than 3 chars', () => {
    expect(keywords('Added the Numerators AND denominators!')).toEqual([
      'added',
      'numerators',
      'denominators',
    ]);
  });
  it('returns [] for empty input', () => {
    expect(keywords(null)).toEqual([]);
    expect(keywords('')).toEqual([]);
  });
});

describe('selectBestMisconceptionMatch', () => {
  const candidates = [
    { id: 'm-add', signature: { errorType: 'conceptual', keywords: ['added', 'numerators', 'denominators'] } },
    { id: 'm-other', signature: { keywords: ['regrouping', 'borrow'] } },
  ];

  it('an exact errorType match alone clears the threshold', () => {
    const best = selectBestMisconceptionMatch(candidates, 'conceptual', 'unrelated words here');
    expect(best?.id).toBe('m-add');
    expect(best!.score).toBeGreaterThanOrEqual(MIN_MATCH_SCORE);
  });

  it('two overlapping keywords clear the threshold without an errorType', () => {
    const best = selectBestMisconceptionMatch(candidates, null, 'student added numerators');
    expect(best?.id).toBe('m-add');
    expect(best!.score).toBe(2);
  });

  it('a single keyword overlap is below threshold -> null', () => {
    const best = selectBestMisconceptionMatch(candidates, null, 'just borrow here');
    expect(best).toBeNull();
  });

  it('errorType + keyword overlap outscores keyword-only candidates', () => {
    const best = selectBestMisconceptionMatch(candidates, 'conceptual', 'added numerators');
    // 2 (errorType) + 2 (keywords) = 4
    expect(best).toEqual({ id: 'm-add', score: 4 });
  });

  it('returns null when there are no candidates', () => {
    expect(selectBestMisconceptionMatch([], 'conceptual', 'added numerators')).toBeNull();
  });
});

describe('applyCorrectTowardResolution lifecycle', () => {
  beforeEach(() => {
    mockMiscFindMany.mockReset();
    mockStateFindMany.mockReset();
    mockStateUpdate.mockReset();
    mockMiscFindMany.mockResolvedValue([{ id: 'm1' }]);
    mockStateUpdate.mockResolvedValue({});
  });

  it('no-op when conceptKey is null', async () => {
    await applyCorrectTowardResolution('u', null, 'MATHEMATICS' as any);
    expect(mockMiscFindMany).not.toHaveBeenCalled();
  });

  it('first correct moves ACTIVE -> RESOLVING (not yet resolved)', async () => {
    mockStateFindMany.mockResolvedValue([{ id: 's1', consecutiveCorrect: 0, status: 'ACTIVE' }]);
    await applyCorrectTowardResolution('u', 'c1', 'MATHEMATICS' as any);
    expect(mockStateUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { consecutiveCorrect: 1, status: 'RESOLVING', resolvedAt: null },
    });
  });

  it('second consecutive correct resolves it', async () => {
    mockStateFindMany.mockResolvedValue([{ id: 's1', consecutiveCorrect: 1, status: 'RESOLVING' }]);
    await applyCorrectTowardResolution('u', 'c1', 'MATHEMATICS' as any);
    const arg = mockStateUpdate.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 's1' });
    expect(arg.data.consecutiveCorrect).toBe(2);
    expect(arg.data.status).toBe('RESOLVED');
    expect(arg.data.resolvedAt).toBeInstanceOf(Date);
  });

  it('does nothing when the concept has no catalog rows', async () => {
    mockMiscFindMany.mockResolvedValue([]);
    await applyCorrectTowardResolution('u', 'c1', 'MATHEMATICS' as any);
    expect(mockStateFindMany).not.toHaveBeenCalled();
    expect(mockStateUpdate).not.toHaveBeenCalled();
  });
});
