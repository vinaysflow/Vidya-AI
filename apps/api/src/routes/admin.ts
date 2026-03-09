/**
 * Admin API Routes
 * 
 * Manages API keys for external integrations.
 * Protected by ADMIN_SECRET environment variable.
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { generateApiKey, hashApiKey } from '../middleware/auth';
import { getStripe } from '../services/stripe';

const router: express.Router = Router();
const prisma = new PrismaClient();

/**
 * Admin auth middleware - requires ADMIN_SECRET header
 */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    res.status(503).json({
      success: false,
      error: 'Admin API not configured. Set ADMIN_SECRET environment variable.'
    });
    return;
  }

  const providedSecret = req.headers['x-admin-secret'];

  if (providedSecret !== adminSecret) {
    res.status(403).json({
      success: false,
      error: 'Invalid admin credentials'
    });
    return;
  }

  next();
}

// Apply admin auth to all routes in this router
router.use(adminAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(100),
  tier: z.enum(['FREE', 'STANDARD', 'PREMIUM']).default('STANDARD'),
  rateLimit: z.number().int().positive().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional()
});

const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tier: z.enum(['FREE', 'STANDARD', 'PREMIUM']).optional(),
  rateLimit: z.number().int().positive().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/admin/keys
 * Create a new API key
 */
