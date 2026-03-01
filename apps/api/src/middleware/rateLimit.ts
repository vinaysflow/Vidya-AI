/**
 * Rate Limiting Middleware
 * 
 * Per-API-key rate limiting using Redis-backed fixed-window counters.
 * Falls back to in-memory counters when Redis is unavailable.
 * 
 * Rate limits are determined by:
 * 1. The API key's configured `rateLimit` field (requests per minute)
 * 2. Fallback defaults based on the API key tier
 * 3. A global default for unauthenticated requests (dev mode only)
 * 
 * Fixed-window approach: counts requests in the current 60-second window.
 * Simpler and more efficient than sliding window, with Redis INCR + EXPIRE.
 */

import { Request, Response, NextFunction } from 'express';
import { cache } from '../services/cache';

// ============================================
// CONSTANTS
// ============================================

const WINDOW_SECONDS = 60; // 1-minute fixed window

// Default rate limit for unauthenticated requests (development only)
const DEFAULT_RATE_LIMIT = 60;

// Tier-based defaults
const TIER_RATE_LIMITS: Record<string, number> = {
  FREE: 100,
  STANDARD: 500,
  PREMIUM: 1000
};

// In-memory fallback store (used when Redis is unavailable)
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

// Periodic cleanup of stale memory entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.expiresAt) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================
// HELPERS
// ============================================

/**
 * Get the current fixed window key suffix.
 * Uses floor(epoch_seconds / WINDOW_SECONDS) so all requests in the same
 * 60-second window share the same counter.
 */
function windowKey(): string {
  return String(Math.floor(Date.now() / (WINDOW_SECONDS * 1000)));
}

/**
 * Increment and get count using Redis INCR + EXPIRE.
 * Falls back to in-memory on Redis failure.
 */
async function incrementCounter(key: string): Promise<number> {
  // Try Redis first (via the cache service's internal Redis instance)
  try {
    const currentStr = await cache.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const next = current + 1;
    // Set with TTL of 2 windows to handle edge cases
    await cache.set(key, String(next), WINDOW_SECONDS * 2);
    return next;
  } catch {
    // Fall through to in-memory
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (entry && now < entry.expiresAt) {
    entry.count += 1;
    return entry.count;
  }

  // New window
  memoryStore.set(key, {
    count: 1,
    expiresAt: now + WINDOW_SECONDS * 2 * 1000,
  });
  return 1;
}

// ============================================
// MIDDLEWARE
// ============================================

// Paid tiers that get soft limits (overage allowed and billed)
const SOFT_LIMIT_TIERS = new Set(['STANDARD', 'PREMIUM']);

/**
 * Express middleware for rate limiting.
 * Uses the API key ID if authenticated, falls back to IP address.
 *
 * FREE / unauthenticated: hard 429 when over limit.
 * STANDARD / PREMIUM: soft limit — request is allowed but flagged as overage
 * via `req.isOverage = true` so the usage tracker can record it.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  let limitKey: string;
  let maxRequests: number;
  let isSoftLimit = false;

  if (req.apiKey) {
    limitKey = `rl:key:${req.apiKey.id}`;
    maxRequests = req.apiKey.rateLimit || TIER_RATE_LIMITS[req.apiKey.tier] || DEFAULT_RATE_LIMIT;
    isSoftLimit = SOFT_LIMIT_TIERS.has(req.apiKey.tier);
  } else {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    limitKey = `rl:ip:${ip}`;
    maxRequests = DEFAULT_RATE_LIMIT;
  }

  const windowSuffix = windowKey();
  const counterKey = `${limitKey}:${windowSuffix}`;

  incrementCounter(counterKey)
    .then((count) => {
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count)));

      if (count > maxRequests) {
        if (isSoftLimit) {
          // Paid tier: allow the request but mark it as overage
          req.isOverage = true;
          res.set('X-RateLimit-Overage', 'true');
          return next();
        }

        // FREE / unauthenticated: hard block
        const retryAfterSec = WINDOW_SECONDS;
        res.set('Retry-After', String(retryAfterSec));

        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: retryAfterSec,
          limit: maxRequests,
          window: '1 minute'
        });
        return;
      }

      next();
    })
    .catch((error) => {
      console.error('[RateLimit] Counter error, failing open:', error);
      next();
    });
}
