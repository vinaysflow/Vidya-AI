/**
 * buddyState.ts
 *
 * Phase 5 of the learner model: the buddy as a teachable-agent projection.
 *
 * The buddy "knows" what the child has taught it. Its concept knowledge mirrors
 * the student's mastery for concepts they have explained back (the protege
 * effect), and it remembers explain-back moments so it can call them back later
 * ("you showed me halves last time"). Its questions get sharper because they are
 * generated against the kid's actual open misconceptions.
 */

import { prisma } from '../../lib/prisma';
import { getMasteryByConceptKey } from '../learning/masteryTracker';
import { getActiveMisconceptions } from './misconceptionTracker';

export interface TaughtMoment {
  conceptKey: string;
  summary: string;
  at: string; // ISO
}

export interface ConceptKnowledge {
  [conceptKey: string]: { mastery: number; lastTaughtAt: string };
}

export interface BuddyStateView {
  level: number;
  conceptKnowledge: ConceptKnowledge;
  taughtMoments: TaughtMoment[];
  cosmetic: Record<string, unknown>;
  /** A question the buddy can ask, generated against the kid's open misconceptions. */
  buddyQuestion: string | null;
  /** A callback line referencing something the kid taught earlier (or null). */
  callback: string | null;
}

const MAX_TAUGHT_MOMENTS = 25;

function levelFromKnowledge(knowledge: ConceptKnowledge, moments: TaughtMoment[]): number {
  const taughtConcepts = Object.keys(knowledge).length;
  // 1 level per 3 taught concepts, +1 per 10 remembered moments, floor at 1.
  return Math.max(1, 1 + Math.floor(taughtConcepts / 3) + Math.floor(moments.length / 10));
}

/**
 * Re-derives the buddy's knowledge from the student's explain-back history and
 * current mastery, and persists it. Call at session end.
 */
export async function syncBuddyFromSession(userId: string, sessionId?: string): Promise<BuddyStateView | null> {
  try {
    const explainBacks = await prisma.learnerEvent.findMany({
      where: { userId, kind: 'EXPLAIN_BACK' },
      orderBy: { ts: 'desc' },
      take: 100,
    });

    const masteryRows = await getMasteryByConceptKey(userId).catch(() => []);
    const masteryByKey = new Map(masteryRows.map((m) => [m.conceptKey, m.mastery]));

    const existing = await prisma.buddyState.findUnique({ where: { userId } });
    const knowledge: ConceptKnowledge = (existing?.conceptKnowledge as unknown as ConceptKnowledge) ?? {};
    const moments: TaughtMoment[] = (existing?.taughtMoments as unknown as TaughtMoment[]) ?? [];

    // Mirror mastery for every concept the kid has taught the buddy.
    for (const eb of explainBacks) {
      const key = eb.conceptKey;
      if (!key) continue;
      const mastery = masteryByKey.get(key) ?? knowledge[key]?.mastery ?? 0;
      const lastTaughtAt = eb.ts.toISOString();
      if (!knowledge[key] || new Date(lastTaughtAt) >= new Date(knowledge[key].lastTaughtAt)) {
        knowledge[key] = { mastery, lastTaughtAt };
      }
    }

    // Record this session's teach-back as a remembered moment.
    if (sessionId) {
      const sessionExplainBacks = explainBacks.filter((e) => e.sessionId === sessionId && e.conceptKey);
      for (const eb of sessionExplainBacks) {
        const already = moments.some(
          (m) => m.conceptKey === eb.conceptKey && m.at === eb.ts.toISOString(),
        );
        if (!already) {
          moments.unshift({
            conceptKey: eb.conceptKey!,
            summary: `You taught me ${eb.conceptKey!.replace(/_/g, ' ')}.`,
            at: eb.ts.toISOString(),
          });
        }
      }
    }
    const trimmedMoments = moments.slice(0, MAX_TAUGHT_MOMENTS);
    const level = levelFromKnowledge(knowledge, trimmedMoments);

    await prisma.buddyState.upsert({
      where: { userId },
      update: {
        conceptKnowledge: knowledge as any,
        taughtMoments: trimmedMoments as any,
        level,
      },
      create: {
        userId,
        conceptKnowledge: knowledge as any,
        taughtMoments: trimmedMoments as any,
        level,
        cosmetic: {},
      },
    });

    return composeView(userId, {
      level,
      conceptKnowledge: knowledge,
      taughtMoments: trimmedMoments,
      cosmetic: (existing?.cosmetic as Record<string, unknown>) ?? {},
    });
  } catch {
    return null;
  }
}

/** Build the buddy question + callback against the student's current state. */
async function composeView(
  userId: string,
  base: { level: number; conceptKnowledge: ConceptKnowledge; taughtMoments: TaughtMoment[]; cosmetic: Record<string, unknown> },
): Promise<BuddyStateView> {
  let buddyQuestion: string | null = null;
  try {
    const open = await getActiveMisconceptions(userId);
    if (open.length > 0) {
      const target = open[0];
      // Sharper question: aimed at the kid's actual open misconception.
      buddyQuestion = `Can you show me again why ${
        target.parentLabel ?? target.description
      }? I want to make sure I really get it.`;
    }
  } catch { /* non-critical */ }

  const callback =
    base.taughtMoments.length > 0
      ? base.taughtMoments[0].summary + ' Can we build on that today?'
      : null;

  return { ...base, buddyQuestion, callback };
}

/** Read the buddy state as a view (for the GameScene buddy and parent view). */
export async function getBuddyState(userId: string): Promise<BuddyStateView | null> {
  const row = await prisma.buddyState.findUnique({ where: { userId } });
  if (!row) {
    return composeView(userId, { level: 1, conceptKnowledge: {}, taughtMoments: [], cosmetic: {} });
  }
  return composeView(userId, {
    level: row.level,
    conceptKnowledge: (row.conceptKnowledge as unknown as ConceptKnowledge) ?? {},
    taughtMoments: (row.taughtMoments as unknown as TaughtMoment[]) ?? [],
    cosmetic: (row.cosmetic as Record<string, unknown>) ?? {},
  });
}
