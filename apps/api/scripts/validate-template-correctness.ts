/**
 * validate-template-correctness.ts
 *
 * Checks every question template for pedagogical correctness via LLM:
 *   - Is the answerFormula actually correct for the questionText?
 *   - Are the distractors plausible but clearly wrong?
 *   - Do solution steps logically lead to the answer?
 *
 * Usage:
 *   cd vidya/apps/api
 *   tsx scripts/validate-template-correctness.ts              # validate all, write report
 *   tsx scripts/validate-template-correctness.ts --dry-run    # sample 10 templates only
 *   tsx scripts/validate-template-correctness.ts --fix        # remove definitively wrong templates
 *   tsx scripts/validate-template-correctness.ts --concepts=set_theory_intro,venn_diagrams_basic
 *
 * Output: prisma/seed-data/template-validation-report.csv
 */

import fs from 'fs';
import path from 'path';
import { LlmClient } from '../src/services/llm/client';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_PATH = path.join(__dirname, '../prisma/seed-data/question-templates.json');
const REPORT_PATH = path.join(__dirname, '../prisma/seed-data/template-validation-report.csv');

interface Template {
  conceptKey: string;
  gradeLevel: number;
  difficulty: number;
  questionText: string;
  answerFormula: string;
  distractors: string[];
  solutionSteps: string[];
  tags: string[];
  source?: string;
}

interface ValidationResult {
  conceptKey: string;
  questionText: string;
  answerFormula: string;
  correct: boolean;
  distractorsOk: boolean;
  stepsOk: boolean;
  issue: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fix = args.includes('--fix');
  const conceptsArg = args.find((a) => a.startsWith('--concepts='))?.split('=')[1];
  return {
    dryRun,
    fix,
    targetConcepts: conceptsArg ? conceptsArg.split(',') : null,
  };
}

const SYSTEM_PROMPT = `You are a strict math and science curriculum reviewer.
Given a multiple-choice question template, verify:
1. Is the answerFormula the CORRECT answer to the questionText?
2. Are both distractors plausible but clearly WRONG?
3. Do the solutionSteps logically lead to the answerFormula?

Return ONLY valid JSON in this exact schema:
{
  "correct": true | false,
  "distractorsOk": true | false,
  "stepsOk": true | false,
  "issue": "<empty string if all ok, otherwise brief description of the problem>"
}`;

async function validateTemplate(
  client: LlmClient,
  template: Template,
): Promise<{ correct: boolean; distractorsOk: boolean; stepsOk: boolean; issue: string }> {
  const userPrompt = `Question: ${template.questionText}
Correct answer: ${template.answerFormula}
Distractors: ${template.distractors.join(' | ')}
Solution steps: ${template.solutionSteps.join(' → ')}

Grade level: ${template.gradeLevel}

Validate this template. Return ONLY the JSON object.`;

  const text = await client.generateText({
    modelType: 'analysis',
    maxTokens: 200,
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    usePromptCache: true,
  });

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  const parsed = JSON.parse(jsonMatch[0]) as {
    correct?: boolean;
    distractorsOk?: boolean;
    stepsOk?: boolean;
    issue?: string;
  };

  return {
    correct: parsed.correct !== false,
    distractorsOk: parsed.distractorsOk !== false,
    stepsOk: parsed.stepsOk !== false,
    issue: parsed.issue ?? '',
  };
}

function writeCsv(results: ValidationResult[], filePath: string) {
  const header = 'conceptKey,questionText,answerFormula,correct,distractorsOk,stepsOk,issue\n';
  const rows = results.map((r) => {
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    return [
      escape(r.conceptKey),
      escape(r.questionText),
      escape(r.answerFormula),
      r.correct,
      r.distractorsOk,
      r.stepsOk,
      escape(r.issue),
    ].join(',');
  });
  fs.writeFileSync(filePath, header + rows.join('\n'), 'utf-8');
}

async function main() {
  const { dryRun, fix, targetConcepts } = parseArgs();

  const allTemplates: Template[] = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf-8'));
  let templates = targetConcepts
    ? allTemplates.filter((t) => targetConcepts.includes(t.conceptKey))
    : allTemplates;

  if (dryRun) {
    templates = templates.sort(() => Math.random() - 0.5).slice(0, 10);
    console.log(`[dry-run] Validating 10 random templates...`);
  } else {
    console.log(`Validating ${templates.length} templates...`);
  }

  const client = new LlmClient();
  const results: ValidationResult[] = [];
  const BATCH_SIZE = 5;
  let done = 0;

  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batch = templates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (t) => {
        try {
          const result = await validateTemplate(client, t);
          results.push({
            conceptKey: t.conceptKey,
            questionText: t.questionText.slice(0, 120),
            answerFormula: t.answerFormula,
            ...result,
          });
          done++;
          if (!result.correct || !result.distractorsOk || !result.stepsOk) {
            console.log(
              `  [${done}] FAIL ${t.conceptKey}: ${result.issue || 'validation failed'}`,
            );
          }
        } catch (err) {
          results.push({
            conceptKey: t.conceptKey,
            questionText: t.questionText.slice(0, 120),
            answerFormula: t.answerFormula,
            correct: true,
            distractorsOk: true,
            stepsOk: true,
            issue: `[validation-error] ${(err as Error).message}`,
          });
          done++;
        }
      }),
    );
    if (i + BATCH_SIZE < templates.length) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  const failures = results.filter((r) => !r.correct || !r.distractorsOk || !r.stepsOk);
  const wrongAnswer = results.filter((r) => !r.correct).length;
  const badDistractors = results.filter((r) => !r.distractorsOk).length;
  const badSteps = results.filter((r) => !r.stepsOk).length;
  const passRate = results.length > 0
    ? ((results.length - failures.length) / results.length * 100).toFixed(1)
    : '0.0';

  console.log(`\nValidation complete:`);
  console.log(`  Total validated:   ${results.length}`);
  console.log(`  Pass rate:         ${passRate}%`);
  console.log(`  Wrong answers:     ${wrongAnswer}`);
  console.log(`  Bad distractors:   ${badDistractors}`);
  console.log(`  Bad steps:         ${badSteps}`);
  console.log(`  Total failures:    ${failures.length}`);

  writeCsv(results, REPORT_PATH);
  console.log(`\nReport written to: ${REPORT_PATH}`);

  // --fix: remove definitively wrong templates (correct === false)
  if (fix) {
    const badQuestions = new Set(
      results.filter((r) => !r.correct).map((r) => r.questionText),
    );
    const cleaned = allTemplates.filter(
      (t) => !badQuestions.has(t.questionText.slice(0, 120)),
    );
    const removed = allTemplates.length - cleaned.length;
    fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(cleaned, null, 2));
    console.log(`--fix: removed ${removed} wrong-answer templates. ${cleaned.length} remain.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
