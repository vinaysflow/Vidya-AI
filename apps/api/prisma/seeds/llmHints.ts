import { PrismaClient, HintType } from '@prisma/client';
import { pathToFileURL } from 'url';
import { LlmClient } from '../../src/services/llm/client';

const prisma = new PrismaClient();
const client = new LlmClient();

const SYSTEM_PROMPT = `You generate Socratic hint ladders for tutoring.
Return ONLY valid JSON in this schema:
{
  "hints": [
    { "level": 1, "type": "CONCEPTUAL", "content": "..." },
    { "level": 2, "type": "PROCEDURAL", "content": "..." },
    { "level": 3, "type": "PROCEDURAL", "content": "..." },
    { "level": 4, "type": "FORMULA", "content": "..." },
    { "level": 5, "type": "EXAMPLE", "content": "..." }
  ]
}
Rules:
- Do not provide the final answer to a problem.
- Keep each hint to 1-2 short sentences.
- Use everyday language appropriate for high school students.
- If a concept is non-math, use PROCEDURAL/CONCEPTUAL/EXAMPLE types only.`;

const ELEMENTARY_SYSTEM_PROMPT = `You generate Socratic hint ladders for elementary tutoring (ages 7-9).
Return ONLY valid JSON in the same schema as above:
{
  "hints": [
    { "level": 1, "type": "CONCEPTUAL", "content": "..." },
    { "level": 2, "type": "PROCEDURAL", "content": "..." },
    { "level": 3, "type": "PROCEDURAL", "content": "..." },
    { "level": 4, "type": "FORMULA", "content": "..." },
    { "level": 5, "type": "EXAMPLE", "content": "..." }
  ]
}
Rules:
- Use simple, everyday language a 3rd grader understands
- Reference LEGO, Minecraft, cooking, playground, movies in examples
- Level 1: "What do you already know about this?"
- Level 2: Real-world connection (something they can touch/see)
- Level 3: Scaffold with smaller numbers or simpler version
- Level 4: Near-example with different values
- Level 5: Walk-through with the problem structure
- Keep each hint to 1 SHORT sentence
- Do not provide the final answer`;

const ELEMENTARY_TOPICS = [
  'operations',
  'fractions',
  'measurement',
  'geometry_shapes',
  'forces_motion',
  'weather_patterns',
  'patterns_algebra',
];

function normalizeType(value: string | undefined): HintType {
  const upper = (value || '').toUpperCase();
  if (upper === 'FORMULA') return 'FORMULA';
  if (upper === 'EXAMPLE') return 'EXAMPLE';
  if (upper === 'VISUAL') return 'VISUAL';
  if (upper === 'PROCEDURAL') return 'PROCEDURAL';
  return 'CONCEPTUAL';
}

async function generateHintsForConcept(
  concept: { name: string; description: string },
  elementary: boolean
) {
  const systemPrompt = elementary ? ELEMENTARY_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const text = await client.generateText({
    modelType: 'analysis',
    maxTokens: 800,
    systemPrompt,
    messages: [{
      role: 'user',
      content: `Concept: ${concept.name}\nDescription: ${concept.description}\nGenerate 5 hints.`,
    }],
    usePromptCache: false,
  });

  const parsed = JSON.parse(text) as { hints?: Array<{ level: number; type: string; content: string }> };
  if (!parsed.hints || parsed.hints.length === 0) {
    throw new Error('No hints returned from LLM');
  }

  return parsed.hints.map((hint, idx) => ({
    level: hint.level || idx + 1,
    type: normalizeType(hint.type),
    content: hint.content.trim(),
  }));
}

async function seedLlmHints() {
  const elementary = process.argv.includes('--elementary');
  const subjectsFilter = process.env.LLM_HINT_SUBJECTS?.split(',').map(s => s.trim()).filter(Boolean);

  const where: Record<string, unknown> = {};
  if (subjectsFilter?.length) {
    where.subject = { in: subjectsFilter as string[] };
  }
  if (elementary) {
    where.topic = { in: ELEMENTARY_TOPICS };
  }

  const concepts = await prisma.concept.findMany({
    where,
    include: { hints: true },
  });

  if (elementary) {
    console.log(`[elementary] Found ${concepts.length} concepts in topics: ${ELEMENTARY_TOPICS.join(', ')}`);
  }

  for (const concept of concepts) {
    if (concept.hints.length >= 5) continue;
    const hints = await generateHintsForConcept(
      { name: concept.name, description: concept.description },
      elementary
    );

    for (const hint of hints) {
      await prisma.hint.upsert({
        where: {
          conceptId_level: {
            conceptId: concept.id,
            level: hint.level,
          },
        },
        update: {
          content: hint.content,
          type: hint.type,
        },
        create: {
          conceptId: concept.id,
          level: hint.level,
          content: hint.content,
          type: hint.type,
        },
      });
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedLlmHints()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
