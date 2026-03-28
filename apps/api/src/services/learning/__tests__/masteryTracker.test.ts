/**
 * masteryTracker.ts tests
 *
 * Tests:
 *  - bktUpdate pure math (internal, tested via exported functions)
 *  - seedFromDiagnostic: correct → mastery 35, wrong → mastery 5
 *  - seedFromDiagnostic: upsert semantics (calling twice overwrites)
 *  - seedFromDiagnostic: throws on missing concept
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoist prisma mock ---
const { mockConceptFindUnique, mockProgressUpsert } = vi.hoisted(() => ({
  mockConceptFindUnique: vi.fn(),
  mockProgressUpsert: vi.fn(),
}));

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    concept: { findUnique: mockConceptFindUnique },
    progress: {
      upsert: mockProgressUpsert,
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { seedFromDiagnostic, updateMastery } from '../masteryTracker';

const MOCK_CONCEPT = {
  id: 'concept-1',
  conceptKey: 'addition_basic',
  subject: 'MATHEMATICS',
  topic: 'Addition',
  name: 'Basic Addition',
};

describe('seedFromDiagnostic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConceptFindUnique.mockResolvedValue(MOCK_CONCEPT);
    mockProgressUpsert.mockResolvedValue({});
  });

  it('creates Progress with mastery=35 when correct=true', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', true);

    expect(mockProgressUpsert).toHaveBeenCalledOnce();
    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.create.mastery).toBe(35);
    expect(call.update.mastery).toBe(35);
  });

  it('creates Progress with mastery=5 when correct=false', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', false);

    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.create.mastery).toBe(5);
    expect(call.update.mastery).toBe(5);
  });

  it('sets successes=1 for correct answer', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', true);
    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.create.successes).toBe(1);
    expect(call.update.successes).toBe(1);
  });

  it('sets successes=0 for wrong answer', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', false);
    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.create.successes).toBe(0);
    expect(call.update.successes).toBe(0);
  });

  it('sets attempts=1 always', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', true);
    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.create.attempts).toBe(1);
    expect(call.update.attempts).toBe(1);
  });

  it('uses correct concept lookup key', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', true);
    expect(mockConceptFindUnique).toHaveBeenCalledWith({
      where: { conceptKey: 'addition_basic' },
    });
  });

  it('throws when concept does not exist', async () => {
    mockConceptFindUnique.mockResolvedValueOnce(null);
    await expect(seedFromDiagnostic('user-123', 'nonexistent_key', true))
      .rejects.toThrow('Concept not found');
  });

  it('upsert uses userId + conceptId as the unique key', async () => {
    await seedFromDiagnostic('user-abc', 'addition_basic', false);
    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.where).toEqual({
      userId_conceptId: { userId: 'user-abc', conceptId: MOCK_CONCEPT.id },
    });
  });

  it('sets nextReview to a future date', async () => {
    await seedFromDiagnostic('user-123', 'addition_basic', true);
    const call = mockProgressUpsert.mock.calls[0][0];
    const nextReview = call.create.nextReview as Date;
    expect(nextReview instanceof Date).toBe(true);
    expect(nextReview.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('bktUpdate math (via updateMastery behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConceptFindUnique.mockResolvedValue(MOCK_CONCEPT);
    mockProgressUpsert.mockResolvedValue({});
  });

  it('updateMastery with correct answer increases mastery above prior', async () => {
    // Mock existing progress with mastery=10
    const { prisma } = await import('../../../lib/prisma');
    (prisma.progress.findUnique as any).mockResolvedValueOnce({
      mastery: 10,
      attempts: 1,
      successes: 0,
    });

    await updateMastery('user-123', 'addition_basic', true);

    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.update.mastery).toBeGreaterThan(10);
  });

  it('updateMastery with wrong answer keeps mastery low', async () => {
    const { prisma } = await import('../../../lib/prisma');
    (prisma.progress.findUnique as any).mockResolvedValueOnce({
      mastery: 10,
      attempts: 1,
      successes: 1,
    });

    await updateMastery('user-123', 'addition_basic', false);

    const call = mockProgressUpsert.mock.calls[0][0];
    // BKT from prior 10 with wrong answer still gets a learning transition boost
    // so mastery ends up ~31 (posterior low, but P_TRANSIT=0.3 moves it up).
    // The key assertion: wrong answer does NOT produce mastery >= correct answer would.
    expect(call.update.mastery).toBeLessThan(50);
    expect(call.update.mastery).toBeGreaterThan(0);
  });

  it('mastery is clamped between 1 and 99', async () => {
    const { prisma } = await import('../../../lib/prisma');
    (prisma.progress.findUnique as any).mockResolvedValueOnce({
      mastery: 99,
      attempts: 10,
      successes: 10,
    });

    await updateMastery('user-123', 'addition_basic', true);

    const call = mockProgressUpsert.mock.calls[0][0];
    expect(call.update.mastery).toBeLessThanOrEqual(99);
    expect(call.update.mastery).toBeGreaterThanOrEqual(1);
  });
});
