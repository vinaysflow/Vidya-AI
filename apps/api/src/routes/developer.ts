/**
 * Developer API Routes
 * 
 * Self-service endpoints for API key owners to check their status,
 * view usage analytics, and get quick summaries.
 * 
 * All endpoints require a valid API key via Bearer token.
 * Data is scoped to the authenticated key — a client can only see its own data.
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { listModules } from '../services/socratic/registry';

const router: Router = Router();
const prisma = new PrismaClient();

// ============================================
// GET /api/developer/status
// Returns the authenticated key's configuration and status
// ============================================

router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide a valid API key.'
      });
    }

    // Fetch full key details from DB
    const key = await prisma.apiKey.findUnique({
      where: { id: req.apiKey.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        ownerEmail: true,
        ownerName: true,
        tier: true,
        rateLimit: true,
        allowedOrigins: true,
        stripeCustomerId: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        totalRequests: true,
        createdAt: true,
        _count: {
          select: { sessions: true }
        }
      }
    });

    if (!key) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    // Get available modules
    const modules = listModules();

    res.json({
      success: true,
      key: {
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        owner: {
          email: key.ownerEmail,
          name: key.ownerName,
        },
        tier: key.tier,
        rateLimit: key.rateLimit,
        allowedOrigins: key.allowedOrigins,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        totalRequests: key.totalRequests,
        totalSessions: key._count.sessions,
        billingEnabled: !!key.stripeCustomerId,
        createdAt: key.createdAt,
      },
      platform: {
        availableModules: modules,
        apiVersion: '1.0.0',
      }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/developer/usage
// Returns daily usage breakdown for the authenticated key
// ============================================

router.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const { days = '30', endpoint } = req.query;
    const daysNum = Math.min(parseInt(days as string, 10) || 30, 90);

    // Calculate the start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    const startDateStr = startDate.toISOString().split('T')[0];

    const records = await prisma.usageRecord.findMany({
      where: {
        apiKeyId: req.apiKey.id,
        date: { gte: startDateStr },
        ...(endpoint ? { endpoint: endpoint as string } : {}),
      },
      orderBy: [{ date: 'desc' }, { endpoint: 'asc' }],
    });

    const dailyTotals: Record<string, { requests: number; errors: number; overage: number; endpoints: Record<string, number> }> = {};

    for (const record of records) {
      if (!dailyTotals[record.date]) {
        dailyTotals[record.date] = { requests: 0, errors: 0, overage: 0, endpoints: {} };
      }
      dailyTotals[record.date].requests += record.requestCount;
      dailyTotals[record.date].errors += record.errorCount;
      dailyTotals[record.date].overage += record.overageCount;
      dailyTotals[record.date].endpoints[record.endpoint] =
        (dailyTotals[record.date].endpoints[record.endpoint] || 0) + record.requestCount;
    }

    res.json({
      success: true,
      apiKeyId: req.apiKey.id,
      period: { days: daysNum, from: startDateStr },
      daily: Object.entries(dailyTotals).map(([date, data]) => ({
        date,
        totalRequests: data.requests,
        totalErrors: data.errors,
        totalOverage: data.overage,
        endpoints: data.endpoints,
      })),
      rawRecords: records.length,
    });

  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/developer/usage/summary
// Returns a quick usage summary for the authenticated key
// ============================================

router.get('/usage/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const [todayRecords, weekRecords, monthRecords, topEndpoints, sessionCount] = await Promise.all([
      prisma.usageRecord.aggregate({
        where: { apiKeyId: req.apiKey.id, date: today },
        _sum: { requestCount: true, errorCount: true, overageCount: true },
      }),
      prisma.usageRecord.aggregate({
        where: { apiKeyId: req.apiKey.id, date: { gte: weekAgoStr } },
        _sum: { requestCount: true, errorCount: true, overageCount: true },
      }),
      prisma.usageRecord.aggregate({
        where: { apiKeyId: req.apiKey.id, date: { gte: monthAgoStr } },
        _sum: { requestCount: true, errorCount: true, overageCount: true },
      }),
      prisma.usageRecord.groupBy({
        by: ['endpoint'],
        where: { apiKeyId: req.apiKey.id, date: { gte: monthAgoStr } },
        _sum: { requestCount: true },
        orderBy: { _sum: { requestCount: 'desc' } },
        take: 10,
      }),
      prisma.session.count({
        where: { apiKeyId: req.apiKey.id },
      }),
    ]);

    res.json({
      success: true,
      apiKeyId: req.apiKey.id,
      summary: {
        today: {
          requests: todayRecords._sum.requestCount || 0,
          errors: todayRecords._sum.errorCount || 0,
          overage: todayRecords._sum.overageCount || 0,
        },
        thisWeek: {
          requests: weekRecords._sum.requestCount || 0,
          errors: weekRecords._sum.errorCount || 0,
          overage: weekRecords._sum.overageCount || 0,
        },
        thisMonth: {
          requests: monthRecords._sum.requestCount || 0,
          errors: monthRecords._sum.errorCount || 0,
          overage: monthRecords._sum.overageCount || 0,
        },
        totalSessions: sessionCount,
        topEndpoints: topEndpoints.map(e => ({
          endpoint: e.endpoint,
          requests: e._sum.requestCount || 0,
        })),
      }
    });

  } catch (error) {
    next(error);
  }
});

export { router as developerRouter };
