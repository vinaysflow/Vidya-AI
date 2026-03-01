/**
 * API Key Authentication Middleware
 * 
 * Validates API keys for external integrations (e.g., PathWiz).
 * Keys are passed via the Authorization header: `Bearer vk_live_xxxxx`
 * 
 * The /health endpoint is always public.
 * In development mode, requests without an API key are allowed for local testing.
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ApiKeyTier } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Extend Express Request to include API key context
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        name: string;
        ownerEmail: string;
        tier: ApiKeyTier;
        rateLimit: number;
        allowedOrigins: string[];
      };
      isOverage?: boolean;
    }
  }
}

/**
 * Hash an API key for secure storage/lookup.
 * We store hashed keys in the database, never plaintext.
 */
export function hashApiKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

/**
 * Generate a new API key with a recognizable prefix.
 * Format: vk_live_<32 random hex chars>
 */
export function generateApiKey(): { plainKey: string; hashedKey: string; prefix: string } {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const plainKey = `vk_live_${randomPart}`;
  const hashedKey = hashApiKey(plainKey);
  const prefix = plainKey.substring(0, 12); // "vk_live_xxxx"
  return { plainKey, hashedKey, prefix };
}

/**
 * Express middleware that validates API key authentication.
 * 
 * Behavior:
 * - Public routes (like /health) skip auth
 * - In development, missing keys are allowed with a warning
 * - In production, a valid API key is required for all /api/* routes
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip auth for health check and root
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const authHeader = req.headers.authorization;

  // No auth header provided
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In development, allow unauthenticated requests for local testing
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Provide an API key via Authorization: Bearer <key>'
    });
    return;
  }

  const plainKey = authHeader.replace('Bearer ', '').trim();

  if (!plainKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key format'
    });
    return;
  }

  try {
    const hashedKey = hashApiKey(plainKey);

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey }
    });

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
      return;
    }

    // Check if key is active
    if (!apiKey.isActive) {
      res.status(403).json({
        success: false,
        error: 'API key has been deactivated'
      });
      return;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      res.status(403).json({
        success: false,
        error: 'API key has expired'
      });
      return;
    }

    // Check CORS origin if allowedOrigins is configured
    const origin = req.headers.origin;
    if (apiKey.allowedOrigins.length > 0 && origin) {
      if (!apiKey.allowedOrigins.includes(origin) && !apiKey.allowedOrigins.includes('*')) {
        res.status(403).json({
          success: false,
          error: 'Origin not allowed for this API key'
        });
        return;
      }
    }

    // Attach API key context to request
    req.apiKey = {
      id: apiKey.id,
      name: apiKey.name,
      ownerEmail: apiKey.ownerEmail,
      tier: apiKey.tier,
      rateLimit: apiKey.rateLimit,
      allowedOrigins: apiKey.allowedOrigins
    };

    // Update last used timestamp (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 }
      }
    }).catch(err => console.error('Failed to update API key usage:', err));

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
}
