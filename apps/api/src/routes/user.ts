import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * DELETE /api/user/:userId/data
 * Purges all data for a given anonymous userId (COPPA compliance / right to delete).
 */
router.delete('/:userId/data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId || userId === 'anonymous') {
      res.status(400).json({ success: false, error: 'Invalid userId' });
      return;
    }

    // Delete in dependency order to avoid FK constraint violations
    await prisma.$transaction([
      prisma.xPEvent.deleteMany({ where: { userId } }),
      prisma.userBadge.deleteMany({ where: { userId } }),
      prisma.userGamification.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { session: { userId } } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.progress.deleteMany({ where: { userId } }),
      prisma.learningPath.deleteMany({ where: { userId } }),
      prisma.user.deleteMany({ where: { id: userId } }),
    ]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };
