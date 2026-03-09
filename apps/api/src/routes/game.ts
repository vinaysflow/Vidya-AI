/**
 * Game API Routes
 * Kid-mode specific endpoints for scene images, quest generation, etc.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Subject } from '@prisma/client';
import { generateSceneImage } from '../services/game/sceneImageGenerator';

const router = Router();
const prisma = new PrismaClient();

const SceneImageSchema = z.object({
  questTitle: z.string().min(1).max(200),
  chapter: z.string().max(100).default('Adventures'),
  tags: z.array(z.string()).default([]),
  phase: z.enum(['loading', 'playing', 'celebration', 'explain-back', 'complete']).optional(),
});

/**
 * POST /api/game/scene-image
 * Generate a kid-friendly scene illustration for a quest
 */
router.post('/scene-image', async (req: Request, res: Response) => {
  try {
    const data = SceneImageSchema.parse(req.body);
    const imageUrl = await generateSceneImage({
      questTitle: data.questTitle,
      chapter: data.chapter,
      tags: data.tags,
      phase: data.phase,
    });

    if (!imageUrl) {
      return res.json({ success: false, imageUrl: null });
    }

    return res.json({ success: true, imageUrl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors });
    }
    console.error('[Game] scene-image error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate scene image' });
  }
});

/**
 * GET /api/game/generate-quest
 * Generate an infinite quest from a random QuestionTemplate for the given grade and subject.
 */
router.get('/generate-quest', async (req: Request, res: Response) => {
  try {
    const grade = parseInt(req.query.grade as string) || 3;
    const enrichment = req.query.enrichment as string | undefined;
    const subjectParam = req.query.subject as string | undefined;

    const where: {
      gradeLevel: number;
      subject?: Subject;
    } = { gradeLevel: grade };

    if (subjectParam) {
      where.subject = subjectParam.toUpperCase() as Subject;
    }

    const totalCount = await prisma.questionTemplate.count({ where });
    if (totalCount === 0) {
      res.status(404).json({ success: false, error: 'No templates for this grade/subject' });
      return;
    }

    const skip = Math.floor(Math.random() * totalCount);
    const template = await prisma.questionTemplate.findFirst({ where, skip });

    if (!template) {
      res.status(404).json({ success: false, error: 'No templates for this grade/subject' });
      return;
    }

    // Look up concept for better topic derivation
    const concept = await prisma.concept.findUnique({
      where: { conceptKey: template.conceptKey },
    });

    const allChapters = [
      'Minecraft Builder', 'Kitchen Scientist', 'Playground Lab', 'Pattern Detective',
      'Nature Explorer', 'Logic Detective', 'Space Explorer', 'Dragon Academy',
      'Ocean Discovery', 'Enchanted Forest',
      'Body Detective', 'Ecosystem Explorer', 'Genetics Lab',
      'Bug Hunter', 'Algorithm Arena', 'Code Architect',
      'Story Detective', 'Poetry Explorer', 'Argument Builder',
      'Market Maker', 'Money Master',
      'Robot Trainer', 'Bias Detective',
      'Planet Patrol', 'Weather Watcher',
      'Puzzle Palace', 'Story Crafter', 'Persuasion Pro',
    ];
    const chapter = allChapters[Math.floor(Math.random() * allChapters.length)];

    const quest = {
      id: `gen_${template.id}_${Date.now()}`,
      title: template.questionText.slice(0, 50),
      prompt: template.questionText,
      subject: template.subject,
      topic: concept?.topic ?? template.conceptKey.split('_').slice(0, 2).join('_'),
      conceptKey: template.conceptKey,
      prerequisites: [],
      tags: enrichment ? [enrichment.toLowerCase()] : [],
      chapter,
      order: 1,
      gradeLevel: grade,
    };

    res.json({ success: true, quest });
  } catch (err) {
    console.error('[Game] generate-quest error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate quest' });
  }
});

/**
 * GET /api/game/diagnostic-quiz
 * Returns 5 diagnostic templates for a placement quiz.
 * Spans grade-2 to grade+2 to detect actual vs. enrolled grade level.
 * Templates must have diagnostic=true flag set in the database.
 *
 * Query params:
 *   subject: Subject enum value (default: MATHEMATICS)
 *   grade: integer (default: 5)
 */
