import { PrismaClient, Subject } from '@prisma/client';

const prisma = new PrismaClient();

const P_GUESS = 0.25;
const P_SLIP = 0.1;
const P_TRANSIT = 0.3;

/**
 * Bayesian Knowledge Tracing update.
 * Updates mastery estimate based on whether the student answered correctly.
 */
function bktUpdate(priorMastery: number, correct: boolean): number {
  const pMastery = priorMastery / 100;
  const pCorrectGivenMastery = 1 - P_SLIP;
  const pCorrectGivenNotMastery = P_GUESS;

  const pCorrect = pMastery * pCorrectGivenMastery + (1 - pMastery) * pCorrectGivenNotMastery;

  let posteriorMastery: number;
  if (correct) {
    posteriorMastery = (pMastery * pCorrectGivenMastery) / pCorrect;
  } else {
    const pIncorrect = 1 - pCorrect;
    posteriorMastery = (pMastery * P_SLIP) / pIncorrect;
  }

  // Apply learning transition
  const updated = posteriorMastery + (1 - posteriorMastery) * P_TRANSIT;
  return Math.min(99, Math.max(1, updated * 100));
}

/**
 * SM-2 inspired interval calculation for spaced repetition.
 * Returns the next review date.
 */
function calculateNextReview(mastery: number, attempts: number): Date {
  const easeFactor = 2.5 + 0.1 * (mastery - 50);
  const clampedEF = Math.max(1.3, Math.min(3.0, easeFactor));
  const baseInterval = Math.max(1, attempts);
  const intervalDays = Math.round(baseInterval * clampedEF);
  const capped = Math.min(intervalDays, 30);

  const next = new Date();
  next.setDate(next.getDate() + capped);
  return next;
}

/** Resolve a concept name or slug to a Concept conceptKey for mastery updates */
export async function resolveConceptKey(
  nameOrKey: string,
  subject?: Subject,
): Promise<string | null> {
  const slug = nameOrKey.toLowerCase().replace(/[\s/]+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!slug) return null;
  const exact = await prisma.concept.findUnique({ where: { conceptKey: slug } });
  if (exact?.conceptKey) return exact.conceptKey;
  const byName = await prisma.concept.findFirst({
    where: {
      OR: [
        { name: { contains: nameOrKey, mode: 'insensitive' } },
        { conceptKey: { contains: slug.split('_')[0] || slug, mode: 'insensitive' } },
      ],
      ...(subject ? { subject } : {}),
    },
    select: { conceptKey: true },
  });
  return byName?.conceptKey ?? null;
}

export async function updateMastery(
  userId: string,
  conceptKey: string,
  correct: boolean,
): Promise<{ mastery: number; nextReview: Date }> {
  const concept = await prisma.concept.findUnique({ where: { conceptKey } });
  if (!concept) {
    throw new Error(`Concept not found: ${conceptKey}`);
  }

  const existing = await prisma.progress.findUnique({
    where: { userId_conceptId: { userId, conceptId: concept.id } },
  });

  const priorMastery = existing?.mastery ?? 10;
  const newMastery = bktUpdate(priorMastery, correct);
  const attempts = (existing?.attempts ?? 0) + 1;
  const successes = (existing?.successes ?? 0) + (correct ? 1 : 0);
  const nextReview = calculateNextReview(newMastery, attempts);

  await prisma.progress.upsert({
    where: { userId_conceptId: { userId, conceptId: concept.id } },
    create: {
      userId,
      conceptId: concept.id,
      subject: concept.subject,
      topic: concept.topic,
      mastery: newMastery,
      attempts,
      successes,
      lastSeen: new Date(),
      nextReview,
    },
    update: {
      mastery: newMastery,
      attempts,
      successes,
      lastSeen: new Date(),
      nextReview,
    },
  });

  return { mastery: newMastery, nextReview };
}

export async function getMasteryMap(
  userId: string,
  subject?: Subject,
): Promise<Array<{ conceptId: string; topic: string; mastery: number; nextReview: Date | null }>> {
  const records = await prisma.progress.findMany({
    where: { userId, ...(subject ? { subject } : {}) },
    orderBy: { mastery: 'desc' },
  });
  return records.map((r) => ({
    conceptId: r.conceptId,
    topic: r.topic,
    mastery: r.mastery,
    nextReview: r.nextReview,
  }));
}

