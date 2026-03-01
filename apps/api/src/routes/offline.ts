import { Router, Request, Response, NextFunction } from 'express';
import { Subject } from '@prisma/client';
import { generatePack, getPacksManifest } from '../services/offline/packGenerator';

const router: Router = Router();

router.get('/pack/:subject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = req.params.subject as Subject;
    const pack = await generatePack(subject);
    res.json({ success: true, pack });
  } catch (error) { next(error); }
});

router.get('/packs/manifest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const manifest = await getPacksManifest();
    res.json({ success: true, manifest });
  } catch (error) { next(error); }
});

export { router as offlineRouter };
