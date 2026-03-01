import { PrismaClient, Subject } from '@prisma/client';

const prisma = new PrismaClient();

export interface OfflinePack {
  subject: string;
  version: string;
  concepts: Array<{
    key: string;
    name: string;
    description: string;
    hints: string[];
  }>;
  flashcards: Array<{
    front: string;
    back: string;
    concept: string;
  }>;
  quizBank: Array<{
    prompt: string;
    options: string[];
    answer: string;
    concept: string;
  }>;
  socraticStarters: string[];
}

const packCache = new Map<string, { pack: OfflinePack; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function generatePack(subject: Subject): Promise<OfflinePack> {
  const cached = packCache.get(subject);
  if (cached && cached.expiresAt > Date.now()) return cached.pack;

  const concepts = await prisma.concept.findMany({
    where: { subject },
    include: { hints: { orderBy: { level: 'asc' } } },
    orderBy: { difficulty: 'asc' },
  });

  const packConcepts = concepts.map((c) => ({
    key: c.conceptKey || c.id,
    name: c.name,
    description: c.description,
    hints: c.hints.map((h) => h.content),
  }));

  const flashcards = concepts.map((c) => ({
    front: `What is ${c.name}?`,
    back: c.description.slice(0, 200),
    concept: c.conceptKey || c.id,
  }));

  const quizBank = concepts.map((c) => ({
    prompt: `Which of the following best describes "${c.name}"?`,
    options: [
      c.description.slice(0, 80),
      'A concept unrelated to this topic',
      'An advanced topic not covered here',
      'None of the above',
    ],
    answer: c.description.slice(0, 80),
    concept: c.conceptKey || c.id,
  }));

  const socraticStarters = concepts.slice(0, 5).map((c) =>
    `Can you explain how ${c.name.toLowerCase()} works?`,
  );

  const pack: OfflinePack = {
    subject,
    version: new Date().toISOString().slice(0, 10),
    concepts: packConcepts,
    flashcards,
    quizBank,
    socraticStarters,
  };

  packCache.set(subject, { pack, expiresAt: Date.now() + CACHE_TTL });
  return pack;
}

export async function getPacksManifest(): Promise<
  Array<{ subject: string; conceptCount: number; version: string }>
> {
  const subjects: Subject[] = [
    'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'CODING', 'AI_LEARNING',
  ];

  const result = [];
  for (const subject of subjects) {
    const count = await prisma.concept.count({ where: { subject } });
    result.push({
      subject,
      conceptCount: count,
      version: new Date().toISOString().slice(0, 10),
    });
  }
  return result;
}
