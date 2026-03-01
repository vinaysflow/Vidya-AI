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

export { router as adminRouter };
