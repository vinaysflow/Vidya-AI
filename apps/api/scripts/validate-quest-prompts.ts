/**
 * validate-quest-prompts.ts
 *
 * Validates quests.json for content quality:
 *   1. Heuristic pass — flags any quest with 2+ question marks (compound/multi-part).
 *   2. LLM pass — for flagged quests, asks the LLM to confirm whether the prompt
 *      asks exactly ONE question with ONE clear answer, and is grade-appropriate.
 *
 * Usage:
 *   cd vidya/apps/api
 *   npx tsx scripts/validate-quest-prompts.ts               # full LLM validation
 *   npx tsx scripts/validate-quest-prompts.ts --heuristic   # heuristic only (fast, no LLM)
 *   npx tsx scripts/validate-quest-prompts.ts --dry-run     # run but don't write report
 *   npx tsx scripts/validate-quest-prompts.ts --concepts=minecraft_shop,logic_sorting_zoo
 *
 * Output: prisma/seed-data/quest-validation-report.csv
 * Exits with code 1 if any issues are found (CI-friendly).
 */

import fs from 'fs';
import path from 'path';
import { LlmClient } from '../src/services/llm/client';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTS_PATH = path.join(__dirname, '../../web/src/data/quests.json');
const REPORT_PATH = path.join(__dirname, '../prisma/seed-data/quest-validation-report.csv');

interface Quest {
  id: string;
  title: string;
  prompt: string;
  subject: string;
  topic: string;
  conceptKey: string;
  gradeLevel?: number;
}

interface QuestValidation {
  id: string;
  conceptKey: string;
  gradeLevel: number;
  prompt: string;
  questionMarkCount: number;
  heuristicFlag: boolean;
  singleQuestion: boolean;
  unambiguousAnswer: boolean;
  gradeAppropriate: boolean;
  issue: string;
}

const SYSTEM_PROMPT = `You are a strict children's curriculum reviewer for grades 3-9.

Given a quest prompt, evaluate:
1. Does it ask exactly ONE question (singleQuestion: true/false)?
2. Does that question have ONE clear, unambiguous correct answer — a specific number or short phrase (unambiguousAnswer: true/false)?
3. Is the language, vocabulary, and complexity appropriate for the stated grade level (gradeAppropriate: true/false)?

Return ONLY valid JSON in this exact schema:
{
  "singleQuestion": true | false,
  "unambiguousAnswer": true | false,
  "gradeAppropriate": true | false,
  "issue": "<empty string if all ok, or brief description of the problem>"
}`;

function countQuestionMarks(s: string): number {
  return (s.match(/\?/g) ?? []).length;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const heuristicOnly = args.includes('--heuristic');
  const dryRun = args.includes('--dry-run');
  const idsArg = args.find((a) => a.startsWith('--concepts='))?.split('=')[1];
  return {
    heuristicOnly,
    dryRun,
    targetIds: idsArg ? idsArg.split(',') : null,
  };
}

async function validateQuestLlm(
  client: LlmClient,
  quest: Quest,
): Promise<{ singleQuestion: boolean; unambiguousAnswer: boolean; gradeAppropriate: boolean; issue: string }> {
  const userMsg = `Grade level: ${quest.gradeLevel ?? 'unknown'}
Subject: ${quest.subject}
Quest prompt:
"${quest.prompt}"

Evaluate this prompt. Return ONLY the JSON object.`;

  const text = await client.generateText({
    modelType: 'analysis',
    maxTokens: 150,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
    usePromptCache: true,
  });

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  const parsed = JSON.parse(jsonMatch[0]) as {
    singleQuestion?: boolean;
    unambiguousAnswer?: boolean;
    gradeAppropriate?: boolean;
    issue?: string;
  };

  return {
    singleQuestion: parsed.singleQuestion !== false,
    unambiguousAnswer: parsed.unambiguousAnswer !== false,
    gradeAppropriate: parsed.gradeAppropriate !== false,
    issue: parsed.issue ?? '',
  };
}

function writeCsv(results: QuestValidation[], filePath: string) {
  const header =
    'id,conceptKey,gradeLevel,questionMarkCount,heuristicFlag,singleQuestion,unambiguousAnswer,gradeAppropriate,issue,prompt\n';
  const rows = results.map((r) => {
    const escape = (s: string | number | boolean) =>
      `"${String(s).replace(/"/g, '""')}"`;
    return [
      escape(r.id),
      escape(r.conceptKey),
      r.gradeLevel,
      r.questionMarkCount,
      r.heuristicFlag,
      r.singleQuestion,
      r.unambiguousAnswer,
      r.gradeAppropriate,
      escape(r.issue),
      escape(r.prompt.slice(0, 120)),
    ].join(',');
  });
  fs.writeFileSync(filePath, header + rows.join('\n'), 'utf-8');
}

