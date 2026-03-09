import { PrismaClient, HintType } from '@prisma/client';
import { pathToFileURL } from 'url';
import { config as loadEnv } from 'dotenv';
import { LlmClient } from '../../src/services/llm/client';

loadEnv();

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
  // Additional topics from concepts.json grades 3-7
  'matter',
  'geometry',
  'chemistry_intro',
  'data_statistics',
  'number_sense',
  'algebra_intro',
  'earth_science',
  'biology_intro',
  'Mechanics',
  'Algebra',
  'Geometry',
  'Data',
  'Number',
  'Measurement',
  'Physics',
  'Chemistry',
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

  // --grade-range=3-7 flag: filter by gradeLevel range instead of (or in addition to) topic filter
  const gradeRangeArg = process.argv.find(a => a.startsWith('--grade-range='));
  let gradeMin: number | undefined;
  let gradeMax: number | undefined;
  if (gradeRangeArg) {
    const parts = gradeRangeArg.replace('--grade-range=', '').split('-');
    gradeMin = parseInt(parts[0] ?? '', 10);
    gradeMax = parseInt(parts[1] ?? parts[0] ?? '', 10);
  }

  const where: Record<string, unknown> = {};
  if (subjectsFilter?.length) {
    where.subject = { in: subjectsFilter as string[] };
  }
  if (gradeMin != null && gradeMax != null) {
    // Use grade range as primary filter — covers all elementary concepts regardless of topic naming
    where.gradeLevel = { gte: gradeMin, lte: gradeMax };
  } else if (elementary) {
    where.topic = { in: ELEMENTARY_TOPICS };
  }

  const concepts = await prisma.concept.findMany({
    where,
    include: { hints: true },
  });

  const label = gradeMin != null
    ? `grades ${gradeMin}-${gradeMax}`
    : elementary
    ? `topics: ${ELEMENTARY_TOPICS.join(', ')}`
    : 'all subjects';
  console.log(`[llmHints] Found ${concepts.length} concepts (${label})`);
  const toSeed = concepts.filter(c => c.hints.length < 5);
  console.log(`[llmHints] Skipping ${concepts.length - toSeed.length} already complete; seeding ${toSeed.length}`);

  let done = 0;
  for (const concept of toSeed) {
    try {
      const hints = await generateHintsForConcept(
        { name: concept.name, description: concept.description },
        elementary || gradeMin != null
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
      done++;
      console.log(`  [${done}/${toSeed.length}] ✓ ${concept.conceptKey}`);
    } catch (err) {
      console.error(`  ✗ ${concept.conceptKey}: ${(err as Error).message}`);
    }
  }
  console.log(`\n[llmHints] Done: ${done} concepts seeded.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedLlmHints()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
