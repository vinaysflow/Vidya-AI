/**
 * fix-compound-quests.ts
 *
 * Finds all quests in quests.json whose prompt contains 2+ question marks
 * (compound/multi-part questions) and rewrites each to ask exactly ONE clear
 * question using an LLM. The scenario/theme and grade level are preserved.
 *
 * Usage:
 *   cd vidya/apps/api
 *   npx tsx scripts/fix-compound-quests.ts              # fix all compound quests
 *   npx tsx scripts/fix-compound-quests.ts --dry-run    # preview, don't write
 *   npx tsx scripts/fix-compound-quests.ts --limit=50   # process first 50
 *
 * ENV (defaults to .env):
 *   OPENAI_API_KEY=xxx
 *   LLM_PROVIDER=openai
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LlmClient } from '../src/services/llm/client';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTS_PATH = join(__dirname, '../../web/src/data/quests.json');

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

const SYSTEM_PROMPT = `You are a curriculum editor for a kids' learning app (grades 3-9).

Your job is to rewrite quest prompts that ask multiple questions so they ask exactly ONE question.

Rules:
- Keep the fun story/scenario setting and all concrete numbers from the original.
- Ask EXACTLY one question with ONE clear, unambiguous correct answer.
- The answer must be a single number or short factual phrase — not an explanation.
- Choose the most interesting/educational single question from the original compound prompt.
- Use grade-appropriate language (simple vocabulary for grades 3-5, slightly more for 6-9).
- The prompt should be 1-3 sentences total.
- End with exactly one question mark.
- NEVER give the answer in the prompt.
- Return ONLY the rewritten prompt text — no quotes, no explanation, no JSON.`;

function countQuestionMarks(s: string): number {
  return (s.match(/\?/g) ?? []).length;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
  return { dryRun, limit };
}

async function rewritePrompt(client: LlmClient, quest: Quest): Promise<string> {
  const grade = quest.gradeLevel ?? 5;
  const userMsg = `Grade level: ${grade}
Subject: ${quest.subject}
Title: ${quest.title}
Original prompt:
"${quest.prompt}"

Rewrite this prompt to ask exactly ONE question. Return ONLY the rewritten prompt.`;

  const result = await client.generateText({
    modelType: 'analysis',
    maxTokens: 200,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
    usePromptCache: true,
  });

  return result.trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const { dryRun, limit } = parseArgs();

  const quests: Quest[] = JSON.parse(readFileSync(QUESTS_PATH, 'utf-8'));
  const compound = quests.filter((q) => countQuestionMarks(q.prompt) >= 2);

  console.log(`Total quests:    ${quests.length}`);
  console.log(`Compound quests: ${compound.length}`);

  const toProcess = compound.slice(0, limit === Infinity ? compound.length : limit);
  console.log(`Processing:      ${toProcess.length}${dryRun ? ' (DRY RUN — no writes)' : ''}\n`);

  if (toProcess.length === 0) {
    console.log('Nothing to fix!');
    return;
  }

  const client = new LlmClient();

  const questMap = new Map<string, Quest>(quests.map((q) => [q.id, q]));
  let fixed = 0;
  let failed = 0;
  const BATCH = 8;

  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (quest) => {
        try {
          const rewritten = await rewritePrompt(client, quest);
          const newQCount = countQuestionMarks(rewritten);

          if (newQCount !== 1) {
            console.warn(
              `  [WARN] ${quest.id}: rewrite has ${newQCount} question marks — keeping original. Text: "${rewritten.slice(0, 80)}..."`,
            );
            failed++;
            return;
          }

          if (!dryRun) {
            const entry = questMap.get(quest.id);
            if (entry) entry.prompt = rewritten;
          }

          fixed++;
          console.log(`  [${fixed + failed}/${toProcess.length}] FIXED ${quest.id}`);
          if (dryRun) {
            console.log(`    OLD: ${quest.prompt.slice(0, 90)}...`);
            console.log(`    NEW: ${rewritten.slice(0, 90)}...`);
          }
        } catch (err) {
          console.error(`  [ERR] ${quest.id}: ${(err as Error).message}`);
          failed++;
        }
      }),
    );

    if (i + BATCH < toProcess.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone: ${fixed} fixed, ${failed} failed/skipped.`);

  if (!dryRun && fixed > 0) {
    const updated = Array.from(questMap.values());
    writeFileSync(QUESTS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    console.log(`Wrote ${updated.length} quests to ${QUESTS_PATH}`);

    // Verify result
    const remaining = updated.filter((q) => countQuestionMarks(q.prompt) >= 2);
    console.log(`Compound quests remaining: ${remaining.length}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
