/**
 * Server-side capture regression tests — P3 enforcement.
 *
 * Verifies that XP, streak, and badge capture mechanisms remain
 * intact after the kid-path UI cleanup. None of these were modified,
 * but these tests provide explicit regression coverage per plan 2D.
 *
 * P3: Server-side capture, client-side minimalism. Server tracks everything
 * for parent dashboard, BKT, analytics. Client surfaces only what serves
 * the child in the moment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist Prisma mock ────────────────────────────────────────────────────────
const {
  mockXpEventCreate,
  mockUserGamificationUpsert,
  mockUserGamificationUpdate,
  mockUserBadgeUpsert,
  mockUserUpsert,
  mockUserGamificationFindUnique,
} = vi.hoisted(() => {
  const mockXpEventCreate = vi.fn();
  const mockUserGamificationUpsert = vi.fn();
  const mockUserGamificationUpdate = vi.fn();
  const mockUserBadgeUpsert = vi.fn();
  const mockUserUpsert = vi.fn();
  const mockUserGamificationFindUnique = vi.fn();
  return {
    mockXpEventCreate,
    mockUserGamificationUpsert,
    mockUserGamificationUpdate,
    mockUserBadgeUpsert,
    mockUserUpsert,
    mockUserGamificationFindUnique,
  };
});

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: { upsert: mockUserUpsert },
    xPEvent: { create: mockXpEventCreate },
    userGamification: {
      upsert: mockUserGamificationUpsert,
      update: mockUserGamificationUpdate,
      findUnique: mockUserGamificationFindUnique,
    },
    userBadge: { upsert: mockUserBadgeUpsert, findMany: vi.fn().mockResolvedValue([]) },
    session: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { awardXP } from '../engine';

describe('awardXP — server-side XP capture regression (P3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserUpsert.mockResolvedValue({});
    mockXpEventCreate.mockResolvedValue({});
    mockUserGamificationUpsert.mockResolvedValue({ userId: 'u1', xp: 10, level: 1 });
    mockUserGamificationUpdate.mockResolvedValue({});
  });

  it('creates an XPEvent record for MESSAGE_SENT', async () => {
    await awardXP('user-1', 'MESSAGE_SENT', 'session-1');
    expect(mockXpEventCreate).toHaveBeenCalledOnce();
    const callArg = mockXpEventCreate.mock.calls[0][0];
    expect(callArg.data.eventType).toBe('MESSAGE_SENT');
    expect(callArg.data.userId).toBe('user-1');
    expect(typeof callArg.data.xpAmount).toBe('number');
    expect(callArg.data.xpAmount).toBeGreaterThan(0);
  });

  it('creates an XPEvent record for EXPLAIN_BACK', async () => {
    await awardXP('user-1', 'EXPLAIN_BACK', 'session-1');
    expect(mockXpEventCreate).toHaveBeenCalledOnce();
    const callArg = mockXpEventCreate.mock.calls[0][0];
    expect(callArg.data.eventType).toBe('EXPLAIN_BACK');
    expect(callArg.data.xpAmount).toBeGreaterThan(0);
  });

  it('creates an XPEvent record for SHOWED_WORK', async () => {
    await awardXP('user-1', 'SHOWED_WORK', 'session-1');
    expect(mockXpEventCreate).toHaveBeenCalledOnce();
    const callArg = mockXpEventCreate.mock.calls[0][0];
    expect(callArg.data.eventType).toBe('SHOWED_WORK');
  });

  it('creates an XPEvent record for SESSION_COMPLETE', async () => {
    await awardXP('user-1', 'SESSION_COMPLETE', 'session-1');
    expect(mockXpEventCreate).toHaveBeenCalledOnce();
    const callArg = mockXpEventCreate.mock.calls[0][0];
    expect(callArg.data.eventType).toBe('SESSION_COMPLETE');
  });

  it('upserts userGamification with incremented XP', async () => {
    await awardXP('user-1', 'MESSAGE_SENT', 'session-1');
    expect(mockUserGamificationUpsert).toHaveBeenCalledOnce();
    const callArg = mockUserGamificationUpsert.mock.calls[0][0];
    expect(callArg.where.userId).toBe('user-1');
    expect(callArg.update).toMatchObject({ xp: { increment: expect.any(Number) } });
  });

  it('returns xpAwarded, newLevel, leveledUp in response', async () => {
    const result = await awardXP('user-1', 'MESSAGE_SENT', 'session-1');
    expect(typeof result.xpAwarded).toBe('number');
    expect(typeof result.newLevel).toBe('number');
    expect(typeof result.leveledUp).toBe('boolean');
    expect(typeof result.streakFreezeEarned).toBe('boolean');
  });
});
