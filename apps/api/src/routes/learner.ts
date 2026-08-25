/**
 * Learner Model API
 *
 * Read surface over the first-class learner model:
 *   GET  /api/learner/misconceptions   active + resolved misconception ledger
 *   GET  /api/learner/traits           habits of mind + channel + struggle model
 *   GET  /api/learner/session-plan      Tutor Director's adaptive session arc
 *   GET  /api/learner/buddy            teachable-agent buddy projection
 *   POST /api/learner/catalog/sync      promote content misconceptions into the catalog
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Subject } from '@prisma/client';
import {
  getActiveMisconceptions,
  getResolvedMisconceptions,
  syncMisconceptionCatalog,
} from '../services/learner/misconceptionTracker';
import { getLearnerTraits, rollupLearnerModel } from '../services/learner/learnerTraits';
import { buildSessionPlan } from '../services/learner/tutorDirector';
import { getBuddyState } from '../services/learner/buddyState';

const router: Router = Router();

router.get('/misconceptions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const conceptKey = (req.query.conceptKey as string) || undefined;
    const [active, resolved] = await Promise.all([
      getActiveMisconceptions(userId, conceptKey ?? null),
      getResolvedMisconceptions(userId),
    ]);
    res.json({ success: true, active, resolved });
  } catch (error) { next(error); }
});

router.get('/traits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    // Recompute on demand if requested (e.g., parent dashboard refresh).
    const traits = req.query.refresh === 'true'
      ? await rollupLearnerModel(userId)
      : await getLearnerTraits(userId);
    res.json({ success: true, traits });
  } catch (error) { next(error); }
});

router.get('/session-plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = (req.query.subject as Subject) || 'MATHEMATICS';
    const conceptKey = (req.query.conceptKey as string) || undefined;
    const plan = await buildSessionPlan(userId, subject, { conceptKey });
    res.json({ success: true, plan });
  } catch (error) { next(error); }
});

router.get('/buddy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const buddy = await getBuddyState(userId);
    res.json({ success: true, buddy });
  } catch (error) { next(error); }
});

router.post('/catalog/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = (req.body?.subject as Subject) || 'MATHEMATICS';
    const upserted = await syncMisconceptionCatalog(subject);
    res.json({ success: true, upserted });
  } catch (error) { next(error); }
});

export { router as learnerRouter };
