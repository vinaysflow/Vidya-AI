/**
 * Cache Service
 * 
 * Provides a thin abstraction over Redis (via ioredis) with an in-memory
 * Map fallback for environments without Redis. This makes the cache layer
 * modular: works in production with Redis and degrades gracefully in
 * local dev or single-instance deployments.
 * 
 * Key patterns:
 *   analysis:{contentHash}       - Essay analysis results (10 min TTL)
 *   summary:{sessionId}:{count}  - Session history summaries (1 hour TTL)
 *   prompt:{schoolSlug}:{year}   - Prompt catalog lookups (24 hour TTL)
 *   school:{schoolSlug}          - School data (24 hour TTL)
 */

import { createHash } from 'crypto';
import Redis from 'ioredis';

// ============================================
// TYPES
// ============================================

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

// ============================================
// CACHE SERVICE
// ============================================

export class CacheService {
  private redis: Redis | null = null;
  private memoryFallback: Map<string, MemoryEntry> = new Map();
  private isConnected = false;

  /**
   * Connect to Redis if REDIS_URL is set, otherwise use in-memory fallback.
   * Call this once at server startup.
   */
  connect(): void {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.log('[Cache] No REDIS_URL set — using in-memory fallback (single-instance only)');
      this.isConnected = true;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 200, 2000);
        },
        lazyConnect: false,
      });

      this.redis.on('connect', () => {
        console.log('[Cache] Connected to Redis');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.warn('[Cache] Redis error, falling back to in-memory:', err.message);
        // Don't crash — degrade gracefully
      });

      this.redis.on('close', () => {
        console.log('[Cache] Redis connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      console.warn('[Cache] Failed to initialize Redis, using in-memory fallback:', error);
      this.redis = null;
      this.isConnected = true;
    }
  }

  /**
   * Get a cached value by key.
   * Returns null if the key doesn't exist or has expired.
   */
  async get(key: string): Promise<string | null> {
    // Try Redis first
    if (this.redis) {
      try {
        return await this.redis.get(key);
      } catch {
        // Fall through to memory
      }
    }

    // In-memory fallback
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a cached value with a TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, value);
        return;
      } catch {
        // Fall through to memory
      }
    }

    // In-memory fallback
    this.memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a cached key.
   */
  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // Fall through to memory
      }
    }

    this.memoryFallback.delete(key);
  }

  /**
   * Get a JSON value from cache, parsing it automatically.
   * Returns null if the key doesn't exist, has expired, or fails to parse.
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set a JSON value in cache, stringifying it automatically.
   */
  async setJSON<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Disconnect from Redis. Call on server shutdown.
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.memoryFallback.clear();
    this.isConnected = false;
  }

  /**
   * Check if the cache service is operational.
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// ============================================
// HASHING UTILITIES
// ============================================

/**
 * Compute a SHA-256 hash of normalized content for use as a cache key.
 * Normalizes by: lowercasing, collapsing whitespace, stripping punctuation.
 * 
 * Two essays that differ only by capitalization or extra spaces produce
 * the same hash. A typo fix produces a different hash (correct behavior —
 * a typo fix could change readability scoring).
 */
export function contentHash(content: string): string {
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

// ============================================
// CACHE TTL CONSTANTS
// ============================================

export const CACHE_TTL = {
  /** Essay analysis result cache: 10 minutes */
  ESSAY_ANALYSIS: 10 * 60,
  /** Session summary cache: 1 hour */
  SESSION_SUMMARY: 60 * 60,
  /** Prompt catalog lookup: 24 hours */
  PROMPT_CATALOG: 24 * 60 * 60,
  /** School data: 24 hours */
  SCHOOL_DATA: 24 * 60 * 60,
} as const;

// ============================================
// SINGLETON EXPORT
// ============================================

export const cache = new CacheService();
