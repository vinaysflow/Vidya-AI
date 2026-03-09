/**
 * fix-quest-chapters.ts
 *
 * Re-assigns chapters for quests that currently fall back to "Nature Explorer"
 * (or other incorrect chapters) due to topic-string matching failures.
 *
 * Strategy:
 *  1. For non-MATHEMATICS subjects, use subject-level default chapters.
 *  2. For MATHEMATICS, use topic-keyword matching (same logic as original CHAPTER_MAP
 *     but with expanded keywords).
 *  3. Write updated quests.json.
 *
 * Usage:
 *   cd vidya/apps/api
 *   npx tsx scripts/fix-quest-chapters.ts
 *   npx tsx scripts/fix-quest-chapters.ts --dry-run
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTS_PATH = join(__dirname, '../../web/src/data/quests.json');
const CONCEPTS_PATH = join(__dirname, '../prisma/seed-data/concepts.json');

const dryRun = process.argv.includes('--dry-run');

interface Quest {
  id: string;
  title: string;
  prompt: string;
  subject: string;
  topic: string;
  conceptKey: string;
  prerequisites: string[];
  tags: string[];
  chapter?: string;
  order?: number;
  gradeLevel?: number;
}

interface ConceptRecord {
  conceptKey: string;
  subject: string;
  topic: string;
  name: string;
  gradeLevel?: number;
}

// Primary: subject → default chapter
const SUBJECT_CHAPTER_MAP: Record<string, string> = {
  BIOLOGY: 'Body Detective',
  CODING: 'Code Architect',
  ECONOMICS: 'Money Master',
  ENGLISH_LITERATURE: 'Story Detective',
  AI_LEARNING: 'Robot Trainer',
  LOGIC: 'Puzzle Palace',
  PHYSICS: 'Playground Lab',
  CHEMISTRY: 'Kitchen Scientist',
  // MATHEMATICS handled by topic keywords below
};

// Topic keyword → chapter for MATHEMATICS (expanded from original CHAPTER_MAP)
const MATH_TOPIC_CHAPTER: Array<{ keywords: string[]; chapter: string }> = [
  { keywords: ['minecraft', 'builder', 'geometry', 'shape', 'area', 'volume', 'perimeter', 'coordinate', 'polygon', 'triangle', 'angle', 'circle', 'solid'], chapter: 'Minecraft Builder' },
  { keywords: ['fraction', 'decimal', 'ratio', 'proportion', 'percent', 'rate', 'unit_rate', 'rational'], chapter: 'Kitchen Scientist' },
  { keywords: ['addition', 'subtraction', 'multiplication', 'division', 'arithmetic', 'number', 'integer', 'place_value', 'rounding', 'estimation', 'skip_counting', 'counting', 'fact'], chapter: 'Playground Lab' },
  { keywords: ['pattern', 'algebra', 'equation', 'expression', 'variable', 'function', 'sequence', 'linear', 'quadratic', 'polynomial', 'factor', 'exponent', 'power', 'root', 'inequality', 'system'], chapter: 'Pattern Detective' },
  { keywords: ['data', 'statistics', 'probability', 'mean', 'median', 'mode', 'graph', 'chart', 'plot', 'survey', 'sample', 'distribution'], chapter: 'Logic Detective' },
  { keywords: ['word_problem', 'money', 'cost', 'price', 'profit', 'budget', 'interest', 'percent_app', 'tax', 'tip', 'discount'], chapter: 'Minecraft Builder' },
  { keywords: ['measurement', 'time', 'clock', 'calendar', 'weight', 'mass', 'temperature', 'length', 'capacity', 'convert'], chapter: 'Kitchen Scientist' },
];

function getChapterForMathTopic(topic: string, conceptKey: string): string {
  const search = `${topic} ${conceptKey}`.toLowerCase();
  for (const { keywords, chapter } of MATH_TOPIC_CHAPTER) {
    if (keywords.some((kw) => search.includes(kw.toLowerCase()))) {
      return chapter;
    }
  }
  return 'Minecraft Builder'; // math default
}

function assignChapter(quest: Quest, conceptMap: Map<string, ConceptRecord>): string {
  const subject = quest.subject?.toUpperCase() ?? 'MATHEMATICS';

  if (subject !== 'MATHEMATICS') {
    return SUBJECT_CHAPTER_MAP[subject] ?? 'Adventures';
  }

  // For math: use topic from quest or concept
  const concept = conceptMap.get(quest.conceptKey);
  const topic = quest.topic ?? concept?.topic ?? quest.conceptKey;
  return getChapterForMathTopic(topic, quest.conceptKey);
}

function main() {
  const quests: Quest[] = JSON.parse(readFileSync(QUESTS_PATH, 'utf-8'));
  const concepts: ConceptRecord[] = JSON.parse(readFileSync(CONCEPTS_PATH, 'utf-8'));
  const conceptMap = new Map(concepts.map((c) => [c.conceptKey, c]));

  let changed = 0;
  const chapterCounts: Record<string, number> = {};

  const updated = quests.map((quest) => {
    const newChapter = assignChapter(quest, conceptMap);
    chapterCounts[newChapter] = (chapterCounts[newChapter] ?? 0) + 1;
    if (quest.chapter !== newChapter) {
      changed++;
      return { ...quest, chapter: newChapter };
    }
    return quest;
  });

  console.log(`\nChapter distribution after fix:`);
  Object.entries(chapterCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ch, count]) => console.log(`  ${ch}: ${count}`));

  console.log(`\nTotal quests: ${quests.length}`);
  console.log(`Chapters reassigned: ${changed}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No files written.');
    return;
  }

  writeFileSync(QUESTS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  console.log(`\nWritten to ${QUESTS_PATH}`);
}

main();
