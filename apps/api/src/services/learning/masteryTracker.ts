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
