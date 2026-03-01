/**
 * Tutor API Routes
 * 
 * Handles all tutoring session interactions
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, Language, Subject } from '@prisma/client';
import { SocraticEngine } from '../services/socratic/engine';
import type { SessionReport } from '../services/socratic/engine';
import { awardXP, updateStreak, checkBadges } from '../services/gamification/engine';
import { updateMastery } from '../services/learning/masteryTracker';
import { generatePath } from '../services/learning/pathGenerator';
import { extractProblemFromImage } from '../services/vision/ocr';

const router: express.Router = Router();
const prisma = new PrismaClient();
const engine = new SocraticEngine();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const isImageReference = (value: string) =>
  value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://');

const StartSessionSchema = z.object({
  userId: z.string().optional(),
  subject: z.enum(['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'ESSAY_WRITING', 'COUNSELING', 'CODING', 'ENGLISH_LITERATURE', 'ECONOMICS', 'AI_LEARNING']),
  language: z.enum(['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH']).default('EN'),
  problemText: z.string().min(1).max(5000),
  problemImage: z.string().max(200000).refine(isImageReference, {
    message: 'problemImage must be a http(s) URL or data:image/* base64 string',
  }).optional(),
  noFinalAnswer: z.boolean().optional(),
  essayType: z.string().optional(),
  essayPromptText: z.string().max(10000).optional(),
  wordLimit: z.number().int().positive().optional(),
  // Counselor-specific fields
  clientContext: z.record(z.any()).optional(),                         // Full client context (PathWiz or ODEE shape)
  clientUserId: z.string().max(255).optional(),                       // Opaque client user ID
  variant: z.enum(['COLLEGE_US', 'CAREER_INDIA']).optional(),         // Client variant
});

const SendMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(5000),
  language: z.enum(['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH']).optional(),
  noFinalAnswer: z.boolean().optional(),
  messageImage: z.string().max(500000).optional(),
});

const GetSessionSchema = z.object({
  sessionId: z.string()
});

const QuizRequestSchema = z.object({
  count: z.number().int().min(1).max(5).optional(),
  language: z.enum(['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH']).optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/tutor/session/start
 * Start a new tutoring session
 */