async function main() {
  const { heuristicOnly, dryRun, targetIds } = parseArgs();

  const allQuests: Quest[] = JSON.parse(fs.readFileSync(QUESTS_PATH, 'utf-8'));
  let quests = targetIds
    ? allQuests.filter((q) => targetIds.includes(q.id))
    : allQuests;

  console.log(`Total quests loaded: ${quests.length}`);

  const results: QuestValidation[] = [];
  let done = 0;

  // ── Heuristic pass ────────────────────────────────────────────────────────────
  const flagged: Quest[] = [];
  for (const q of quests) {
    const qCount = countQuestionMarks(q.prompt);
    const isFlag = qCount >= 2;
    if (isFlag) flagged.push(q);

    results.push({
      id: q.id,
      conceptKey: q.conceptKey,
      gradeLevel: q.gradeLevel ?? 0,
      prompt: q.prompt,
      questionMarkCount: qCount,
      heuristicFlag: isFlag,
      // defaults — overwritten below if LLM runs
      singleQuestion: !isFlag,
      unambiguousAnswer: true,
      gradeAppropriate: true,
      issue: isFlag ? `${qCount} question marks (compound question)` : '',
    });
  }

  console.log(`Heuristic flags:     ${flagged.length} / ${quests.length} (${((flagged.length / quests.length) * 100).toFixed(1)}%)\n`);

  if (heuristicOnly || flagged.length === 0) {
    if (!dryRun) {
      writeCsv(results, REPORT_PATH);
      console.log(`Report written to: ${REPORT_PATH}`);
    }

    const issues = results.filter((r) => r.heuristicFlag);
    console.log(`\nValidation complete (heuristic only):`);
    console.log(`  Total:   ${results.length}`);
    console.log(`  Issues:  ${issues.length}`);

    if (issues.length > 0) {
      console.log('\nFirst 10 issues:');
      issues.slice(0, 10).forEach((r) =>
        console.log(`  ${r.id}: ${r.issue}`),
      );
      process.exit(1);
    }
    return;
  }

  // ── LLM pass (flagged quests only) ───────────────────────────────────────────
  console.log(`Running LLM validation on ${flagged.length} flagged quests...`);

  const client = new LlmClient();
  const resultMap = new Map<string, QuestValidation>(results.map((r) => [r.id, r]));
  const BATCH = 8;

  for (let i = 0; i < flagged.length; i += BATCH) {
    const batch = flagged.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (q) => {
        try {
          const llmResult = await validateQuestLlm(client, q);
          const entry = resultMap.get(q.id)!;
          entry.singleQuestion = llmResult.singleQuestion;
          entry.unambiguousAnswer = llmResult.unambiguousAnswer;
          entry.gradeAppropriate = llmResult.gradeAppropriate;
          if (llmResult.issue) entry.issue = llmResult.issue;
          done++;

          const pass =
            llmResult.singleQuestion &&
            llmResult.unambiguousAnswer &&
            llmResult.gradeAppropriate;
          if (!pass) {
            console.log(`  [FAIL] ${q.id}: ${llmResult.issue || 'validation failed'}`);
          }
        } catch (err) {
          done++;
          console.error(`  [ERR] ${q.id}: ${(err as Error).message}`);
        }
      }),
    );

    if (i + BATCH < flagged.length) {
      await new Promise((r) => setTimeout(r, 400));
    }

    if ((i + BATCH) % 40 === 0 || i + BATCH >= flagged.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, flagged.length)} / ${flagged.length}`);
    }
  }

  const finalResults = Array.from(resultMap.values());
  const failures = finalResults.filter(
    (r) => !r.singleQuestion || !r.unambiguousAnswer || !r.gradeAppropriate,
  );
  const compoundCount = finalResults.filter((r) => r.questionMarkCount >= 2).length;
  const passRate =
    finalResults.length > 0
      ? (((finalResults.length - failures.length) / finalResults.length) * 100).toFixed(1)
      : '0.0';

  console.log(`\nValidation complete:`);
  console.log(`  Total quests:        ${finalResults.length}`);
  console.log(`  Pass rate:           ${passRate}%`);
  console.log(`  Compound questions:  ${compoundCount}`);
  console.log(`  Total failures:      ${failures.length}`);

  if (!dryRun) {
    writeCsv(finalResults, REPORT_PATH);
    console.log(`\nReport written to: ${REPORT_PATH}`);
  }

  if (failures.length > 0) {
    console.log('\nFirst 10 failures:');
    failures.slice(0, 10).forEach((r) =>
      console.log(`  ${r.id} (grade ${r.gradeLevel}): ${r.issue}`),
    );
    process.exit(1);
  }

  console.log('\nAll quests passed validation!');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
