import { Router, Request, Response, NextFunction } from 'express';
import { Subject, PrismaClient } from '@prisma/client';
import { getMasteryMap, getMasteryByConceptKey, getDueReviews, getRadarData, updateMastery } from '../services/learning/masteryTracker';
import { generatePath, getRecommendedNext } from '../services/learning/pathGenerator';
import { getAdaptiveState } from '../services/learning/adaptiveDifficulty';
import { logEvent } from '../services/analytics/eventLogger';

const router: Router = Router();
const prisma = new PrismaClient();

router.get('/mastery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = req.query.subject as Subject | undefined;
    const map = await getMasteryMap(userId, subject);
    res.json({ success: true, mastery: map });
  } catch (error) { next(error); }
});

router.get('/mastery-by-concept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = req.query.subject as Subject | undefined;
    const map = await getMasteryByConceptKey(userId, subject);
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

/**
 * GET /api/progress/summary
 * Returns a growth-oriented summary for kid mode display.
 * Fields:
 *   - conceptsMastered: count of Progress rows where mastery >= 40
 *   - conceptsAttempted: total Progress rows for user
 *   - strongestTopic: topic with highest average mastery (min 1 record)
 *   - weakestTopic: topic with lowest average mastery (min 2 records)
 *   - effectiveGrade: from User.adaptiveState
 *   - baseGrade: from User.grade
 *   - gradeLevelsUp: effectiveGrade - baseGrade (0 = at grade level)
 *   - masteryGainLast7Days: sum of Session.masteryGain in last 7 days
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subject = req.query.subject as Subject | undefined;

    const MASTERY_THRESHOLD = 40;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [progressRecords, user, recentSessions, allSessionsForHistory] = await Promise.all([
      prisma.progress.findMany({
        where: { userId, ...(subject ? { subject } : {}) },
        select: { mastery: true, topic: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { grade: true, adaptiveState: true },
      }),
      prisma.session.findMany({
        where: { userId, startedAt: { gte: sevenDaysAgo }, masteryGain: { not: null } },
        select: { masteryGain: true },
      }),
      prisma.session.findMany({
        where: { userId, effectiveGrade: { not: null } },
        select: { effectiveGrade: true, startedAt: true },
        orderBy: { startedAt: 'asc' },
      }),
    ]);

    // Concepts mastered and attempted
    const conceptsMastered = progressRecords.filter((r) => r.mastery >= MASTERY_THRESHOLD).length;
    const conceptsAttempted = progressRecords.length;

    // Topic aggregates
    const topicMap: Record<string, { sum: number; count: number }> = {};
    for (const r of progressRecords) {
      if (!topicMap[r.topic]) topicMap[r.topic] = { sum: 0, count: 0 };
      topicMap[r.topic].sum += r.mastery;
      topicMap[r.topic].count += 1;
    }
    const topicEntries = Object.entries(topicMap)
      .map(([topic, { sum, count }]) => ({ topic, avg: sum / count, count }));
    const strongestTopic = topicEntries.length > 0
      ? topicEntries.reduce((a, b) => a.avg > b.avg ? a : b).topic
      : null;
    const weakestTopic = topicEntries.filter((t) => t.count >= 2).length > 0
      ? topicEntries.filter((t) => t.count >= 2).reduce((a, b) => a.avg < b.avg ? a : b).topic
      : null;

    // Adaptive grade
    const baseGrade = user?.grade ?? null;
    const adaptiveState = user?.adaptiveState as { effectiveGrade?: number } | null;
    const effectiveGrade = adaptiveState?.effectiveGrade ?? baseGrade;
    const gradeLevelsUp = baseGrade != null && effectiveGrade != null
      ? Math.max(0, effectiveGrade - baseGrade)
      : 0;

    // Mastery gain last 7 days
    const masteryGainLast7Days = recentSessions.reduce(
      (sum, s) => sum + (s.masteryGain ?? 0), 0
    );

    // Count concepts mastered that are above the child's base grade level
    let aboveGradeConceptsCount = 0;
    if (baseGrade != null) {
      const masteredProgressRecords = await prisma.progress.findMany({
        where: { userId, mastery: { gte: 40 }, ...(subject ? { subject } : {}) },
        select: { conceptId: true },
      });
      if (masteredProgressRecords.length > 0) {
        const conceptIds = masteredProgressRecords.map((r) => r.conceptId);
        aboveGradeConceptsCount = await prisma.concept.count({
          where: { id: { in: conceptIds }, gradeLevel: { gt: baseGrade } },
        });
      }
    }

    // Build grade-up history from consecutive session effectiveGrade changes
    const gradeUpHistory: { date: string; fromGrade: number; toGrade: number }[] = [];
    let prevGrade: number | null = null;
    for (const s of allSessionsForHistory) {
      const g = s.effectiveGrade as number;
      if (prevGrade !== null && g > prevGrade) {
        gradeUpHistory.push({
          date: s.startedAt.toISOString().split('T')[0],
          fromGrade: prevGrade,
          toGrade: g,
        });
      }
      prevGrade = g;
    }
    // Limit to last 10 grade-up events
    const trimmedHistory = gradeUpHistory.slice(-10);

    res.json({
      success: true,
      summary: {
        conceptsMastered,
        conceptsAttempted,
        strongestTopic,
        weakestTopic,
        effectiveGrade,
        baseGrade,
        gradeLevelsUp,
        masteryGainLast7Days: Math.round(masteryGainLast7Days * 100) / 100,
        aboveGradeConceptsCount,
        gradeUpHistory: trimmedHistory,
      },
    });
  } catch (error) { next(error); }
});

/**
 * POST /api/progress/init-from-diagnostic
 * Seeds BKT priors from diagnostic results.
 * Called once after onboarding diagnostic completes.
 * Correct answers → mastery = 35 (high-uncertainty above-floor prior)
 * Wrong answers   → mastery = 5  (low prior)
 */
router.post('/init-from-diagnostic', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, results, score, suggestedGrade, baseGrade } = req.body as {
      userId: string;
      results: Array<{ conceptKey: string; gradeLevel: number; correct: boolean }>;
      score: number;
      suggestedGrade: number;
      baseGrade: number;
    };

    if (!userId || !Array.isArray(results)) {
      return res.status(400).json({ success: false, error: 'userId and results are required' });
    }

    // Use updateMastery to seed BKT priors (it handles concept lookup + upsert correctly)
    let initialized = 0;
    for (const r of results) {
      try {
        await updateMastery(userId, r.conceptKey, r.correct);
        initialized++;
      } catch {
        // If concept not found in DB, skip silently
      }
    }

    // Log diagnostic_completed event for dogfood KPIs
    logEvent(userId, 'diagnostic_completed', {
      score,
      suggestedGrade,
      baseGrade,
      resultsCount: results.length,
    });

    res.json({ success: true, initialized });
  } catch (error) { next(error); }
});

export { router as progressRouter };