router.post('/session/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = StartSessionSchema.parse(req.body);

    // If essay mode, try to match the prompt in the catalog
    let essayPromptId: string | undefined;
    let matchedPrompt: { promptType: string; promptCategory: string; wordLimit: number | null; school: { name: string } | null } | null = null;

    if (data.subject === 'ESSAY_WRITING' && data.essayPromptText) {
      // Fuzzy match: find prompt whose text contains the submitted text (or vice versa)
      const found = await prisma.essayPrompt.findFirst({
        where: {
          promptText: { contains: data.essayPromptText.slice(0, 100), mode: 'insensitive' },
        },
        include: { school: { select: { name: true } } },
      });

      if (found) {
        essayPromptId = found.id;
        matchedPrompt = found;
        // Use catalog word limit if not explicitly provided
        if (!data.wordLimit && found.wordLimit) {
          data.wordLimit = found.wordLimit;
        }
      }
    }

    const userId = data.userId || 'anonymous';

    // Ensure user exists (Supabase starts empty)
    await prisma.user.upsert({
      where: { id: userId },
      update: { lastActiveAt: new Date(), preferredLang: data.language as Language },
      create: {
        id: userId,
        name: userId === 'anonymous' ? 'Anonymous' : undefined,
        preferredLang: data.language as Language,
      }
    });

    // OCR extraction if image provided but text is short
    if (data.problemImage && (!data.problemText || data.problemText.length < 20)) {
      try {
        const ocr = await extractProblemFromImage(data.problemImage, data.subject as Subject, data.language as Language);
        if (ocr.extractedText) {
          data.problemText = ocr.extractedText;
        }
      } catch (_) { /* OCR is non-critical */ }
    }

    // Create session in database (scoped to API key for multi-tenancy)
    const session = await prisma.session.create({
      data: {
        userId,
        subject: data.subject as Subject,
        language: data.language as Language,
        problemText: data.problemText,
        problemImage: data.problemImage,
        essayType: data.essayType,
        essayPromptText: data.essayPromptText,
        wordLimit: data.wordLimit,
        essayPromptId: essayPromptId,
        apiKeyId: req.apiKey?.id || null,
        status: 'ACTIVE',
        noFinalAnswer: data.noFinalAnswer ?? false,
        // Counselor fields
        clientContext: data.clientContext ? JSON.parse(JSON.stringify(data.clientContext)) : undefined,
        clientUserId: data.clientUserId,
        variant: data.variant,
      }
    });

    // Create initial user message
    const userMessage = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: data.problemText,
        language: data.language as Language
      }
    });

    // Generate initial response (will ask for attempt)
    const response = await engine.processMessage({
      sessionId: session.id,
      userMessage: data.problemText,
      language: data.language as Language,
      conversationHistory: [userMessage],
      subject: data.subject as Subject,
      currentHintLevel: 0,
      noFinalAnswer: data.noFinalAnswer ?? false,
      // Pass essay prompt metadata to the engine
      essayType: data.essayType || matchedPrompt?.promptType,
      wordLimit: data.wordLimit ?? matchedPrompt?.wordLimit ?? undefined,
      essayPromptText: data.essayPromptText,
      essayCategory: matchedPrompt?.promptCategory,
      schoolName: matchedPrompt?.school?.name,
      // Counselor metadata
      clientContext: data.clientContext,
      variant: data.variant,
      clientUserId: data.clientUserId,
    });

    // Save assistant response (serialize metadata for Prisma Json)
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: response.message,
        language: response.language,
        metadata: JSON.parse(JSON.stringify(response.metadata))
      }
    });

    // Update session (persist detected topic if analysis returned one)
    await prisma.session.update({
      where: { id: session.id },
      data: { 
        messageCount: 2,
        hintLevel: response.metadata.hintLevel,
        topic: response.metadata.topic || undefined,
      }
    });

    res.json({
      success: true,
      session: {
        id: session.id,
        subject: session.subject,
        language: session.language
      },
      messages: [
        {
          id: userMessage.id,
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.createdAt
        },
        {
          id: assistantMessage.id,
          role: 'assistant',
          content: assistantMessage.content,
          metadata: response.metadata,
          timestamp: assistantMessage.createdAt
        }
      ]
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tutor/message
 * Send a message in an existing session
 */
router.post('/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = SendMessageSchema.parse(req.body);

    // Get session with messages and essay prompt (if linked)
    // Scope to the authenticated API key for multi-tenancy
    const session = await prisma.session.findFirst({
      where: {
        id: data.sessionId,
        ...(req.apiKey ? { apiKeyId: req.apiKey.id } : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        essayPrompt: {
          include: { school: { select: { name: true } } }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active'
      });
    }

    // OCR extraction for attached image
    let messageText = data.message;
    if (data.messageImage) {
      try {
        const ocr = await extractProblemFromImage(data.messageImage, session.subject, session.language);
        if (ocr.extractedText) {
          messageText = `[Image attached]\n${ocr.extractedText}\n\n${data.message}`;
        }
      } catch (_) {}
    }

    // Use provided language or session default
    const messageLanguage = (data.language || session.language) as Language;

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: messageText,
        language: messageLanguage
      }
    });

    // Process with Socratic engine (pass essay metadata if available)
    const response = await engine.processMessage({
      sessionId: session.id,
      userMessage: messageText,
      language: messageLanguage,
      conversationHistory: [...session.messages, userMessage],
      subject: session.subject,
      topic: session.topic ?? undefined,
      currentHintLevel: session.hintLevel,
      noFinalAnswer: data.noFinalAnswer ?? session.noFinalAnswer ?? false,
      // Essay prompt metadata from catalog
      essayType: session.essayType || session.essayPrompt?.promptType,
      wordLimit: session.wordLimit ?? session.essayPrompt?.wordLimit ?? undefined,
      essayPromptText: session.essayPromptText ?? session.essayPrompt?.promptText,
      essayCategory: session.essayPrompt?.promptCategory,
      schoolName: session.essayPrompt?.school?.name,
      // Counselor metadata (from stored session)
      clientContext: session.clientContext as Record<string, any> | undefined,
      variant: session.variant ?? undefined,
      clientUserId: session.clientUserId ?? undefined,
    });

    // Save assistant response (serialize metadata for Prisma Json)
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: response.message,
        language: response.language,
        metadata: JSON.parse(JSON.stringify(response.metadata))
      }
    });

    // Update session metrics
    // For essay mode, use readiness >= 85 as "resolved"; for STEM, distanceFromSolution < 15
    // For counselor, sessions don't auto-resolve — they end when the student is done
    const isEssay = session.subject === 'ESSAY_WRITING';
    const isCounseling = session.subject === 'COUNSELING';
    const isResolved = isCounseling
      ? false  // Counselor sessions don't auto-resolve
      : isEssay
        ? (response.metadata.questionType === 'celebration' && (response.metadata.readiness ?? 0) >= 85)
        : (response.metadata.questionType === 'celebration' && response.metadata.distanceFromSolution < 15);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        messageCount: { increment: 2 },
        hintLevel: response.metadata.hintLevel,
        topic: response.metadata.topic || session.topic || undefined,
        resolved: isResolved,
        status: isResolved ? 'COMPLETED' : 'ACTIVE',
        noFinalAnswer: data.noFinalAnswer ?? session.noFinalAnswer ?? false,
        conceptsUsed: {
          push: response.metadata.conceptsIdentified
        }
      }
    });

    // Award XP (fire-and-forget to avoid blocking response)
    const gamUserId = session.userId;
    const xpResults: Array<{ xpAwarded: number; newLevel: number; leveledUp: boolean }> = [];
    try {
      xpResults.push(await awardXP(gamUserId, 'MESSAGE_SENT', session.id));
      if (response.metadata.questionType === 'socratic' || response.metadata.questionType === 'celebration') {
        xpResults.push(await awardXP(gamUserId, 'SHOWED_WORK', session.id));
      }
    } catch (_) { /* gamification is non-critical */ }

    const totalXp = xpResults.reduce((s, r) => s + r.xpAwarded, 0);
    const leveledUp = xpResults.some((r) => r.leveledUp);

    res.json({
      success: true,
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        language: response.language,
        metadata: response.metadata,
        timestamp: assistantMessage.createdAt
      },
      gamification: totalXp > 0 ? { xpEarned: totalXp, leveledUp } : undefined,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tutor/session/:sessionId
 * Get session details and messages
 */
router.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        ...(req.apiKey ? { apiKeyId: req.apiKey.id } : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        subject: session.subject,
        language: session.language,
        status: session.status,
        hintLevel: session.hintLevel,
        resolved: session.resolved,
        startedAt: session.startedAt
      },
      messages: session.messages.map(m => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        language: m.language,
        metadata: m.metadata,
        timestamp: m.createdAt
      }))
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tutor/session/:sessionId/end
 * End a tutoring session and generate a structured session report
 */
