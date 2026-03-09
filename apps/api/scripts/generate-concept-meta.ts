/**
 * generate-concept-meta.ts
 *
 * Generates ConceptMeta entries (emoji, color, textColor, funFact, illustrationHint,
 * parentExplanation) for all concepts in concepts.json that are missing from
 * conceptMeta.ts.
 *
 * Usage:
 *   cd vidya/apps/api
 *   npx tsx scripts/generate-concept-meta.ts
 *   npx tsx scripts/generate-concept-meta.ts --dry-run   (print without writing)
 *   npx tsx scripts/generate-concept-meta.ts --all        (regenerate all, not just missing)
 *
 * ENV REQUIRED: .env with LLM_PROVIDER=openai OPENAI_API_KEY=xxx
 *
 * Output: appends to apps/web/src/data/conceptMeta.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LlmClient } from '../src/services/llm/client';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_PATH = join(__dirname, '../prisma/seed-data/concepts.json');
const CONCEPT_META_PATH = join(__dirname, '../../web/src/data/conceptMeta.ts');

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

interface ConceptMeta {
  emoji: string;
  color: string;
  textColor: string;
  funFact: string;
  illustrationHint: string;
  parentExplanation: string;
}

const COLORS_BY_SUBJECT: Record<string, { color: string; textColor: string }> = {
  MATHEMATICS: { color: 'bg-blue-100', textColor: 'text-blue-700' },
  PHYSICS: { color: 'bg-orange-100', textColor: 'text-orange-700' },
  CHEMISTRY: { color: 'bg-purple-100', textColor: 'text-purple-700' },
  BIOLOGY: { color: 'bg-green-100', textColor: 'text-green-700' },
  CODING: { color: 'bg-cyan-100', textColor: 'text-cyan-700' },
  ENGLISH_LITERATURE: { color: 'bg-rose-100', textColor: 'text-rose-700' },
  ECONOMICS: { color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  AI_LEARNING: { color: 'bg-violet-100', textColor: 'text-violet-700' },
  LOGIC: { color: 'bg-teal-100', textColor: 'text-teal-700' },
  ESSAY_WRITING: { color: 'bg-pink-100', textColor: 'text-pink-700' },
};

const SYSTEM_PROMPT = `You are a curriculum designer creating kid-friendly metadata for educational concepts.
Given a concept, generate a JSON object with these fields:
- emoji: single emoji that represents the concept (must be actual emoji character)
- color: Tailwind CSS bg color class (e.g., "bg-blue-100", "bg-green-100", "bg-amber-100")
- textColor: matching Tailwind CSS text color class (e.g., "text-blue-700")
- funFact: one sentence, kid-friendly fun fact about this concept (max 120 chars)
- illustrationHint: brief prompt for AI image generation (max 80 chars), e.g., "colorful frogs jumping on lily pads, flat vector style"
- parentExplanation: one sentence for parents explaining what this concept is and why it matters for their child's development (max 150 chars), e.g., "Fractions help children understand sharing and division, which are essential for everyday math and later algebra."

Return ONLY valid JSON with these 6 fields. No markdown, no explanation.`;

async function generateMeta(client: LlmClient, concept: ConceptRecord): Promise<ConceptMeta | null> {
  const subject = concept.subject ?? 'MATHEMATICS';
  const defaultColors = COLORS_BY_SUBJECT[subject] ?? { color: 'bg-slate-100', textColor: 'text-slate-700' };

  const prompt = `Concept: ${concept.name}
Subject: ${subject}
Description: ${concept.description}
Grade: ${concept.gradeLevel ?? 3}
Topic: ${concept.topic}

Generate metadata. Use color "${defaultColors.color}" and textColor "${defaultColors.textColor}" unless a more fitting color exists.`;

  try {
    const raw = await client.generateText({
      modelType: 'analysis',
      maxTokens: 200,
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      usePromptCache: false,
    });

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ConceptMeta>;
    if (!parsed.emoji || !parsed.funFact) return null;

    return {
      emoji: parsed.emoji,
      color: parsed.color ?? defaultColors.color,
      textColor: parsed.textColor ?? defaultColors.textColor,
      funFact: (parsed.funFact ?? '').slice(0, 120),
      illustrationHint: (parsed.illustrationHint ?? `${concept.topic} concept, flat vector, colorful`).slice(0, 80),
      parentExplanation: (parsed.parentExplanation ?? `${concept.name} is an important skill in ${concept.subject.toLowerCase()} for grade ${concept.gradeLevel ?? 3} students.`).slice(0, 150),
    };
  } catch {
    return null;
  }
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatEntry(key: string, meta: ConceptMeta): string {
  return `  ${key}: {
    emoji: '${escapeStr(meta.emoji)}',
    color: '${meta.color}',
    textColor: '${meta.textColor}',
    funFact: '${escapeStr(meta.funFact)}',
    illustrationHint: '${escapeStr(meta.illustrationHint)}',
    parentExplanation: '${escapeStr(meta.parentExplanation)}',
  },`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const regenerateAll = process.argv.includes('--all');

  const concepts: ConceptRecord[] = JSON.parse(readFileSync(CONCEPTS_PATH, 'utf-8'));
  const metaContent = readFileSync(CONCEPT_META_PATH, 'utf-8');

  // Find existing keys in conceptMeta.ts
  const existingKeys = new Set<string>();
  const keyMatches = metaContent.matchAll(/^  ([a-z][a-z0-9_]*): \{/gm);
  for (const m of keyMatches) {
    existingKeys.add(m[1]);
  }

  console.log(`Concepts in concepts.json: ${concepts.length}`);
  console.log(`Existing meta entries: ${existingKeys.size}`);

  const missing = concepts.filter((c) => regenerateAll || !existingKeys.has(c.conceptKey));
  console.log(`Concepts needing meta: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log('All concepts have metadata. Done.');
    return;
  }

  const client = new LlmClient();
  const newEntries: Array<{ key: string; meta: ConceptMeta }> = [];

  for (let i = 0; i < missing.length; i++) {
    const concept = missing[i];
    process.stdout.write(`  [${i + 1}/${missing.length}] ${concept.conceptKey}... `);

    const meta = await generateMeta(client, concept);
    if (meta) {
      newEntries.push({ key: concept.conceptKey, meta });
      console.log(`✓ ${meta.emoji}`);
    } else {
      // Fallback metadata
      const defaultColors = COLORS_BY_SUBJECT[concept.subject] ?? { color: 'bg-slate-100', textColor: 'text-slate-700' };
      newEntries.push({
        key: concept.conceptKey,
        meta: {
          emoji: '⭐',
          color: defaultColors.color,
          textColor: defaultColors.textColor,
          funFact: `${concept.name} is an important concept for grade ${concept.gradeLevel ?? 3} learners!`,
          illustrationHint: `${concept.topic} concept illustration, flat vector, colorful`,
          parentExplanation: `${concept.name} builds essential skills in ${concept.subject.toLowerCase().replace('_', ' ')} that your child will use throughout school and life.`,
        },
      });
      console.log('⚠ used fallback');
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nGenerated ${newEntries.length} new meta entries`);

  if (dryRun) {
    console.log('\n-- DRY RUN: first 3 entries --');
    for (const { key, meta } of newEntries.slice(0, 3)) {
      console.log(formatEntry(key, meta));
    }
    return;
  }

  // Insert new entries before the closing `};` of CONCEPT_META
  const newBlock = newEntries.map(({ key, meta }) => formatEntry(key, meta)).join('\n');
  const closingPattern = /^};\s*$/m;
  const insertPoint = metaContent.search(closingPattern);

  if (insertPoint === -1) {
    console.error('Could not find closing `};` in conceptMeta.ts. Manual insertion needed.');
    console.log('\nNew entries to add:\n', newBlock);
    return;
  }

  const updatedContent =
    metaContent.slice(0, insertPoint) +
    '  // ===== Auto-generated meta entries =====\n' +
    newBlock +
    '\n' +
    metaContent.slice(insertPoint);

  writeFileSync(CONCEPT_META_PATH, updatedContent, 'utf-8');
  console.log(`\nWritten to ${CONCEPT_META_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