/** Returns mastery by conceptKey for frontend quest filtering */
export async function getMasteryByConceptKey(
  userId: string,
  subject?: Subject,
): Promise<Array<{ conceptKey: string; mastery: number }>> {
  const records = await prisma.progress.findMany({
    where: { userId, ...(subject ? { subject } : {}) },
  });
  if (records.length === 0) return [];
  const concepts = await prisma.concept.findMany({
    where: { id: { in: records.map((r) => r.conceptId) } },
    select: { id: true, conceptKey: true },
  });
  const keyMap = new Map(concepts.map((c) => [c.id, c.conceptKey]));
  return records
    .filter((r) => keyMap.get(r.conceptId))
    .map((r) => ({ conceptKey: keyMap.get(r.conceptId)!, mastery: r.mastery }));
}

export async function getDueReviews(
  userId: string,
): Promise<Array<{ conceptId: string; conceptKey: string | null; name: string; subject: Subject; topic: string; mastery: number }>> {
  const now = new Date();
  const dueProgress = await prisma.progress.findMany({
    where: { userId, nextReview: { lte: now } },
    orderBy: { nextReview: 'asc' },
    take: 10,
  });

  const conceptIds = dueProgress.map((p) => p.conceptId);
  const concepts = await prisma.concept.findMany({
    where: { id: { in: conceptIds } },
  });
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  return dueProgress.map((p) => {
    const c = conceptMap.get(p.conceptId);
    return {
      conceptId: p.conceptId,
      conceptKey: c?.conceptKey ?? null,
      name: c?.name ?? p.topic,
      subject: p.subject,
      topic: p.topic,
      mastery: p.mastery,
    };
  });
}

/** Threshold for "mastered" in elementary mode (soft gating) */
const MASTERY_THRESHOLD = 40;

/**
 * Returns mastery context for the elementary overlay.
 * masteredConcepts: mastery >= threshold
 * gapConcepts: mastery < threshold (weak prerequisites)
 */
export async function getMasteryContextForEngine(
  userId: string,
  subject: Subject,
): Promise<{ masteredConcepts: Array<{ name: string; mastery: number }>; gapConcepts: Array<{ name: string; mastery: number }> }> {
  const records = await prisma.progress.findMany({
    where: { userId, subject },
    orderBy: { mastery: 'desc' },
  });
  if (records.length === 0) {
    return { masteredConcepts: [], gapConcepts: [] };
  }

  const conceptIds = [...new Set(records.map((r) => r.conceptId))];
  const concepts = await prisma.concept.findMany({
    where: { id: { in: conceptIds } },
    select: { id: true, name: true },
  });
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  const masteredConcepts: Array<{ name: string; mastery: number }> = [];
  const gapConcepts: Array<{ name: string; mastery: number }> = [];

  for (const r of records) {
    const concept = conceptMap.get(r.conceptId);
    const name = concept?.name ?? r.topic;
    const entry = { name, mastery: r.mastery };
    if (r.mastery >= MASTERY_THRESHOLD) {
      masteredConcepts.push(entry);
    } else {
      gapConcepts.push(entry);
    }
  }

  return { masteredConcepts, gapConcepts };
}

export async function getRadarData(
  userId: string,
  subject: Subject,
): Promise<{ concepts: string[]; mastery: number[] }> {
  const allConcepts = await prisma.concept.findMany({
    where: { subject },
    orderBy: { topic: 'asc' },
  });

  const progress = await prisma.progress.findMany({
    where: { userId, subject },
  });
  const masteryMap = new Map(progress.map((p) => [p.conceptId, p.mastery]));

  const topics = [...new Set(allConcepts.map((c) => c.topic))];
  const topicMastery = topics.map((topic) => {
    const topicConcepts = allConcepts.filter((c) => c.topic === topic);
    const avgMastery =
      topicConcepts.reduce((sum, c) => sum + (masteryMap.get(c.id) ?? 0), 0) /
      topicConcepts.length;
    return avgMastery;
  });

  return { concepts: topics, mastery: topicMastery };
}