router.post('/session/:sessionId/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    // Fetch session with all messages and essay prompt metadata
    // Scoped to the authenticated API key for multi-tenancy
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        ...(req.apiKey ? { apiKeyId: req.apiKey.id } : {}),
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        essayPrompt: {
          include: { school: { select: { name: true } } }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'COMPLETED') {
      // Already ended — return existing report
      return res.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          endedAt: session.endedAt
        },
        report: session.report || null
      });
    }

    // Generate session report via the engine (Haiku — cheap, one-time call)
    const report = await engine.generateSessionReport({
      sessionId: session.id,
      messages: session.messages.map(m => ({
        role: m.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
        content: m.content
      })),
      subject: session.subject,
      startedAt: session.startedAt,
      essayType: session.essayType || session.essayPrompt?.promptType,
      schoolName: session.essayPrompt?.school?.name,
      wordLimit: session.wordLimit ?? session.essayPrompt?.wordLimit ?? undefined,
    });

    // Calculate masteryGain heuristic
    const isEssay = session.subject === 'ESSAY_WRITING';
    let masteryGain: number | null = null;
    if (isEssay && report.readinessStart != null && report.readinessEnd != null) {
      masteryGain = Math.max(0, report.readinessEnd - report.readinessStart) / 100;
    } else if (!isEssay && session.hintLevel > 0) {
      // STEM: lower hint progression = better mastery (rough heuristic)
      masteryGain = Math.max(0, 1 - session.hintLevel / 5);
    }

    // Determine resolved status
    const isResolved = session.resolved || (isEssay
      ? (report.readinessEnd ?? 0) >= 80
      : (report.areasForImprovement.length === 0 && report.strengths.length > 0));

    // Update session with report and analytics
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        report: JSON.parse(JSON.stringify(report)),
        conceptsUsed: report.conceptsEngaged,
        masteryGain,
        resolved: isResolved,
      }
    });

    // Update mastery for engaged concepts (non-critical)
    try {
      const correct = (masteryGain ?? 0) > 0.3;
      for (const conceptName of report.conceptsEngaged) {
        const key = conceptName.toLowerCase().replace(/[\s/]+/g, '_').replace(/[^a-z0-9_]/g, '');
        await updateMastery(session.userId, key, correct).catch(() => {});
      }
      await generatePath(session.userId, session.subject).catch(() => {});
    } catch (_) { /* mastery tracking is non-critical */ }

    // Award gamification rewards (non-critical)
    let gamificationResult: any = undefined;
    try {
      const xpResult = await awardXP(session.userId, 'SESSION_COMPLETE', sessionId);
      const streakResult = await updateStreak(session.userId);
      const newBadges = await checkBadges(session.userId);
      gamificationResult = {
        xpEarned: xpResult.xpAwarded,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
        streak: streakResult.streak,
        newBadges,
      };
    } catch (_) { /* gamification is non-critical */ }

    res.json({
      success: true,
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        endedAt: updatedSession.endedAt,
        resolved: updatedSession.resolved,
        masteryGain: updatedSession.masteryGain,
        conceptsUsed: updatedSession.conceptsUsed
      },
      report,
      gamification: gamificationResult,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tutor/session/:sessionId/summary
 * Get the session report/summary (generated when the session ends)
 */
router.get('/session/:sessionId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        ...(req.apiKey ? { apiKeyId: req.apiKey.id } : {}),
      },
      select: {
        id: true,
        status: true,
        report: true,
        conceptsUsed: true,
        masteryGain: true,
        resolved: true,
        subject: true,
        startedAt: true,
        endedAt: true,
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (!session.report) {
      return res.status(404).json({
        success: false,
        error: 'No report available. The session may not have been ended yet.',
        session: {
          id: session.id,
          status: session.status
        }
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        subject: session.subject,
        status: session.status,
        resolved: session.resolved,
        masteryGain: session.masteryGain,
        conceptsUsed: session.conceptsUsed,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      },
      report: session.report
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tutor/session/:sessionId/quiz
 * Generate a short quiz based on the session report
 */
router.post('/session/:sessionId/quiz', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { count, language } = QuizRequestSchema.parse(req.body || {});

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        ...(req.apiKey ? { apiKeyId: req.apiKey.id } : {}),
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        essayPrompt: {
          include: { school: { select: { name: true } } }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const quizLanguage = (language || session.language) as Language;
    const existingReport = (session.report && typeof session.report === 'object' && !Array.isArray(session.report))
      ? (session.report as unknown as SessionReport)
      : null;
    const report = existingReport || await engine.generateSessionReport({
      sessionId: session.id,
      messages: session.messages.map(m => ({
        role: m.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
        content: m.content
      })),
      subject: session.subject,
      startedAt: session.startedAt,
      essayType: session.essayType || session.essayPrompt?.promptType,
      schoolName: session.essayPrompt?.school?.name,
      wordLimit: session.wordLimit ?? session.essayPrompt?.wordLimit ?? undefined,
    });

    const quiz = await engine.generateSessionQuiz({
      sessionId: session.id,
      subject: session.subject,
      language: quizLanguage,
      report,
      count,
    });

    res.json({ success: true, quiz });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tutor/sessions
 * Get all sessions for a user (with optional report data)
 */
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, subject, status, limit = '10' } = req.query;

    const sessions = await prisma.session.findMany({
      where: {
        ...(req.apiKey ? { apiKeyId: req.apiKey.id } : {}),
        ...(userId && { userId: userId as string }),
        ...(subject && { subject: subject as Subject }),
        ...(status && { status: status as any })
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        subject: s.subject,
        language: s.language,
        status: s.status,
        hintLevel: s.hintLevel,
        resolved: s.resolved,
        conceptsUsed: s.conceptsUsed,
        masteryGain: s.masteryGain,
        messageCount: s._count.messages,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        report: s.report || null
      }))
    });

  } catch (error) {
    next(error);
  }
});

export { router as tutorRouter };
