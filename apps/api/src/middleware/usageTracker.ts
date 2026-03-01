/**
 * Usage Tracker Middleware
 * 
 * Lightweight request counting middleware that tracks per-API-key,
 * per-endpoint, per-day usage. Uses an in-memory buffer that flushes
 * to the database every 30 seconds for performance.
 * 
 * The buffer aggregates counts so a burst of 100 requests results in
 * a single DB upsert (requestCount += 100), not 100 separate writes.
 * 
 * Schema: UsageRecord { apiKeyId, date, endpoint, requestCount, tokenEstimate, errorCount, overageCount }
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// BUFFER
// ============================================

interface BufferEntry {
  requestCount: number;
  errorCount: number;
  overageCount: number;
}

/**
 * In-memory buffer: "apiKeyId|date|endpoint" → { requestCount, errorCount }
 * Flushed to DB every FLUSH_INTERVAL_MS.
 */
const buffer = new Map<string, BufferEntry>();

const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Build a composite key for the buffer.
 */
function bufferKey(apiKeyId: string, date: string, endpoint: string): string {
  return `${apiKeyId}|${date}|${endpoint}`;
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize the request path to a canonical endpoint.
 * Strips dynamic segments like session IDs: /session/abc123/end → /session/:id/end
 */
function normalizeEndpoint(path: string): string {
  // Remove the /api prefix for cleaner keys
  let normalized = path.replace(/^\/api/, '');

  // Replace CUID-like IDs (25 chars, lowercase alphanumeric)
  normalized = normalized.replace(/\/[a-z0-9]{20,30}/g, '/:id');

  // Replace UUID-like segments
  normalized = normalized.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');

  return normalized || '/';
}

// ============================================
// FLUSH TO DATABASE
// ============================================

async function flushBuffer(): Promise<void> {
  if (buffer.size === 0) return;

  // Snapshot and clear
  const entries = [...buffer.entries()];
  buffer.clear();

  // Batch upserts
  const upserts = entries.map(([key, entry]) => {
    const [apiKeyId, date, endpoint] = key.split('|');
    return prisma.usageRecord.upsert({
      where: {
        apiKeyId_date_endpoint: { apiKeyId, date, endpoint }
      },
      update: {
        requestCount: { increment: entry.requestCount },
        errorCount: { increment: entry.errorCount },
        overageCount: { increment: entry.overageCount },
      },
      create: {
        apiKeyId,
        date,
        endpoint,
        requestCount: entry.requestCount,
        errorCount: entry.errorCount,
        overageCount: entry.overageCount,
      }
    });
  });

  try {
    await Promise.all(upserts);
  } catch (error) {
    console.error('[UsageTracker] Flush error:', error);
    // Re-add failed entries back to buffer (best effort)
    for (const [key, entry] of entries) {
      const existing = buffer.get(key);
      if (existing) {
        existing.requestCount += entry.requestCount;
        existing.errorCount += entry.errorCount;
        existing.overageCount += entry.overageCount;
      } else {
        buffer.set(key, { ...entry });
      }
    }
  }
}

// Start periodic flush
const flushInterval = setInterval(flushBuffer, FLUSH_INTERVAL_MS);

// Clean shutdown support
process.on('SIGTERM', async () => {
  clearInterval(flushInterval);
  await flushBuffer();
});

process.on('SIGINT', async () => {
  clearInterval(flushInterval);
  await flushBuffer();
});

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Express middleware that tracks API usage per key, endpoint, and day.
 * Only tracks authenticated requests (skips if no req.apiKey).
 */
export function usageTracker(req: Request, res: Response, next: NextFunction): void {
  // Only track authenticated requests
  if (!req.apiKey) {
    return next();
  }

  const apiKeyId = req.apiKey.id;
  const date = todayDate();
  const endpoint = normalizeEndpoint(req.path);
  const key = bufferKey(apiKeyId, date, endpoint);

  const isOverage = req.isOverage === true;

  const entry = buffer.get(key);
  if (entry) {
    entry.requestCount += 1;
    if (isOverage) entry.overageCount += 1;
  } else {
    buffer.set(key, { requestCount: 1, errorCount: 0, overageCount: isOverage ? 1 : 0 });
  }

  // Track errors on response finish
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const entry = buffer.get(key);
      if (entry) {
        entry.errorCount += 1;
      }
    }
  });

  next();
}
