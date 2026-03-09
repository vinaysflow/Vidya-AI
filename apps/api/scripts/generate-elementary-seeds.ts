/**
 * generate-elementary-seeds.ts (generalized)
 *
 * Generates elementary concept and quest seeds via LLM for any grade (3-9) and subject.
 * Dynamically loads curriculum standards from parsed JSON files.
 *
 * Usage:
 *   cd vidya/apps/api
 *   LLM_PROVIDER=openai OPENAI_API_KEY=xxx npx tsx scripts/generate-elementary-seeds.ts \
 *     --grade=5 --subject=BIOLOGY
 *
 * Modes:
 *   Default:     Generate concepts + quests for given grade/subject. Append to concepts.json / quests.json
 *   --fill-gaps: Generate 2 quests for every concept in concepts.json with no existing quest
 *
 * ENV REQUIRED (defaults to ollama otherwise):
 *   LLM_PROVIDER=openai
 *   OPENAI_API_KEY=xxx
 *
 * Subject enum values (match Prisma Subject enum):
 *   MATHEMATICS | PHYSICS | CHEMISTRY | BIOLOGY | CODING | ENGLISH_LITERATURE | ECONOMICS | AI_LEARNING | LOGIC | ESSAY_WRITING
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LlmClient } from '../src/services/llm/client';
import { config as loadEnv } from 'dotenv';

// Load .env so API keys are available when running standalone
loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '../prisma/seed-data');
const RAW_DIR = join(SEED_DIR, 'raw');
const CONCEPTS_PATH = join(SEED_DIR, 'concepts.json');
const QUESTS_JSON_PATH = join(__dirname, '../../web/src/data/quests.json');

// ── Types ──────────────────────────────────────────────────────────────────────

type SubjectEnum =
  | 'MATHEMATICS'
  | 'PHYSICS'
  | 'CHEMISTRY'
  | 'BIOLOGY'
  | 'CODING'
  | 'ENGLISH_LITERATURE'
  | 'ECONOMICS'
  | 'AI_LEARNING'
  | 'LOGIC'
  | 'ESSAY_WRITING';

interface ConceptSeed {
  conceptKey: string;
  subject: SubjectEnum;
  topic: string;
  name: string;
  description: string;
  difficulty: number;
  gradeLevel: number;
  prerequisites: string[];
}

interface QuestSeed {
  id: string;
  title: string;
  prompt: string;
  subject: SubjectEnum;
  topic: string;
  conceptKey: string;
  prerequisites: string[];
  tags: string[];
}

interface FullQuest {
  id: string;
  title: string;
  prompt: string;
  subject: string;
  topic: string;
  conceptKey: string;
  prerequisites: string[];
  tags: string[];
  chapter: string;
  order: number;
  gradeLevel: number;
}

interface ConceptRecord {
  conceptKey: string;
  subject: string;
  topic: string;
  name: string;
  description: string;
  difficulty: number;
  gradeLevel?: number;
  prerequisites: string[];
}

// ── Standards loading ──────────────────────────────────────────────────────────

interface ParsedStandard {
  code: string;
  description: string;
  grade: number;
  domain?: string;
  cluster?: string;
  coreIdea?: string;
  topic?: string;
}

const STANDARDS_FILES: Record<SubjectEnum, string | null> = {
  MATHEMATICS: join(RAW_DIR, 'ccss-math-parsed.json'),
  PHYSICS: join(RAW_DIR, 'ngss-physical-science-parsed.json'),
  CHEMISTRY: join(RAW_DIR, 'ngss-physical-science-parsed.json'),
  BIOLOGY: join(RAW_DIR, 'ngss-life-science-parsed.json'),
  CODING: join(RAW_DIR, 'csta-cs-parsed.json'),
  ENGLISH_LITERATURE: join(RAW_DIR, 'ccss-ela-parsed.json'),
  ECONOMICS: null,
  AI_LEARNING: null,
  LOGIC: null,
  ESSAY_WRITING: join(RAW_DIR, 'ccss-ela-parsed.json'),
};

function loadStandards(subject: SubjectEnum, grade: number): string {
  const filePath = STANDARDS_FILES[subject];
  if (!filePath || !existsSync(filePath)) {
    return `No formal standards file. Generate concepts appropriate for grade ${grade} ${subject.replace(/_/g, ' ').toLowerCase()}.`;
  }

  const all: ParsedStandard[] = JSON.parse(readFileSync(filePath, 'utf-8'));
  // Include current grade and one grade below for context
  const relevant = all.filter((s) => s.grade === grade || s.grade === grade - 1);
  if (relevant.length === 0) {
    const nearby = all.filter((s) => Math.abs(s.grade - grade) <= 1);
    if (nearby.length === 0) return `No standards found for grade ${grade} in this subject.`;
    relevant.push(...nearby.slice(0, 10));
  }

  const lines = relevant
    .slice(0, 20)
    .map((s) => `- ${s.code}: ${s.description}`);
  return `## Standards for Grade ${grade} ${subject.replace(/_/g, ' ')}\n${lines.join('\n')}`;
}

// ── Chapter map ────────────────────────────────────────────────────────────────

const CHAPTER_MAP: Record<string, string> = {
  operations: 'Minecraft Builder',
  fractions: 'Kitchen Scientist',
  measurement: 'Kitchen Scientist',
  geometry_shapes: 'Pattern Detective',
  forces_motion: 'Playground Lab',
  weather_patterns: 'Nature Explorer',
  weather_climate: 'Planet Patrol',
  patterns_algebra: 'Pattern Detective',
  matter: 'Kitchen Scientist',
  Mechanics: 'Playground Lab',
  Algebra: 'Logic Detective',
  Geometry: 'Pattern Detective',
  Data: 'Logic Detective',
  Number: 'Minecraft Builder',
  Measurement: 'Kitchen Scientist',
  Physics: 'Playground Lab',
  Chemistry: 'Kitchen Scientist',
  life_cycles: 'Body Detective',
  ecosystems: 'Ecosystem Explorer',
  heredity: 'Genetics Lab',
  genetics: 'Genetics Lab',
  evolution: 'Ecosystem Explorer',
  cell_biology: 'Body Detective',
  body_systems: 'Body Detective',
  photosynthesis: 'Ecosystem Explorer',
  food_webs: 'Ecosystem Explorer',
  natural_selection: 'Genetics Lab',
  dna_proteins: 'Genetics Lab',
  algorithms: 'Algorithm Arena',
  variables_data: 'Bug Hunter',
  control_flow: 'Code Architect',
  decomposition: 'Bug Hunter',
  functions: 'Code Architect',
  debugging: 'Bug Hunter',
  data_structures: 'Algorithm Arena',
  networking: 'Code Architect',
  cybersecurity: 'Code Architect',
  privacy_security: 'Code Architect',
  computing_society: 'Algorithm Arena',
  space_astronomy: 'Planet Patrol',
  earth_sun_moon: 'Planet Patrol',
  earth_systems: 'Weather Watcher',
  rock_cycle: 'Weather Watcher',
  plate_tectonics: 'Planet Patrol',
  water_cycle: 'Weather Watcher',
  natural_resources: 'Nature Explorer',
  natural_hazards: 'Weather Watcher',
  environmental_science: 'Weather Watcher',
  climate_change: 'Planet Patrol',
  weathering_erosion: 'Nature Explorer',
  earth_features: 'Planet Patrol',
  reading_literature: 'Story Detective',
  reading_informational: 'Story Detective',
  writing: 'Story Crafter',
  language: 'Poetry Explorer',
  figurative_language: 'Poetry Explorer',
  text_analysis: 'Story Detective',
  argument_writing: 'Argument Builder',
  narrative_writing: 'Story Crafter',
  economics_basic: 'Market Maker',
  supply_demand: 'Market Maker',
  personal_finance: 'Money Master',
  entrepreneurship: 'Market Maker',
  machine_learning: 'Robot Trainer',
  ai_ethics: 'Bias Detective',
  data_science: 'Robot Trainer',
  logic_puzzles: 'Puzzle Palace',
  deductive_reasoning: 'Logic Detective',
  set_theory: 'Logic Detective',
  combinatorics: 'Puzzle Palace',
};

// ── Age-band themes ────────────────────────────────────────────────────────────

function getThemes(grade: number): string {
  if (grade <= 5) return 'Minecraft, LEGO, cooking, playground, animals, space, sports, magic, treasure hunts, building';
  if (grade <= 7) return 'gaming, YouTube, social media, movies, music, sports teams, school clubs, art projects';
  return 'personal finance, entrepreneurship, engineering, scientific research, technology, coding projects, social issues, career exploration';
}

// ── CLI parsing ────────────────────────────────────────────────────────────────

function parseCliArgs(): { grade: number; subject: SubjectEnum; fillGaps: boolean } {
  const args = process.argv.slice(2);
  const fillGaps = args.includes('--fill-gaps');

  const gradeArg = args.find((a) => a.startsWith('--grade='));
  const subjectArg = args.find((a) => a.startsWith('--subject='));

  const grade = gradeArg ? parseInt(gradeArg.split('=')[1], 10) : 3;
  const subject = (subjectArg ? subjectArg.split('=')[1].toUpperCase() : 'MATHEMATICS') as SubjectEnum;

  const validSubjects: SubjectEnum[] = [
    'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'CODING',
    'ENGLISH_LITERATURE', 'ECONOMICS', 'AI_LEARNING', 'LOGIC', 'ESSAY_WRITING',
  ];

  if (!validSubjects.includes(subject)) {
    console.error(`Invalid subject: ${subject}. Valid: ${validSubjects.join(', ')}`);
    process.exit(1);
  }

  if (grade < 3 || grade > 9) {
    console.error(`Invalid grade: ${grade}. Must be 3-9.`);
    process.exit(1);
  }

  return { grade, subject, fillGaps };
}

// ── Fill-gaps mode ─────────────────────────────────────────────────────────────

const FILL_GAPS_SYSTEM = `You are an expert curriculum designer for elementary and middle school students (grades 3-9).

Generate quest scenarios for a specific concept. Quests feel like adventures.

Output ONLY valid JSON in this schema:
{
  "quests": [
    {
      "id": "snake_case_unique_id",
      "title": "Short fun title (3-5 words)",
      "prompt": "Story scenario 1-3 sentences, ends with a clear question. Use a real-world theme.",
      "subject": "MATHEMATICS" | "PHYSICS" | "CHEMISTRY" | "BIOLOGY" | "CODING" | "ENGLISH_LITERATURE" | "ECONOMICS" | "AI_LEARNING" | "LOGIC",
      "topic": "<concept topic>",
      "conceptKey": "<exact conceptKey provided>",
      "prerequisites": [],
      "tags": ["theme1", "theme2"]
    }
  ]
}

Rules:
- Generate exactly 2 quests for the given concept.
- At least 1 quest must have empty prerequisites.
- Make prompts concrete and specific — real numbers, real scenarios.
- Keep language appropriate for the concept's grade level.
- id must be unique — use conceptKey + short suffix (e.g., conceptKey_q1).
- Do NOT include the final answer in the prompt.
- CRITICAL: Each quest prompt MUST contain exactly ONE question mark.
- NEVER ask two questions or a multi-part question in a single prompt.
- The single question must have ONE clear, unambiguous correct answer (a number or short phrase).
- BAD: "How many blocks do you need? What is the total cost?" (two questions)
- GOOD: "How many blocks do you need in total?" (one question)`;

async function fillGapsMode() {
  const client = new LlmClient();

  const conceptsJson: ConceptRecord[] = JSON.parse(readFileSync(CONCEPTS_PATH, 'utf-8'));
  const allConceptsByKey = new Map<string, ConceptRecord>(
    conceptsJson.map((c) => [c.conceptKey, c])
  );

  const existingQuests: FullQuest[] = JSON.parse(readFileSync(QUESTS_JSON_PATH, 'utf-8'));
  const coveredKeys = new Set(existingQuests.map((q) => q.conceptKey));

  const questCountByKey = new Map<string, number>();
  for (const q of existingQuests) {
    questCountByKey.set(q.conceptKey, (questCountByKey.get(q.conceptKey) ?? 0) + 1);
  }
  const uncovered = Array.from(allConceptsByKey.values()).filter(
    (c) => (questCountByKey.get(c.conceptKey) ?? 0) < 2
  );
  console.log(`[fill-gaps] ${uncovered.length} concepts have fewer than 2 quests. Generating quests...`);

  const allConceptKeys = new Set(allConceptsByKey.keys());
  const newQuests: FullQuest[] = [];
  const existingIds = new Set(existingQuests.map((q) => q.id));
  let maxOrder = Math.max(0, ...existingQuests.map((q) => q.order ?? 0));

  let done = 0;
  for (const concept of uncovered) {
    const grade = concept.gradeLevel ?? 3;
    const themes = getThemes(grade);
    const existingCount = questCountByKey.get(concept.conceptKey) ?? 0;
    const needed = 2 - existingCount;

    const userPrompt = `Concept key: ${concept.conceptKey}
Name: ${concept.name}
Description: ${concept.description}
Subject: ${concept.subject}
Topic: ${concept.topic}
Grade level: ${grade}
Age-appropriate themes: ${themes}

Generate ${needed} quest(s) for this concept. Return ONLY the JSON object.`;

    try {
      const raw = await client.generateText({
        modelType: 'analysis',
        maxTokens: 1200,
        systemPrompt: FILL_GAPS_SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
        usePromptCache: false,
      });

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]) as { quests?: QuestSeed[] };
      if (!parsed.quests?.length) throw new Error('Empty quests array');

      for (const q of parsed.quests) {
        if (!q.id || !q.title || !q.prompt || !q.conceptKey) continue;
        if (q.conceptKey !== concept.conceptKey) q.conceptKey = concept.conceptKey;

        let id = q.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (existingIds.has(id)) id = `${id}_${Date.now() % 1000}`;
        existingIds.add(id);

        const safePrereqs = (q.prerequisites ?? []).filter((p) => allConceptKeys.has(p));
        maxOrder++;
        const chapter = CHAPTER_MAP[concept.topic] ?? 'Nature Explorer';

        newQuests.push({
          id,
          title: q.title,
          prompt: q.prompt,
          subject: q.subject ?? (concept.subject as string),
          topic: q.topic ?? concept.topic,
          conceptKey: concept.conceptKey,
          prerequisites: safePrereqs,
          tags: q.tags ?? [],
          chapter,
          order: maxOrder,
          gradeLevel: grade,
        });
      }
      done++;
      console.log(`  [${done}/${uncovered.length}] ✓ ${concept.conceptKey}`);
    } catch (err) {
      console.error(`  ✗ ${concept.conceptKey}: ${(err as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  const combined = [...existingQuests, ...newQuests];
  writeFileSync(QUESTS_JSON_PATH, JSON.stringify(combined, null, 2), 'utf-8');
  console.log(`\n[fill-gaps] Done: added ${newQuests.length} quests. Total: ${combined.length}`);
}

// ── Default generation mode ────────────────────────────────────────────────────

function buildConceptsSystemPrompt(grade: number, subject: SubjectEnum): string {
  const standards = loadStandards(subject, grade);
  const gradeAge = grade + 5;
  const themes = getThemes(grade);

  return `You are an expert curriculum designer for Grade ${grade} (ages ${gradeAge}-${gradeAge + 1}).

Generate elementary/middle school ${subject.replace(/_/g, ' ').toLowerCase()} concepts for this grade.

${standards}

Output ONLY valid JSON in this schema:
{
  "concepts": [
    {
      "conceptKey": "snake_case_unique_key",
      "subject": "${subject}",
      "topic": "topic_string",
      "name": "Short display name (3-5 words)",
      "description": "1-2 sentence description appropriate for grade ${grade}",
      "difficulty": 1,
      "gradeLevel": ${grade},
      "prerequisites": ["conceptKey1", "conceptKey2"]
    }
  ]
}

Rules:
- Generate ~30 concepts for this grade/subject.
- Include 5+ concepts with no prerequisites (entry points for new learners).
- Build logical prerequisite chains (e.g., A -> B -> C).
- conceptKey must be snake_case, descriptive, and globally unique (include subject hint if needed, e.g., bio_cell_division).
- difficulty: 1 (easy) to 5 (hard). Most should be 1-3 for grade ${grade}.
- topic must be a single snake_case string describing the concept area.
- gradeLevel must be ${grade}.
- subject must be "${subject}".`;
}

function buildQuestsSystemPrompt(grade: number, subject: SubjectEnum): string {
  const themes = getThemes(grade);

  return `You are an expert curriculum designer for Grade ${grade} (ages ${grade + 5}-${grade + 6}).

Generate quest scenarios that feel like adventures. Age-appropriate themes: ${themes}.

Output ONLY valid JSON in this schema:
{
  "quests": [
    {
      "id": "snake_case_id",
      "title": "Fun short title (3-5 words)",
      "prompt": "Problem statement as a story — 1-3 sentences. Ends with a clear question.",
      "subject": "${subject}",
      "topic": "topic_string",
      "conceptKey": "concept_key_from_concepts",
      "prerequisites": ["conceptKey1"],
      "tags": ["theme1", "theme2"]
    }
  ]
}

Rules:
- Generate 2 quests per concept provided (total ~60 quests).
- At least 30% of quests must have empty prerequisites.
- Make prompts concrete: real numbers, real scenarios, engaging story context.
- Keep language and complexity appropriate for grade ${grade}.
- conceptKey must match a concept from the concepts list.
- id must be globally unique — use descriptive snake_case with grade indicator.
- tags: use themes like ${themes.split(', ').slice(0, 5).join(', ')}.
- CRITICAL: Each quest prompt MUST contain exactly ONE question mark.
- NEVER ask two questions or a multi-part question in a single prompt.
- The single question must have ONE clear, unambiguous correct answer (a number or short phrase).
- BAD: "How many blocks do you need? What is the total cost?" (two questions)
- GOOD: "How many blocks do you need in total?" (one question)`;
}

async function main() {
  const { grade, subject, fillGaps } = parseCliArgs();

  if (fillGaps) {
    await fillGapsMode();
    return;
  }

  console.log(`Generating concepts + quests for Grade ${grade} / ${subject}...`);

  // Load existing concepts to avoid duplicates
  let existingConcepts: ConceptRecord[] = [];
  if (existsSync(CONCEPTS_PATH)) {
    existingConcepts = JSON.parse(readFileSync(CONCEPTS_PATH, 'utf-8'));
  }
  const existingKeys = new Set(existingConcepts.map((c) => c.conceptKey));

  let newConcepts: ConceptSeed[] = [];
  let newQuests: QuestSeed[] = [];

  if (process.env.SKIP_LLM !== '1') {
    const client = new LlmClient();
    const conceptsSystem = buildConceptsSystemPrompt(grade, subject);

    try {
      console.log('Generating concepts via LLM...');
      const conceptsRes = await client.generateText({
        modelType: 'analysis',
        maxTokens: 8000,
        systemPrompt: conceptsSystem,
        messages: [{ role: 'user', content: `Generate ${grade} ${subject} concepts. Return ONLY the JSON object.` }],
        usePromptCache: false,
      });
      const jsonMatch = conceptsRes.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { concepts?: ConceptSeed[] };
        if (parsed.concepts?.length) {
          newConcepts = parsed.concepts.filter((c) => !existingKeys.has(c.conceptKey));
          console.log(`  Got ${parsed.concepts.length} concepts, ${newConcepts.length} are new`);
        }
      }
    } catch (e) {
      console.warn('LLM concept generation failed:', (e as Error).message);
    }

    if (newConcepts.length > 0) {
      const questsSystem = buildQuestsSystemPrompt(grade, subject);
      const conceptList = newConcepts.map((c) => `${c.conceptKey} (${c.name})`).join(', ');

      try {
        console.log('Generating quests via LLM...');
        const questsRes = await client.generateText({
          modelType: 'analysis',
          maxTokens: 12000,
          systemPrompt: questsSystem,
          messages: [{
            role: 'user',
            content: `Concepts: ${conceptList}\n\nGenerate 2 quests per concept. Return ONLY the JSON object.`
          }],
          usePromptCache: false,
        });
        const jsonMatch = questsRes.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { quests?: QuestSeed[] };
          if (parsed.quests?.length) {
            newQuests = parsed.quests;
            console.log(`  Got ${newQuests.length} quests`);
          }
        }
      } catch (e) {
        console.warn('LLM quest generation failed:', (e as Error).message);
      }
    }
  } else {
    console.log('SKIP_LLM=1: skipping LLM calls');
  }

  if (newConcepts.length === 0) {
    console.log('No new concepts generated. Exiting without modifying files.');
    return;
  }

  // Append concepts to concepts.json
  const updatedConcepts = [...existingConcepts, ...newConcepts];
  writeFileSync(CONCEPTS_PATH, JSON.stringify(updatedConcepts, null, 2), 'utf-8');
  console.log(`Appended ${newConcepts.length} concepts to concepts.json (total: ${updatedConcepts.length})`);

  // Append quests to quests.json
  if (newQuests.length > 0 && existsSync(QUESTS_JSON_PATH)) {
    const existingQuests: FullQuest[] = JSON.parse(readFileSync(QUESTS_JSON_PATH, 'utf-8'));
    const existingQuestIds = new Set(existingQuests.map((q) => q.id));
    let maxOrder = Math.max(0, ...existingQuests.map((q) => q.order ?? 0));

    // Build lookup covering both newly generated AND pre-existing concepts
    const allConceptsLookup = new Map<string, ConceptSeed | ConceptRecord>(
      [...existingConcepts, ...newConcepts].map((c) => [c.conceptKey, c])
    );

    const fullQuests: FullQuest[] = [];
    for (const q of newQuests) {
      if (!q.id || !q.title || !q.prompt || !q.conceptKey) continue;
      const concept = allConceptsLookup.get(q.conceptKey);
      if (!concept) continue;

      let id = q.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (existingQuestIds.has(id)) id = `${id}_g${grade}`;
      existingQuestIds.add(id);

      const safePrereqs = (q.prerequisites ?? []).filter((p) => allConceptsLookup.has(p));
      maxOrder++;
      const chapter = CHAPTER_MAP[concept.topic] ?? CHAPTER_MAP[q.topic] ?? 'Nature Explorer';

      fullQuests.push({
        id,
        title: q.title,
        prompt: q.prompt,
        subject: subject as string,
        topic: q.topic ?? concept.topic,
        conceptKey: concept.conceptKey,
        prerequisites: safePrereqs,
        tags: q.tags ?? [],
        chapter,
        order: maxOrder,
        gradeLevel: grade,
      });
    }

    const updatedQuests = [...existingQuests, ...fullQuests];
    writeFileSync(QUESTS_JSON_PATH, JSON.stringify(updatedQuests, null, 2), 'utf-8');
    console.log(`Appended ${fullQuests.length} quests to quests.json (total: ${updatedQuests.length})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
