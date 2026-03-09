/**
 * generate-templates.ts (generalized)
 *
 * Generates MCQ templates for all concepts in concepts.json, using LlmClient.
 * Supports --grade-range and --subject flags to target specific subsets.
 *
 * Usage:
 *   cd vidya/apps/api
 *   LLM_PROVIDER=openai OPENAI_API_KEY=xxx npx tsx scripts/generate-templates.ts
 *   LLM_PROVIDER=openai OPENAI_API_KEY=xxx npx tsx scripts/generate-templates.ts \
 *     --grade-range=8-9 --subject=BIOLOGY,CODING
 *   LLM_PROVIDER=openai OPENAI_API_KEY=xxx npx tsx scripts/generate-templates.ts \
 *     --concepts=set_theory_intro,venn_diagrams_basic
 *
 * Optional flags:
 *   --grade-range=3-9           (filter by grade range, inclusive)
 *   --subject=MATH,PHYSICS      (comma-separated subject names)
 *   --concepts=key1,key2        (target specific concept keys)
 *   --count=5                   (templates per concept, default 5)
 *   --dry-run                   (print output without writing)
 *
 * WARNING: question-templates.json must always contain ALL templates.
 * seed.ts does deleteMany+createMany, so never generate into a separate file.
 *
 * ENV REQUIRED:
 *   LLM_PROVIDER=openai
 *   OPENAI_API_KEY=xxx
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { LlmClient } from '../src/services/llm/client';

// Load .env so API keys are available when running standalone
import { config as loadEnv } from 'dotenv';
loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Schema ─────────────────────────────────────────────────────────────────────

const TemplateSchema = z.object({
  conceptKey: z.string().min(1),
  gradeLevel: z.number().int().min(1).max(9),
  difficulty: z.number().int().min(1).max(5),
  subject: z.string().optional(),
  questionText: z.string().min(10).max(400),
  answerFormula: z.string().min(1),
  distractors: z.array(z.string()).length(2),
  solutionSteps: z.array(z.string()).min(2),
  misconceptionHints: z.array(z.string()).length(2).optional(),
  tags: z.array(z.string()),
  source: z.string(),
});

type Template = z.infer<typeof TemplateSchema>;

// ── Paths ──────────────────────────────────────────────────────────────────────

const SEED_DIR = join(__dirname, '../prisma/seed-data');
const CONCEPTS_PATH = join(SEED_DIR, 'concepts.json');
const TEMPLATES_PATH = join(SEED_DIR, 'question-templates.json');

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── CLI parsing ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const conceptsArg = args.find((a) => a.startsWith('--concepts='))?.split('=')[1];
  const countArg = args.find((a) => a.startsWith('--count='))?.split('=')[1];
  const gradeRangeArg = args.find((a) => a.startsWith('--grade-range='))?.split('=')[1];
  const subjectArg = args.find((a) => a.startsWith('--subject='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  let minGrade = 3, maxGrade = 9;
  if (gradeRangeArg) {
    const [min, max] = gradeRangeArg.split('-').map(Number);
    minGrade = min;
    maxGrade = max ?? min;
  }

  return {
    targetConcepts: conceptsArg ? conceptsArg.split(',') : null,
    count: countArg ? parseInt(countArg, 10) : 5,
    dryRun,
    minGrade,
    maxGrade,
    targetSubjects: subjectArg ? subjectArg.split(',').map((s) => s.toUpperCase()) : null,
  };
}

// ── Deduplication ──────────────────────────────────────────────────────────────

function levenshteinSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().slice(0, 80);
  const lb = b.toLowerCase().slice(0, 80);
  if (la === lb) return 1;
  const m = la.length, n = lb.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = la[i - 1] === lb[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

function isDuplicate(newText: string, existingTexts: string[]): boolean {
  return existingTexts.some((t) => levenshteinSimilarity(newText, t) > 0.75);
}

// ── Subject-specific themes and prompt hints ───────────────────────────────────

const THEMES_BY_SUBJECT: Record<string, string[]> = {
  MATHEMATICS: ['Minecraft building', 'cooking/baking', 'shopping/money', 'sports statistics', 'space exploration'],
  PHYSICS: ['playground/sports', 'roller coasters', 'space missions', 'cooking science', 'building/engineering'],
  CHEMISTRY: ['kitchen chemistry', 'cooking reactions', 'science lab', 'medicine', 'environment'],
  BIOLOGY: ['nature hike', 'animal kingdom', 'human body', 'gardening', 'food and nutrition'],
  CODING: ['game development', 'robot programming', 'website building', 'app creation', 'puzzle solving'],
  ENGLISH_LITERATURE: ['story analysis', 'news reporting', 'book club', 'creative writing', 'debate'],
  ECONOMICS: ['running a lemonade stand', 'school store', 'saving for a game', 'stock market simulation', 'business plan'],
  AI_LEARNING: ['training a game AI', 'spam filter', 'recommendation system', 'self-driving cars', 'voice assistant'],
  LOGIC: ['detective mystery', 'escape room', 'riddles', 'logic puzzles', 'strategy games'],
  ESSAY_WRITING: ['persuasive letter', 'news article', 'book review', 'personal narrative', 'research essay'],
};

const SUBJECT_PROMPT_HINTS: Record<string, string> = {
  MATHEMATICS: 'Use concrete numbers and calculations. Show arithmetic clearly in solutionSteps.',
  PHYSICS: 'Include units in answers (e.g., m/s, N, J). Reference real physical phenomena.',
  CHEMISTRY: 'Use correct chemical symbols and reaction notation where appropriate.',
  BIOLOGY: 'Use accurate biological terminology. Connect to real organisms and systems.',
  CODING: 'Use pseudocode or describe algorithmic steps. Focus on computational thinking.',
  ENGLISH_LITERATURE: 'Reference specific literary devices, text structure, or author purpose. Quote or paraphrase text.',
  ECONOMICS: 'Include dollar amounts or quantities. Require actual calculation for the answer.',
  AI_LEARNING: 'Describe a real AI/ML scenario. Include conceptual or mathematical reasoning.',
  LOGIC: 'Require deductive or inductive reasoning. Avoid ambiguous answers.',
  ESSAY_WRITING: 'Focus on writing structure, argument quality, or rhetorical techniques.',
};

// ── LLM call ───────────────────────────────────────────────────────────────────

async function generateTemplatesForConcept(
  client: LlmClient,
  concept: ConceptRecord,
  count: number,
  existingTexts: string[],
): Promise<Template[]> {
  const gradeLevel = concept.gradeLevel ?? 3;
  const subject = concept.subject ?? 'MATHEMATICS';
  const themes = (THEMES_BY_SUBJECT[subject] ?? THEMES_BY_SUBJECT.MATHEMATICS).slice(0, count);
  const subjectHint = SUBJECT_PROMPT_HINTS[subject] ?? '';

  const difficultyDistribution = count >= 5
    ? `1 easy (difficulty:1), 2 medium (difficulty:2 or 3), ${count - 3} hard (difficulty:4 or 5)`
    : `mix of difficulties 1-5 for grade ${gradeLevel}`;

  const prompt = `Generate exactly ${count} multiple-choice question templates for this educational concept.

Concept key: ${concept.conceptKey}
Name: ${concept.name}
Subject: ${subject}
Grade level: ${gradeLevel}
Description: ${concept.description}

Themes to use (one per template): ${themes.join(', ')}
Subject-specific guidance: ${subjectHint}
Difficulty distribution: ${difficultyDistribution}

Each template must follow this EXACT JSON schema:
{
  "conceptKey": "${concept.conceptKey}",
  "gradeLevel": ${gradeLevel},
  "difficulty": <1-5 integer>,
  "subject": "${subject}",
  "questionText": "<engaging real-world scenario question, max 300 chars>",
  "answerFormula": "<correct answer, concise, max 100 chars>",
  "distractors": ["<misconception-based wrong answer 1, max 50 chars>", "<misconception-based wrong answer 2, max 50 chars>"],
  "solutionSteps": ["<step 1: one cognitive operation>", "<step 2>", "<step 3 if needed>"],
  "misconceptionHints": ["<what misunderstanding leads a student to pick distractor 1>", "<what misunderstanding leads to distractor 2>"],
  "tags": ["<theme tag>", "${subject.toLowerCase()}"],
  "source": "generated"
}

Rules:
- The correct answerFormula MUST NOT appear in distractors
- Each distractor MUST represent a real, common student mistake for this concept
- misconceptionHints must have exactly 2 items (one per distractor), each under 100 chars
- distractors must be exactly 2 items
- solutionSteps must have at least 2 items showing how to reach the answer
- questionText must be an engaging real-world scenario appropriate for grade ${gradeLevel}
- Each template must use a DIFFERENT theme from the list above

Return ONLY a valid JSON array of ${count} objects. No markdown fences, no explanation.`;

  const raw = await client.generateText({
    modelType: 'analysis',
    maxTokens: 3000,
    systemPrompt: `You are an expert K-12 curriculum designer with 15+ years of experience creating pedagogically rigorous assessment items.

Your task: Generate multiple-choice question templates that are educationally sound, grade-appropriate, and useful for Socratic tutoring.

CORRECTNESS (non-negotiable):
- The answerFormula MUST be factually and mathematically correct — double-check every calculation.
- solutionSteps must logically and sequentially lead to answerFormula; each step is ONE cognitive operation.
- Distractors must represent REAL student misconceptions (not random wrong answers), e.g., sign errors, unit confusion, common operation mistakes.

GRADE-APPROPRIATE LANGUAGE:
- Grade 3-4: Simple sentences, concrete objects, no variables. Numbers under 100.
- Grade 5-6: 2-step problems, fractions/decimals OK, one variable allowed.
- Grade 7-8: Multi-step algebra, geometry, rational numbers, two variables allowed.
- Grade 9+: Quadratics, proofs, systems, trigonometry introductions.

QUESTION QUALITY:
- questionText must be an engaging real-world scenario (NOT "Calculate X" — use a story).
- Each question must use a DIFFERENT real-world theme (cooking, gaming, science, sports, etc.).
- Max 300 chars for questionText. Max 50 chars per distractor. Max 100 chars for answerFormula.
- solutionSteps: minimum 2 steps, each under 100 chars, written as a student would reason aloud.

MISCONCEPTION FIELD:
- For each distractor, identify the specific misconception pattern that leads a student to pick it.
  E.g., "Forgot to multiply both sides", "Confused area with perimeter", "Off-by-one counting error".

OUTPUT: Return ONLY a valid JSON array. No markdown fences. No explanation text outside the array.`,
    messages: [{ role: 'user', content: prompt }],
    usePromptCache: false,
  });

  // Strip markdown fences if present
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();

  let parsed: unknown[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      console.warn(`  ⚠ JSON parse failed for ${concept.conceptKey}`);
      return [];
    }
    try {
      parsed = JSON.parse(arrayMatch[0]);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const validated: Template[] = [];
  for (const item of parsed) {
    const result = TemplateSchema.safeParse(item);
    if (result.success) {
      if (!isDuplicate(result.data.questionText, existingTexts)) {
        validated.push(result.data);
        existingTexts.push(result.data.questionText);
      } else {
        console.log(`    ↩ Skipped duplicate`);
      }
    } else {
      console.warn(`  ⚠ Validation failed: ${result.error.issues[0]?.message}`);
    }
  }

  return validated;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const { targetConcepts, count, dryRun, minGrade, maxGrade, targetSubjects } = parseArgs();

  // Load all concepts
  const allConcepts: ConceptRecord[] = JSON.parse(fs.readFileSync(CONCEPTS_PATH, 'utf-8'));

  // Filter concepts
  let concepts = allConcepts.filter((c) => {
    const grade = c.gradeLevel ?? 3;
    if (grade < minGrade || grade > maxGrade) return false;
    if (targetSubjects && !targetSubjects.includes(c.subject?.toUpperCase() ?? 'MATHEMATICS')) return false;
    if (targetConcepts && !targetConcepts.includes(c.conceptKey)) return false;
    return true;
  });

  if (concepts.length === 0) {
    console.log('No concepts match the given filters. Exiting.');
    return;
  }

  console.log(`Generating ${count} templates per concept for ${concepts.length} concepts`);
  console.log(`Grade range: ${minGrade}-${maxGrade}, Subjects: ${targetSubjects?.join(',') ?? 'all'}\n`);

  // Load existing templates
  const existingTemplates: Template[] = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf-8'));
  const existingTexts = existingTemplates.map((t) => t.questionText);
  console.log(`Loaded ${existingTemplates.length} existing templates\n`);

  const client = new LlmClient();
  const newTemplates: Template[] = [];
  let successCount = 0;

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    console.log(`  [${i + 1}/${concepts.length}] ${concept.conceptKey} (G${concept.gradeLevel ?? 3}, ${concept.subject})`);

    try {
      const generated = await generateTemplatesForConcept(client, concept, count, existingTexts);
      newTemplates.push(...generated);
      successCount += generated.length;
      console.log(`    ✓ ${generated.length} templates added`);
    } catch (err) {
      console.error(`    ✗ Error: ${(err as Error).message}`);
    }

    // Rate limiting delay
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\nSummary: ${successCount} new templates generated`);

  if (dryRun) {
    console.log('\n-- DRY RUN: first 2 templates --');
    console.log(JSON.stringify(newTemplates.slice(0, 2), null, 2));
    return;
  }

  if (newTemplates.length === 0) {
    console.log('No new templates to write.');
    return;
  }

  const combined = [...existingTemplates, ...newTemplates];
  fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(combined, null, 2));
  console.log(`\nWritten ${combined.length} total templates to ${TEMPLATES_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
