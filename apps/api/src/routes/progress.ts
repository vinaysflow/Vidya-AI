import { Router, Request, Response, NextFunction } from 'express';
import { Subject } from '@prisma/client';
import { getMasteryMap, getDueReviews, getRadarData } from '../services/learning/masteryTracker';
import { generatePath, getRecommendedNext } from '../services/learning/pathGenerator';

const router: Router = Router();

router.get('/mastery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = req.query.subject as Subject | undefined;
    const map = await getMasteryMap(userId, subject);
    res.json({ success: true, mastery: map });
  } catch (error) { next(error); }
});

router.get('/radar/:subject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = req.params.subject as Subject;
    const data = await getRadarData(userId, subject);
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

router.get('/path/:subject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = req.params.subject as Subject;
    const path = await generatePath(userId, subject);
    res.json({ success: true, path });
  } catch (error) { next(error); }
});

router.get('/due-reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const reviews = await getDueReviews(userId);
    res.json({ success: true, reviews });
  } catch (error) { next(error); }
});

router.get('/recommended-next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const recommendation = await getRecommendedNext(userId);
    res.json({ success: true, recommendation });
  } catch (error) { next(error); }
});

export { router as progressRouter };