router.get('/diagnostic-quiz', async (req: Request, res: Response) => {
  try {
    const grade = Math.max(3, Math.min(9, parseInt(req.query.grade as string) || 5));
    const subjectParam = (req.query.subject as string | undefined)?.toUpperCase() ?? 'MATHEMATICS';
    const minGrade = Math.max(3, grade - 2);
    const maxGrade = Math.min(9, grade + 2);

    const templates = await prisma.questionTemplate.findMany({
      where: {
        diagnostic: true,
        subject: subjectParam as Subject,
        gradeLevel: { gte: minGrade, lte: maxGrade },
      },
      select: {
        id: true,
        conceptKey: true,
        gradeLevel: true,
        difficulty: true,
        subject: true,
        questionText: true,
        answerFormula: true,
        distractors: true,
        solutionSteps: true,
        tags: true,
      },
      orderBy: { gradeLevel: 'asc' },
      take: 20,
    });

    if (templates.length === 0) {
      return res.status(404).json({ success: false, error: `No diagnostic templates for ${subjectParam} near grade ${grade}` });
    }

    // Pick 5 templates: try to get 1 per grade level for spread
    const byGrade = new Map<number, typeof templates>();
    for (const t of templates) {
      if (!byGrade.has(t.gradeLevel)) byGrade.set(t.gradeLevel, []);
      byGrade.get(t.gradeLevel)!.push(t);
    }
    const picked: typeof templates = [];
    for (let g = minGrade; g <= maxGrade && picked.length < 5; g++) {
      const bucket = byGrade.get(g) ?? [];
      if (bucket.length > 0) {
        const idx = Math.floor(Math.random() * bucket.length);
        picked.push(bucket[idx]);
      }
    }
    // Pad to 5 if we didn't get enough
    while (picked.length < 5 && templates.length > picked.length) {
      const remaining = templates.filter((t) => !picked.some((p) => p.id === t.id));
      if (remaining.length === 0) break;
      picked.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    return res.json({ success: true, quiz: picked.slice(0, 5), subject: subjectParam, grade });
  } catch (err) {
    console.error('[Game] diagnostic-quiz error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load diagnostic quiz' });
  }
});

/**
 * GET /api/game/review-quest
 * Generates a review quest from a concept due for spaced repetition review.
 * Uses getDueReviews() to find the highest-priority due concept,
 * then picks a QuestionTemplate for it.
 *
 * Query params:
 *   userId: string (required)
 *   subject: Subject enum (optional, filters to a specific subject)
 */
router.get('/review-quest', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    const subjectParam = (req.query.subject as string | undefined)?.toUpperCase();

    // Get due reviews for this user
    const { getDueReviews } = await import('../services/learning/masteryTracker.js');
    const dueReviews = await getDueReviews(userId);

    if (dueReviews.length === 0) {
      return res.json({ success: false, hasDueReviews: false });
    }

    // Filter by subject if requested
    const filtered = subjectParam
      ? dueReviews.filter((r) => r.subject === subjectParam)
      : dueReviews;

    const topReview = filtered[0] ?? dueReviews[0];

    // Find a template for this concept
    const template = await prisma.questionTemplate.findFirst({
      where: {
        conceptKey: topReview.conceptKey ?? undefined,
        ...(topReview.conceptKey ? {} : { subject: topReview.subject }),
      },
      orderBy: { difficulty: 'asc' },
    });

    if (!template) {
      return res.json({ success: false, hasDueReviews: true, error: 'No template found for review concept' });
    }

    const reviewQuest = {
      id: `review_${template.id}_${Date.now()}`,
      title: `Review: ${topReview.name}`,
      prompt: template.questionText,
      subject: template.subject,
      topic: topReview.topic,
      conceptKey: topReview.conceptKey ?? template.conceptKey,
      prerequisites: [],
      tags: ['review', 'spaced-repetition'],
      chapter: 'Review Adventure',
      order: 0,
      gradeLevel: template.gradeLevel,
      isReview: true,
      reviewConceptName: topReview.name,
      currentMastery: topReview.mastery,
    };

    return res.json({ success: true, hasDueReviews: true, quest: reviewQuest, dueCount: dueReviews.length });
  } catch (err) {
    console.error('[Game] review-quest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load review quest' });
  }
});

export const gameRouter = router;
