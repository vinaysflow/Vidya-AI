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

function normalizeType(value: string | undefined): HintType {
  const upper = (value || '').toUpperCase();
  if (upper === 'FORMULA') return 'FORMULA';
  if (upper === 'EXAMPLE') return 'EXAMPLE';
  if (upper === 'VISUAL') return 'VISUAL';
  if (upper === 'PROCEDURAL') return 'PROCEDURAL';
  return 'CONCEPTUAL';
}

async function generateHintsForConcept(concept: { name: string; description: string }) {
  const text = await client.generateText({
    modelType: 'analysis',
    maxTokens: 800,
    systemPrompt: SYSTEM_PROMPT,
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
  const subjectsFilter = process.env.LLM_HINT_SUBJECTS?.split(',').map(s => s.trim()).filter(Boolean);
  const concepts = await prisma.concept.findMany({
    where: subjectsFilter?.length ? { subject: { in: subjectsFilter as any } } : undefined,
    include: { hints: true },
  });

  for (const concept of concepts) {
    if (concept.hints.length >= 5) continue;
    const hints = await generateHintsForConcept({
      name: concept.name,
      description: concept.description,
    });

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
