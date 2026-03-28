/**
 * Shared test utilities for the Vidya API.
 *
 * Conventions:
 *  - vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma() }))
 *  - All stubs use vi.fn() and are cleared in beforeEach
 *  - Never import these in production code
 */

import { vi } from 'vitest';

// ── PrismaClient mock ─────────────────────────────────────────────────────────
/**
 * Returns a deep mock of the PrismaClient singleton.
 * Use in vi.mock() factory functions:
 *
 * @example
 *   vi.mock('../../lib/prisma', () => ({ prisma: buildPrismaMock() }));
 */
export function buildPrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    progress: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    concept: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    message: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    xPEvent: { deleteMany: vi.fn(), createMany: vi.fn() },
    userBadge: { deleteMany: vi.fn(), upsert: vi.fn() },
    userGamification: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    learningPath: { deleteMany: vi.fn(), upsert: vi.fn(), findFirst: vi.fn() },
    analyticsEvent: { create: vi.fn() },
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
    $disconnect: vi.fn(),
  };
}

// ── Minimal Express test helper ───────────────────────────────────────────────
/**
 * Makes an HTTP request against an Express app instance (no supertest required).
 * Returns { status, body }.
 */
export async function makeRequest(
  app: any,
  method: string,
  path: string,
  body?: object,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const http = require('http') as typeof import('http');
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const reqBody = body ? JSON.stringify(body) : undefined;
      const options: import('http').RequestOptions = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody).toString() } : {}),
          ...headers,
        },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode ?? 500, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode ?? 500, body: data });
          }
        });
      });
      req.on('error', (err) => {
        server.close();
        resolve({ status: 500, body: { error: err.message } });
      });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}