router.post('/keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateApiKeySchema.parse(req.body);
    const { plainKey, hashedKey, prefix } = generateApiKey();

    // Determine rate limit based on tier if not explicitly set
    const tierRateLimits = { FREE: 100, STANDARD: 500, PREMIUM: 1000 };
    const rateLimit = data.rateLimit || tierRateLimits[data.tier];

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        prefix,
        name: data.name,
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
        tier: data.tier,
        rateLimit,
        allowedOrigins: data.allowedOrigins || [],
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      }
    });

    // Return the plain key ONLY on creation - it cannot be retrieved later
    res.status(201).json({
      success: true,
      apiKey: {
        id: apiKey.id,
        key: plainKey, // Only time the plain key is returned
        prefix: apiKey.prefix,
        name: apiKey.name,
        ownerEmail: apiKey.ownerEmail,
        ownerName: apiKey.ownerName,
        tier: apiKey.tier,
        rateLimit: apiKey.rateLimit,
        allowedOrigins: apiKey.allowedOrigins,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      warning: 'Save this API key securely. It cannot be retrieved again.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/keys
 * List all API keys (without the actual key values)
 */
router.get('/keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.apiKey.findMany({
      select: {
        id: true,
        prefix: true,
        name: true,
        ownerEmail: true,
        ownerName: true,
        tier: true,
        rateLimit: true,
        allowedOrigins: true,
        stripeCustomerId: true,
        stripeSubscriptionItemId: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        totalRequests: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      keys
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/keys/:keyId
 * Update an API key's settings
 */
router.patch('/keys/:keyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;
    const data = UpdateApiKeySchema.parse(req.body);

    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tier !== undefined && { tier: data.tier }),
        ...(data.rateLimit !== undefined && { rateLimit: data.rateLimit }),
        ...(data.allowedOrigins !== undefined && { allowedOrigins: data.allowedOrigins }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
        })
      },
      select: {
        id: true,
        prefix: true,
        name: true,
        ownerEmail: true,
        tier: true,
        rateLimit: true,
        allowedOrigins: true,
        stripeCustomerId: true,
        stripeSubscriptionItemId: true,
        isActive: true,
        expiresAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      apiKey
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/keys/:keyId
 * Deactivate an API key (soft delete)
 */
router.delete('/keys/:keyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'API key deactivated'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STRIPE BILLING MANAGEMENT
// ============================================

const StripeAttachSchema = z.object({
  stripeCustomerId: z.string().min(1),
  stripeSubscriptionItemId: z.string().min(1).optional(),
});

/**
 * POST /api/admin/keys/:keyId/stripe-attach
 * Link a Stripe customer (and optional subscription item) to an API key.
 * The admin creates the Stripe customer + subscription externally
 * (Dashboard / CLI) and provides the IDs here. The stripeCustomerId is
 * used by the Billing Meters API to report overage usage.
 */
router.post('/keys/:keyId/stripe-attach', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;
    const data = StripeAttachSchema.parse(req.body);

    const existing = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    const stripe = getStripe();
    if (stripe) {
      try {
        await stripe.customers.retrieve(data.stripeCustomerId);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid stripeCustomerId — could not verify with Stripe',
        });
      }
    }

    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        stripeCustomerId: data.stripeCustomerId,
        ...(data.stripeSubscriptionItemId !== undefined && {
          stripeSubscriptionItemId: data.stripeSubscriptionItemId,
        }),
      },
      select: {
        id: true,
        name: true,
        tier: true,
        stripeCustomerId: true,
        stripeSubscriptionItemId: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, apiKey });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/keys/:keyId/stripe-detach
 * Remove Stripe billing linkage from an API key.
 */
router.post('/keys/:keyId/stripe-detach', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;

    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        stripeCustomerId: null,
        stripeSubscriptionItemId: null,
      },
      select: {
        id: true,
        name: true,
        tier: true,
        stripeCustomerId: true,
        stripeSubscriptionItemId: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, apiKey, message: 'Stripe billing detached' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// KPI REPORTING
// ============================================

const KpiQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  subject: z.string().optional(),
  grade: z.coerce.number().int().optional(),
});

/**
 * GET /api/admin/kpis
 * Returns aggregated KPIs from existing Session/Progress/XPEvent/UserGamification tables.
 * All queries are read-only and use no new schema fields.
 */
router.get('/kpis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = KpiQuerySchema.parse(req.query);
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    const sessionWhere: Record<string, unknown> = {
      startedAt: { gte: dateFrom, lte: dateTo },
      ...(query.subject ? { subject: query.subject } : {}),
    };

    // Engagement
    const [totalSessions, completedSessions, sessions] = await Promise.all([
      prisma.session.count({ where: sessionWhere }),
      prisma.session.count({ where: { ...sessionWhere, status: 'COMPLETED' } }),
      prisma.session.findMany({
        where: sessionWhere,
        select: {
          userId: true,
          startedAt: true,
          endedAt: true,
          report: true,
          masteryGain: true,
          hintLevel: true,
          maxHintLevel: true,
          effectiveGrade: true,
          resolved: true,
          user: { select: { grade: true } },
        },
      }),
    ]);

    // Session durations (from report JSON)
    const durations: number[] = sessions
      .map((s) => {
        const r = s.report as Record<string, unknown> | null;
        return typeof r?.durationMinutes === 'number' ? r.durationMinutes : null;
      })
      .filter((d): d is number => d !== null);
    durations.sort((a, b) => a - b);
    const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : null;

    // Sessions per user per week
    const userSessionCounts: Record<string, number> = {};
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const s of sessions) {
      if (s.startedAt >= sevenDaysAgo) {
        userSessionCounts[s.userId] = (userSessionCounts[s.userId] ?? 0) + 1;
      }
    }
    const sessionsPerUserPerWeekValues = Object.values(userSessionCounts);
    const medianSessionsPerWeek = sessionsPerUserPerWeekValues.length > 0
      ? sessionsPerUserPerWeekValues.sort((a, b) => a - b)[Math.floor(sessionsPerUserPerWeekValues.length / 2)]
      : 0;
    const resolvedCount = sessions.filter((s) => s.resolved).length;

    // Learning
    const masteryGains = sessions
      .map((s) => s.masteryGain)
      .filter((g): g is number => g !== null);
    masteryGains.sort((a, b) => a - b);
    const medianMasteryGain = masteryGains.length > 0 ? masteryGains[Math.floor(masteryGains.length / 2)] : null;

    const hintDist: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const s of sessions) {
      const h = String(Math.min(5, Math.max(0, (s.maxHintLevel ?? s.hintLevel) as number)));
      hintDist[h] = (hintDist[h] ?? 0) + 1;
    }

    const gradeUpSessions = sessions.filter((s) => {
      const base = (s.user as { grade?: number | null } | null)?.grade;
      return base != null && s.effectiveGrade != null && s.effectiveGrade > base;
    }).length;

    // Gamification
    const [xpEvents, gamificationProfiles, badgeCount] = await Promise.all([
      prisma.xPEvent.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        select: { sessionId: true, xpAmount: true },
      }),
      prisma.userGamification.findMany({
        select: { level: true, currentStreak: true },
      }),
      prisma.userBadge.count({
        where: { earnedAt: { gte: dateFrom, lte: dateTo } },
      }),
    ]);

    const xpBySession: Record<string, number> = {};
    for (const e of xpEvents) {
      if (e.sessionId) {
        xpBySession[e.sessionId] = (xpBySession[e.sessionId] ?? 0) + e.xpAmount;
      }
    }
    const xpValues = Object.values(xpBySession).sort((a, b) => a - b);
    const medianXpPerSession = xpValues.length > 0 ? xpValues[Math.floor(xpValues.length / 2)] : 0;

    const levelDist: Record<number, number> = {};
    let streakSum = 0;
    for (const g of gamificationProfiles) {
      levelDist[g.level] = (levelDist[g.level] ?? 0) + 1;
      streakSum += g.currentStreak;
    }
    const avgStreak = gamificationProfiles.length > 0
      ? Math.round((streakSum / gamificationProfiles.length) * 10) / 10
      : 0;

    // Safety: messages where safetyEvents array is non-empty
    const safetyMessages = await prisma.message.count({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        role: 'ASSISTANT',
        NOT: { metadata: { equals: null } },
      },
    }).then(async () => {
      // Postgres JSON array filter — count messages with non-empty safetyEvents
      const raw = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int AS count FROM "Message"
        WHERE "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo}
          AND role = 'ASSISTANT'
          AND metadata IS NOT NULL
          AND jsonb_array_length(COALESCE((metadata->>'safetyEvents')::jsonb, '[]'::jsonb)) > 0
      `;
      return Number(raw[0]?.count ?? 0);
    });

    // Dogfood KPIs from AnalyticsEvent
    const [questStartedCount, questCompletedCount, explainBackCount, diagnosticEvents] = await Promise.all([
      prisma.analyticsEvent.count({ where: { event: 'quest_started', createdAt: { gte: dateFrom, lte: dateTo } } }),
      prisma.analyticsEvent.count({ where: { event: 'quest_completed', createdAt: { gte: dateFrom, lte: dateTo } } }),
      prisma.analyticsEvent.count({ where: { event: 'explain_back_attempted', createdAt: { gte: dateFrom, lte: dateTo } } }),
      prisma.analyticsEvent.findMany({
        where: { event: 'quest_started', createdAt: { gte: dateFrom, lte: dateTo } },
        select: { userId: true, createdAt: true, properties: true },
      }),
    ]);

    // Subject diversity: count distinct subjects per user
    const subjectsByUser: Record<string, Set<string>> = {};
    for (const e of diagnosticEvents) {
      const p = e.properties as Record<string, unknown>;
      if (p.subject && typeof p.subject === 'string') {
        if (!subjectsByUser[e.userId]) subjectsByUser[e.userId] = new Set();
        subjectsByUser[e.userId].add(p.subject);
      }
    }
    const diversityCounts = Object.values(subjectsByUser).map((s) => s.size);
    const avgSubjectDiversity = diversityCounts.length > 0
      ? Math.round((diversityCounts.reduce((a, b) => a + b, 0) / diversityCounts.length) * 10) / 10
      : 0;

    // D1 return rate: users with quest_started on day 0 AND day 1
    const userFirstSession: Record<string, Date> = {};
    const userDays: Record<string, Set<number>> = {};
    for (const e of diagnosticEvents) {
      const day = Math.floor(e.createdAt.getTime() / (24 * 60 * 60 * 1000));
      if (!userFirstSession[e.userId] || e.createdAt < userFirstSession[e.userId]) {
        userFirstSession[e.userId] = e.createdAt;
      }
      if (!userDays[e.userId]) userDays[e.userId] = new Set();
      userDays[e.userId].add(day);
    }
    const usersWithAnySession = Object.keys(userDays).length;
    const usersD1 = Object.entries(userDays).filter(([, days]) => {
      const sorted = Array.from(days).sort((a, b) => a - b);
      return sorted.length >= 2 && sorted[1] - sorted[0] === 1;
    }).length;
    const d1ReturnRate = usersWithAnySession > 0 ? Math.round((usersD1 / usersWithAnySession) * 100) : 0;

    res.json({
      success: true,
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      engagement: {
        totalSessions,
        completedSessions,
        resolvedCount,
        resolvedRate: totalSessions > 0 ? Math.round((resolvedCount / totalSessions) * 100) / 100 : 0,
        medianDurationMinutes: medianDuration,
        medianSessionsPerUserPerWeek: medianSessionsPerWeek,
        activeUsersLast7Days: Object.keys(userSessionCounts).length,
      },
      learning: {
        medianMasteryGain,
        hintLevelDistribution: hintDist,
        gradeUpSessions,
      },
      gamification: {
        medianXpPerSession,
        levelDistribution: levelDist,
        newBadgesAwarded: badgeCount,
        avgCurrentStreak: avgStreak,
      },
      safety: {
        messagesWithSafetyEvents: safetyMessages,
      },
      dogfood: {
        sessionCompletionRate: questStartedCount > 0 ? Math.round((questCompletedCount / questStartedCount) * 100) : null,
        explainBackAttemptRate: questCompletedCount > 0 ? Math.round((explainBackCount / questCompletedCount) * 100) : null,
        avgSubjectDiversityPerUser: avgSubjectDiversity,
        d1ReturnRatePct: d1ReturnRate,
        questStarted: questStartedCount,
        questCompleted: questCompletedCount,
        explainBackAttempts: explainBackCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/retention', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        createdAt: true,
        grade: true,
        sessions: {
          select: { startedAt: true, status: true, resolved: true },
          orderBy: { startedAt: 'asc' },
        },
      },
      where: { id: { not: 'anonymous' } },
    });

    const now = new Date();
    const cohorts: Record<string, { d1: number; d7: number; d14: number; d30: number; total: number }> = {};

    for (const user of users) {
      if (user.sessions.length === 0) continue;
      const firstSession = user.sessions[0].startedAt;
      const cohortWeek = firstSession.toISOString().slice(0, 10);

      if (!cohorts[cohortWeek]) cohorts[cohortWeek] = { d1: 0, d7: 0, d14: 0, d30: 0, total: 0 };
      cohorts[cohortWeek].total++;

      const daysSinceFirst = (now.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24);
      const sessionDates = new Set(user.sessions.map(s => s.startedAt.toISOString().slice(0, 10)));
      const firstDate = firstSession.getTime();

      const hasActivityOnDay = (day: number) => {
        const target = new Date(firstDate + day * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return sessionDates.has(target);
      };

      if (daysSinceFirst >= 1 && hasActivityOnDay(1)) cohorts[cohortWeek].d1++;
      if (daysSinceFirst >= 7 && hasActivityOnDay(7)) cohorts[cohortWeek].d7++;
      if (daysSinceFirst >= 14 && hasActivityOnDay(14)) cohorts[cohortWeek].d14++;
      if (daysSinceFirst >= 30 && hasActivityOnDay(30)) cohorts[cohortWeek].d30++;
    }

    const perUser = users
      .filter(u => u.sessions.length > 0)
      .map(u => ({
        userId: u.id,
        grade: u.grade,
        totalSessions: u.sessions.length,
        firstSession: u.sessions[0].startedAt,
        lastSession: u.sessions[u.sessions.length - 1].startedAt,
        completedSessions: u.sessions.filter(s => s.status === 'COMPLETED').length,
      }));

    res.json({ success: true, cohorts, perUser, totalUsers: users.length });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };
