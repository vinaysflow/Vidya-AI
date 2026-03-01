import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getProfile,
  getLeaderboard,
  updateStreak,
} from '../services/gamification/engine';
import { PrismaClient } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

const UserIdSchema = z.object({
  userId: z.string().min(1),
});

router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const profile = await getProfile(userId);
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.get('/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
    const leaderboard = await getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (error) {
    next(error);
  }
});

router.post('/streak-freeze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = UserIdSchema.parse(req.body);
    const gam = await prisma.userGamification.findUnique({ where: { userId } });

    if (!gam || gam.streakFreezes <= 0) {
      return res.status(400).json({ success: false, error: 'No streak freezes available' });
    }

    await prisma.userGamification.update({
      where: { userId },
      data: { streakFreezes: { decrement: 1 } },
    });

    res.json({ success: true, streakFreezes: gam.streakFreezes - 1 });
  } catch (error) {
    next(error);
  }
});

export { router as gamificationRouter };
