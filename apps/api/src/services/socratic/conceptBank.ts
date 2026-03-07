import { PrismaClient, type Subject, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { value: string; expiresAt: number }>();

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}

function buildAddendum(params: {
  subject: Subject;
  topic?: string;
  hintLevel: number;
  concepts: Array<{
    name: string;
    description: string;
    topic: string;
    hints: Array<{ level: number; content: string }>;
  }>;
}): string {
  const { subject, topic, hintLevel, concepts } = params;
  if (concepts.length === 0) return '';

  const title = topic
    ? `Knowledge Bank (${subject} - ${topic})`
    : `Knowledge Bank (${subject})`;

  const lines: string[] = [`## ${title}`];
  for (const c of concepts) {
    const preferred =
      c.hints.find(h => h.level === hintLevel) ||
      c.hints[0];
    lines.push(`- ${c.name}: ${truncate(c.description)}`);
    if (preferred?.content) {
      lines.push(`  Hint (L${preferred.level}): ${truncate(preferred.content, 220)}`);
    }
  }

  return lines.join('\n');
}

const CROSS_SUBJECT_MAP: Record<string, Subject> = {
  forces_motion: 'PHYSICS',
  matter: 'PHYSICS',
  weather_patterns: 'PHYSICS',
  operations: 'MATHEMATICS',
  fractions: 'MATHEMATICS',
  measurement: 'MATHEMATICS',
  patterns_algebra: 'MATHEMATICS',
};

export async function getConceptBankAddendum(params: {
  subject?: Subject;
  topic?: string;
  hintLevel?: number;
  limit?: number;
  grade?: number;
}): Promise<string> {
  const {
    subject,
    topic,
    hintLevel = 2,
    limit = 3,
    grade,
  } = params;

  if (!subject) return '';

  const key = `${subject}|${topic || 'any'}|${hintLevel}|${limit}|${grade ?? 'x'}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const topicQuery = topic?.trim();
    const topicFilter = topicQuery
    ? {
          OR: [
            { topic: { contains: topicQuery, mode: 'insensitive' as Prisma.QueryMode } },
            { subtopic: { contains: topicQuery, mode: 'insensitive' as Prisma.QueryMode } },
            { name: { contains: topicQuery, mode: 'insensitive' as Prisma.QueryMode } },
          ],
        }
      : undefined;

    const concepts = await prisma.concept.findMany({
      where: {
        subject,
        ...(topicFilter || {}),
      },
      include: {
        hints: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { difficulty: 'asc' },
      take: limit,
    });

    let fallbackConcepts = concepts.length === 0 && topicQuery
      ? await prisma.concept.findMany({
          where: { subject },
          include: { hints: { orderBy: { level: 'asc' } } },
          orderBy: { difficulty: 'asc' },
          take: limit,
        })
      : concepts;

    let addendum = buildAddendum({
      subject,
      topic: topicQuery,
      hintLevel: Math.max(1, Math.min(5, hintLevel)),
      concepts: fallbackConcepts.map((c: any) => ({
        name: c.name,
        description: c.description,
        topic: c.topic,
        hints: (c.hints ?? []).map((h: any) => ({ level: h.level, content: h.content })),
      })),
    });

    // Cross-subject for elementary (grade <= 5): add up to 2 concepts from related subject
    if (grade != null && grade <= 5 && topicQuery && CROSS_SUBJECT_MAP[topicQuery]) {
      const crossSubject = CROSS_SUBJECT_MAP[topicQuery];
      if (crossSubject !== subject) {
        const crossConcepts = await prisma.concept.findMany({
          where: {
            subject: crossSubject,
            OR: [
              { topic: { contains: topicQuery, mode: 'insensitive' } },
              { name: { contains: topicQuery, mode: 'insensitive' } },
            ],
          },
          include: { hints: { orderBy: { level: 'asc' } } },
          orderBy: { difficulty: 'asc' },
          take: 2,
        });
        if (crossConcepts.length > 0) {
          const crossLabel = `[Cross-reference from ${crossSubject}]`;
          const crossSection = buildAddendum({
            subject: crossSubject,
            topic: topicQuery,
            hintLevel: Math.max(1, Math.min(5, hintLevel)),
            concepts: crossConcepts.map(c => ({
              name: `${c.name} ${crossLabel}`,
              description: c.description,
              topic: c.topic,
              hints: c.hints.map(h => ({ level: h.level, content: h.content })),
            })),
          });
          addendum = addendum ? `${addendum}\n\n${crossSection}` : crossSection;
        }
      }
    }

    cache.set(key, { value: addendum, expiresAt: Date.now() + CACHE_TTL_MS });
    return addendum;
  } catch (error) {
    console.warn('[ConceptBank] Failed to load concepts:', error);
    return '';
  }
}
