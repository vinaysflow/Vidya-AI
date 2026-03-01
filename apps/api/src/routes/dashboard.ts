import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { generateStudentSummary, generateClassSummary } from '../services/reporting/digestGenerator';
import crypto from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

router.get('/student/:id/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt((req.query.days as string) || '7', 10);
    const summary = await generateStudentSummary(req.params.id, days);
    res.json({ success: true, summary });
  } catch (error) { next(error); }
});

router.get('/student/:id/mastery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await prisma.progress.findMany({
      where: { userId: req.params.id },
      orderBy: { mastery: 'desc' },
    });
    res.json({ success: true, mastery: progress });
  } catch (error) { next(error); }
});

router.get('/student/:id/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sessions = await prisma.session.findMany({
      where: { userId: req.params.id, startedAt: { gte: since } },
      select: { startedAt: true, subject: true },
      orderBy: { startedAt: 'asc' },
    });
    const daily: Record<string, number> = {};
    for (const s of sessions) {
      const day = s.startedAt.toISOString().slice(0, 10);
      daily[day] = (daily[day] || 0) + 1;
    }
    res.json({ success: true, activity: Object.entries(daily).map(([date, count]) => ({ date, count })) });
  } catch (error) { next(error); }
});

const LinkSchema = z.object({
  guardianUserId: z.string(),
  studentUserId: z.string(),
  relationship: z.enum(['PARENT', 'TEACHER', 'GUARDIAN']),
});

router.post('/guardian/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { guardianUserId, studentUserId, relationship } = LinkSchema.parse(req.body);
    const link = await prisma.guardian.create({
      data: { userId: guardianUserId, studentUserId, relationship },
    });
    res.json({ success: true, link });
  } catch (error) { next(error); }
});

router.post('/guardian/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { linkId } = z.object({ linkId: z.string() }).parse(req.body);
    const link = await prisma.guardian.update({
      where: { id: linkId },
      data: { approved: true },
    });
    res.json({ success: true, link });
  } catch (error) { next(error); }
});

router.post('/classroom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teacherId, name } = z.object({ teacherId: z.string(), name: z.string().min(1) }).parse(req.body);
    const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const classRoom = await prisma.classRoom.create({
      data: { teacherId, name, joinCode },
    });
    res.json({ success: true, classRoom });
  } catch (error) { next(error); }
});

router.post('/classroom/:id/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, joinCode } = z.object({ userId: z.string(), joinCode: z.string() }).parse(req.body);
    const classRoom = await prisma.classRoom.findFirst({
      where: { id: req.params.id, joinCode },
    });
    if (!classRoom) return res.status(404).json({ success: false, error: 'Invalid join code' });
    const membership = await prisma.classRoomStudent.create({
      data: { classRoomId: classRoom.id, userId },
    });
    res.json({ success: true, membership });
  } catch (error) { next(error); }
});

router.get('/classroom/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt((req.query.days as string) || '7', 10);
    const summary = await generateClassSummary(req.params.id, days);
    res.json({ success: true, ...summary });
  } catch (error) { next(error); }
});

export { router as dashboardRouter };
