/**
 * GET /api/user/:userId route tests
 *
 * Tests the user profile endpoint that the frontend calls in fetchProfileAndMastery.
 * The User record is created lazily on first session start, so non-existent users
 * must return { success: true, user: null } rather than a 404.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoist Prisma mock ---
const { mockFindUnique } = vi.hoisted(() => {
  const mockFindUnique = vi.fn();
  return { mockFindUnique };
});

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      deleteMany: vi.fn(),
    },
    xPEvent: { deleteMany: vi.fn() },
    userBadge: { deleteMany: vi.fn() },
    userGamification: { deleteMany: vi.fn() },
    message: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    progress: { deleteMany: vi.fn() },
    learningPath: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// --- Import router under test AFTER mocks are set ---
import express from 'express';
import { userRouter } from '../user';
import { makeRequest } from '../../test-utils';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userRouter);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ success: false, error: err.message });
  });
  return app;
}

describe('GET /api/user/:userId', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('returns user data when user exists', async () => {
    const mockUser = {
      grade: 4,
      adaptiveState: { effectiveGrade: 5, recentPerformance: [], streakAtCurrentGrade: 2 },
      preferredLang: 'EN',
    };
    mockFindUnique.mockResolvedValueOnce(mockUser);

    const res = await makeRequest(app, 'GET', '/api/user/user-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual(mockUser);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { grade: true, adaptiveState: true, preferredLang: true },
    });
  });

  it('returns { success: true, user: null } when user does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await makeRequest(app, 'GET', '/api/user/new-user-abc');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeNull();
  });

  it('returns 400 when userId is "anonymous"', async () => {
    const res = await makeRequest(app, 'GET', '/api/user/anonymous');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('handles DB errors gracefully via next(error)', async () => {
    mockFindUnique.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await makeRequest(app, 'GET', '/api/user/user-err');

    expect(res.status).toBe(500);
  });

  it('does not call findUnique for "anonymous" userId', async () => {
    await makeRequest(app, 'GET', '/api/user/anonymous');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
