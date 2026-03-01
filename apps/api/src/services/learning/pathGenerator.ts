import { PrismaClient, Subject } from '@prisma/client';

const prisma = new PrismaClient();

interface PathStep {
  conceptId: string;
  conceptKey: string | null;
  name: string;
  topic: string;
  status: 'mastered' | 'available' | 'locked';
  mastery: number;
  order: number;
}

/**
 * Generate a learning path for a user in a subject.
 * Uses the concept prerequisite graph to determine availability.
 */
export async function generatePath(userId: string, subject: Subject): Promise<PathStep[]> {
  const concepts = await prisma.concept.findMany({
    where: { subject },
    orderBy: [{ difficulty: 'asc' }, { topic: 'asc' }],
  });

  const progress = await prisma.progress.findMany({
    where: { userId, subject },
  });
  const masteryMap = new Map(progress.map((p) => [p.conceptId, p.mastery]));

  const conceptByKey = new Map(concepts.map((c) => [c.conceptKey, c]));
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const steps: PathStep[] = concepts.map((c, i) => {
    const mastery = masteryMap.get(c.id) ?? 0;
    const isMastered = mastery >= 70;

    const prereqsMet = c.prerequisites.every((prereqKey) => {
      const prereq = conceptByKey.get(prereqKey);
      if (!prereq) return true;
      return (masteryMap.get(prereq.id) ?? 0) >= 50;
    });

    let status: 'mastered' | 'available' | 'locked';
    if (isMastered) status = 'mastered';
    else if (prereqsMet) status = 'available';
    else status = 'locked';

    return {
      conceptId: c.id,
      conceptKey: c.conceptKey,
      name: c.name,
      topic: c.topic,
      status,
      mastery,
      order: i,
    };
  });

  // Persist to LearningPath table
  const completionPct =
    steps.length > 0
      ? (steps.filter((s) => s.status === 'mastered').length / steps.length) * 100
      : 0;

  await prisma.learningPath.upsert({
    where: { userId_subject: { userId, subject } },
    create: {
      userId,
      subject,
      pathSteps: JSON.parse(JSON.stringify(steps)),
      completionPct,
    },
    update: {
      pathSteps: JSON.parse(JSON.stringify(steps)),
      completionPct,
    },
  });

  return steps;
}

/**
 * Get the single best next concept across all subjects.
 * Priority: due for review > next available in current path > lowest mastery available.
 */
export async function getRecommendedNext(
  userId: string,
): Promise<{ conceptKey: string | null; name: string; subject: Subject; topic: string; reason: string } | null> {
  // 1. Check due reviews first
  const now = new Date();
  const dueReview = await prisma.progress.findFirst({
    where: { userId, nextReview: { lte: now } },
    orderBy: { nextReview: 'asc' },
  });

  if (dueReview) {
    const concept = await prisma.concept.findFirst({ where: { id: dueReview.conceptId } });
    if (concept) {
      return {
        conceptKey: concept.conceptKey,
        name: concept.name,
        subject: dueReview.subject,
        topic: dueReview.topic,
        reason: 'Due for review',
      };
    }
  }

  // 2. Find first available concept across all paths
  const paths = await prisma.learningPath.findMany({ where: { userId } });
  for (const path of paths) {
    const steps = path.pathSteps as unknown as PathStep[];
    const available = steps.find((s) => s.status === 'available');
    if (available) {
      return {
        conceptKey: available.conceptKey,
        name: available.name,
        subject: path.subject,
        topic: available.topic,
        reason: 'Next in learning path',
      };
    }
  }

  // 3. Fallback: find any concept with no progress
  const allConceptIds = (
    await prisma.concept.findMany({ select: { id: true } })
  ).map((c) => c.id);
  const progressIds = new Set(
    (await prisma.progress.findMany({ where: { userId }, select: { conceptId: true } })).map(
      (p) => p.conceptId,
    ),
  );
  const unstarted = allConceptIds.find((id) => !progressIds.has(id));
  if (unstarted) {
    const concept = await prisma.concept.findUnique({ where: { id: unstarted } });
    if (concept) {
      return {
        conceptKey: concept.conceptKey,
        name: concept.name,
        subject: concept.subject,
        topic: concept.topic,
        reason: 'New topic to explore',
      };
    }
  }

  return null;
}
