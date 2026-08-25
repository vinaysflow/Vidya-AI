/**
 * learner-maintenance.ts
 *
 * Operational tooling for the learner model. Runs against whatever DATABASE_URL
 * is configured (local .env or, in prod, the deployed env).
 *
 * Commands:
 *   sync-catalog   Promote QuestionTemplate.misconceptions + Concept.misconceptionsData
 *                  into the queryable Misconception catalog.
 *   backfill       Replay historical Message.metadata into LearnerEvent rows (idempotent
 *                  per session), infer misconceptions, then run the trait/buddy rollup.
 *                  This warms the model from existing sessions so it isn't cold-start empty.
 *   rollup-all     Recompute LearnerTraits + BuddyState for every user that has events.
 *
 * Usage:
 *   npx tsx scripts/learner-maintenance.ts <command>
 */

import type { LearnerEventKind, Subject } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { syncMisconceptionCatalog } from '../src/services/learner/misconceptionTracker';
import {
  inferMisconceptionForTurn,
  applyCorrectTowardResolution,
} from '../src/services/learner/misconceptionTracker';
import { rollupLearnerModel } from '../src/services/learner/learnerTraits';
import { syncBuddyFromSession } from '../src/services/learner/buddyState';

const CORRECT_TYPES = new Set(['celebration', 'celebrate_then_explain_back']);

interface MetaLike {
  questionType?: string;
  hintLevel?: number;
  distanceFromSolution?: number;
  analysisResult?: {
    errorType?: string | null;
    errorDescription?: string | null;
    distanceFromSolution?: number;
  } | null;
}

async function syncCatalog() {
  const n = await syncMisconceptionCatalog('MATHEMATICS');
  console.log(`sync-catalog: upserted ${n} misconception catalog rows`);
}

async function backfill() {
  // Ensure the catalog exists so misconception inference can match.
  await syncCatalog();

  const sessions = await prisma.session.findMany({
    where: { userId: { not: 'anonymous' } },
    include: { messages: { orderBy: { createdAt: 'asc' } }, user: { select: { grade: true } } },
    orderBy: { startedAt: 'asc' },
  });

  let eventsWritten = 0;
  let sessionsProcessed = 0;
  let sessionsSkipped = 0;
  const usersTouched = new Set<string>();

  for (const session of sessions) {
    // Idempotency: skip sessions that already have backfilled events.
    const existing = await prisma.learnerEvent.count({ where: { sessionId: session.id } });
    if (existing > 0) { sessionsSkipped++; continue; }

    const conceptKey = (session as any).conceptKey ?? null;
    const subject = session.subject as Subject;
    let prevHintLevel = 0;
    let lastUserAt: number | null = null;
    const rows: Array<{
      kind: LearnerEventKind; correct: boolean | null; distance: number | null;
      errorType: string | null; errorDescription: string | null; hintLevel: number | null;
      latencyMs: number | null; ts: Date; payload?: any;
    }> = [];

    for (const m of session.messages) {
      if (m.role === 'USER') { lastUserAt = m.createdAt.getTime(); continue; }
      if (m.role !== 'ASSISTANT') continue;
      const meta = (m.metadata as MetaLike | null) ?? null;
      if (!meta?.questionType) continue;

      const correct = CORRECT_TYPES.has(meta.questionType);
      const hintLevel = meta.hintLevel ?? 0;
      const distance = meta.distanceFromSolution ?? meta.analysisResult?.distanceFromSolution ?? null;
      const errorType = meta.analysisResult?.errorType ?? null;
      const errorDescription = meta.analysisResult?.errorDescription ?? null;
      const latencyMs = lastUserAt ? Math.max(0, m.createdAt.getTime() - lastUserAt) : null;

      rows.push({ kind: 'ATTEMPT', correct, distance, errorType, errorDescription, hintLevel, latencyMs, ts: m.createdAt });
      if (hintLevel > prevHintLevel) {
        rows.push({ kind: 'HINT_ESCALATED', correct: null, distance: null, errorType: null, errorDescription: null, hintLevel, latencyMs: null, ts: m.createdAt, payload: { from: prevHintLevel, to: hintLevel } });
      }
      if (meta.questionType === 'celebrate_then_explain_back') {
        rows.push({ kind: 'EXPLAIN_BACK', correct: true, distance: null, errorType: null, errorDescription: null, hintLevel, latencyMs: null, ts: m.createdAt });
      }
      if (correct) {
        rows.push({ kind: 'BREAKTHROUGH', correct: true, distance, errorType: null, errorDescription: null, hintLevel, latencyMs: null, ts: m.createdAt });
      }
      prevHintLevel = hintLevel;

      // Misconception ledger: infer on wrong turns, advance toward resolution on correct.
      try {
        if (!correct && (errorType || errorDescription)) {
          await inferMisconceptionForTurn({ userId: session.userId, conceptKey, subject, errorType, errorDescription });
        } else if (correct) {
          await applyCorrectTowardResolution(session.userId, conceptKey, subject);
        }
      } catch { /* non-critical */ }
    }

    if (rows.length > 0) {
      await prisma.learnerEvent.createMany({
        data: rows.map((r) => ({
          userId: session.userId,
          sessionId: session.id,
          conceptKey,
          kind: r.kind,
          correct: r.correct,
          distanceFromSolution: r.distance,
          errorType: r.errorType,
          errorDescription: r.errorDescription,
          hintLevel: r.hintLevel,
          latencyMs: r.latencyMs,
          ts: r.ts,
          payload: r.payload,
        })),
      });
      eventsWritten += rows.length;
      usersTouched.add(session.userId);
    }
    sessionsProcessed++;
  }

  console.log(`backfill: ${eventsWritten} events across ${sessionsProcessed} sessions (${sessionsSkipped} already had events)`);

  // Roll up traits + buddy for every user we touched.
  for (const userId of usersTouched) {
    await rollupLearnerModel(userId).catch(() => {});
    await syncBuddyFromSession(userId).catch(() => {});
  }
  console.log(`backfill: rolled up traits + buddy for ${usersTouched.size} users`);
}

async function rollupAll() {
  const grouped = await prisma.learnerEvent.groupBy({ by: ['userId'] });
  for (const g of grouped) {
    await rollupLearnerModel(g.userId).catch(() => {});
    await syncBuddyFromSession(g.userId).catch(() => {});
  }
  console.log(`rollup-all: ${grouped.length} users`);
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'sync-catalog': await syncCatalog(); break;
    case 'backfill': await backfill(); break;
    case 'rollup-all': await rollupAll(); break;
    default:
      console.error('Usage: tsx scripts/learner-maintenance.ts <sync-catalog|backfill|rollup-all>');
      process.exit(1);
  }
}

main()
  .catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
