/**
 * Generate elementary (Grade 3) concept and quest seeds via LLM.
 * Embedding CCSS Math Grade 3, NGSS Grade 3, and RSM-inspired standards.
 *
 * Run: cd vidya/apps/api && tsx scripts/generate-elementary-seeds.ts
 *
 * Outputs:
 *   prisma/seed-data/elementary-concepts.json
 *   prisma/seed-data/elementary-quests.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { LlmClient } from '../src/services/llm/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '../prisma/seed-data');

interface ConceptSeed {
  conceptKey: string;
  subject: 'MATHEMATICS' | 'PHYSICS';
  topic: string;
  name: string;
  description: string;
  difficulty: number;
  prerequisites: string[];
}

interface QuestSeed {
  id: string;
  title: string;
  prompt: string;
  subject: 'MATHEMATICS' | 'PHYSICS';
  topic: string;
  conceptKey: string;
  prerequisites: string[];
  tags: string[];
}

const STANDARDS_PROMPT = `
## CCSS Math Grade 3
- 3.OA: Operations & Algebraic Thinking — multiply/divide within 100, arrays, unknown factors
- 3.NBT: Number & Operations in Base Ten — place value, rounding, fluently add/subtract within 1000
- 3.NF: Number & Operations — Fractions — unit fractions, fractions on number line, equivalent fractions
- 3.MD: Measurement & Data — time, liquid volumes, masses, area, perimeter, scaled graphs
- 3.G: Geometry — shapes, quadrilaterals, partitioning shapes

## NGSS Grade 3
- 3-PS2: Forces and Interactions — pushes/pulls, magnetic interactions
- 3-ESS2: Earth's Systems — weather and climate patterns
- 3-LS3: Heredity — inheritance and variation
- 3-5-ETS1: Engineering Design — define problem, develop solutions

## RSM-inspired (elementary)
- Early algebraic thinking: unknown variables, equations like 3 + ___ = 7
- Pattern recognition: growing/shrinking patterns
- Logic puzzles: if-then reasoning
- Cross-subject: physics problems that need multiplication (e.g., forces × distance)
`;

const CONCEPTS_SYSTEM = `You are an expert curriculum designer for Grade 3 (ages 8-9).

Generate elementary STEM concepts aligned to CCSS, NGSS, and RSM-inspired standards.
${STANDARDS_PROMPT}

Output ONLY valid JSON in this schema:
{
  "concepts": [
    {
      "conceptKey": "snake_case_key",
      "subject": "MATHEMATICS" | "PHYSICS",
      "topic": "operations" | "fractions" | "measurement" | "geometry_shapes" | "forces_motion" | "weather_patterns" | "patterns_algebra",
      "name": "Short display name",
      "description": "1-2 sentence description",
      "difficulty": 1,
      "prerequisites": ["conceptKey1", "conceptKey2"]
    }
  ]
}

Rules:
- Generate ~40 concepts. At least 25 MATH, at least 10 PHYSICS.
- Include 8+ concepts with no prerequisites (entry points).
- Prerequisite chains: addition_grouping -> multiplication_intro -> multiplication_arrays -> area_rectangles
- Cross-subject: e.g. forces_push_pull can have prerequisites ["multiplication_intro"]
- topic must be one of: operations, fractions, measurement, geometry_shapes, forces_motion, weather_patterns, matter, patterns_algebra
- conceptKey must be snake_case, unique`;

const QUESTS_SYSTEM = `You are an expert curriculum designer for Grade 3 (ages 8-9).

Generate quest scenarios that feel like adventures. Themes: Minecraft, LEGO, cooking, playground, movies, building.
${STANDARDS_PROMPT}

Output ONLY valid JSON in this schema:
{
  "quests": [
    {
      "id": "snake_case_id",
      "title": "Fun short title",
      "prompt": "Problem statement as a story — 1-3 sentences. Ends with a clear question.",
      "subject": "MATHEMATICS" | "PHYSICS",
      "topic": "operations" | "forces_motion" | etc,
      "conceptKey": "concept_key_from_concepts",
      "prerequisites": ["conceptKey1"],
      "tags": ["minecraft", "building"]
    }
  ]
}

Rules:
- Generate ~15 quests.
- At least 5 quests must have empty prerequisites (entry quests).
- Always ensure 5+ quests are available to a brand-new student.
- Make prompts concrete: "You're building a Minecraft elevator. 5 floors, each 4 blocks tall. How many blocks?"
- conceptKey must match a concept from the concepts list.
- tags: minecraft, lego, cooking, playground, movies, building, etc.`;

const FALLBACK_CONCEPTS: ConceptSeed[] = [
  { conceptKey: 'addition_grouping', subject: 'MATHEMATICS', topic: 'operations', name: 'Addition as Grouping', description: 'Understanding addition as combining groups of objects', difficulty: 1, prerequisites: [] },
  { conceptKey: 'skip_counting', subject: 'MATHEMATICS', topic: 'operations', name: 'Skip Counting', description: 'Counting by 2s, 5s, 10s to prepare for multiplication', difficulty: 1, prerequisites: [] },
  { conceptKey: 'multiplication_intro', subject: 'MATHEMATICS', topic: 'operations', name: 'Introduction to Multiplication', description: 'Multiplication as repeated addition', difficulty: 1, prerequisites: ['addition_grouping'] },
  { conceptKey: 'multiplication_arrays', subject: 'MATHEMATICS', topic: 'operations', name: 'Multiplication as Arrays', description: 'Understanding rows and columns (e.g., 3×4 = 12)', difficulty: 1, prerequisites: ['multiplication_intro'] },
  { conceptKey: 'shapes_identify', subject: 'MATHEMATICS', topic: 'geometry_shapes', name: 'Identifying Shapes', description: 'Quadrilaterals, rectangles, squares', difficulty: 1, prerequisites: [] },
  { conceptKey: 'patterns_repeat', subject: 'MATHEMATICS', topic: 'patterns_algebra', name: 'Repeating Patterns', description: 'Recognizing and extending patterns', difficulty: 1, prerequisites: [] },
  { conceptKey: 'forces_push_pull', subject: 'PHYSICS', topic: 'forces_motion', name: 'Pushes and Pulls', description: 'Forces cause objects to move or change', difficulty: 1, prerequisites: [] },
];

const FALLBACK_QUESTS: QuestSeed[] = [
  { id: 'minecraft_elevator', title: 'Build a Minecraft Elevator', prompt: "You want to build an elevator in Minecraft that goes up 5 floors. Each floor is 4 blocks tall. How many blocks tall is the whole elevator?", subject: 'MATHEMATICS', topic: 'operations', conceptKey: 'multiplication_intro', prerequisites: ['addition_grouping'], tags: ['minecraft', 'building'] },
  { id: 'lego_rows', title: 'LEGO Rows', prompt: "You have 3 rows of LEGO bricks. Each row has 6 bricks. How many bricks do you have in total?", subject: 'MATHEMATICS', topic: 'operations', conceptKey: 'multiplication_arrays', prerequisites: ['multiplication_intro'], tags: ['lego'] },
  { id: 'cookie_doubling', title: 'Double the Cookie Recipe', prompt: "A cookie recipe needs 4 eggs. You want to make double the recipe. How many eggs do you need?", subject: 'MATHEMATICS', topic: 'operations', conceptKey: 'multiplication_intro', prerequisites: ['addition_grouping'], tags: ['cooking'] },
  { id: 'playground_push', title: 'Push the Swing', prompt: "You push a friend on the swing. What happens when you push harder? What happens when you push softer?", subject: 'PHYSICS', topic: 'forces_motion', conceptKey: 'forces_push_pull', prerequisites: [], tags: ['playground'] },
  { id: 'pattern_blocks', title: 'What Comes Next?', prompt: "You see a pattern: red, blue, red, blue, red, blue. What color comes next?", subject: 'MATHEMATICS', topic: 'patterns_algebra', conceptKey: 'patterns_repeat', prerequisites: [], tags: ['patterns'] },
];

async function main() {
  mkdirSync(SEED_DIR, { recursive: true });

  let concepts: ConceptSeed[] = FALLBACK_CONCEPTS;
  let quests: QuestSeed[] = FALLBACK_QUESTS;

  if (process.env.SKIP_LLM !== '1') {
    const client = new LlmClient();
    try {
      const conceptsRes = await client.generateText({
        modelType: 'analysis',
        maxTokens: 8000,
        systemPrompt: CONCEPTS_SYSTEM,
        messages: [{ role: 'user', content: 'Generate the concepts. Return ONLY the JSON object.' }],
        usePromptCache: false,
      });
      const conceptsMatch = conceptsRes.match(/\{[\s\S]*\}/);
      if (conceptsMatch) {
        const parsed = JSON.parse(conceptsMatch[0]) as { concepts?: ConceptSeed[] };
        if (parsed.concepts?.length) concepts = parsed.concepts;
      }
    } catch (e) {
      console.warn('LLM concept generation failed, using fallback:', (e as Error).message);
    }

    try {
      const questsRes = await client.generateText({
        modelType: 'analysis',
        maxTokens: 4000,
        systemPrompt: QUESTS_SYSTEM,
        messages: [{ role: 'user', content: `Concepts available: ${concepts.map(c => c.conceptKey).join(', ')}. Generate quests. Return ONLY the JSON object.` }],
        usePromptCache: false,
      });
      const questsMatch = questsRes.match(/\{[\s\S]*\}/);
      if (questsMatch) {
        const parsed = JSON.parse(questsMatch[0]) as { quests?: QuestSeed[] };
        if (parsed.quests?.length) quests = parsed.quests;
      }
    } catch (e) {
      console.warn('LLM quest generation failed, using fallback:', (e as Error).message);
    }
  } else {
    console.log('SKIP_LLM=1: using fallback concepts and quests only');
  }

  const conceptsPath = join(SEED_DIR, 'elementary-concepts.json');
  const questsPath = join(SEED_DIR, 'elementary-quests.json');
  writeFileSync(conceptsPath, JSON.stringify(concepts, null, 2), 'utf-8');
  writeFileSync(questsPath, JSON.stringify(quests, null, 2), 'utf-8');
  console.log(`Wrote ${concepts.length} concepts to ${conceptsPath}`);
  console.log(`Wrote ${quests.length} quests to ${questsPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
