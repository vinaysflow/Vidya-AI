/**
 * generate-misconceptions.ts
 *
 * Batch-generates misconception data for existing QuestionTemplates in the database
 * that do not yet have a `misconceptions` JSON field.
 *
 * For each template, calls the LLM to produce:
 *   [
 *     { distractorIndex: 0, pattern: string, diagnosis: string, socraticResponse: string, prerequisiteGap: string },
 *     { distractorIndex: 1, pattern: string, diagnosis: string, socraticResponse: string, prerequisiteGap: string }
 *   ]
 *
 * Usage:
 *   cd vidya/apps/api
 *   npx tsx scripts/generate-misconceptions.ts
 *   npx tsx scripts/generate-misconceptions.ts --limit=100   (process first 100 only)
 *   npx tsx scripts/generate-misconceptions.ts --subject=MATHEMATICS
 *   npx tsx scripts/generate-misconceptions.ts --dry-run
 *
 * ENV REQUIRED: .env with LLM_PROVIDER=openai OPENAI_API_KEY=xxx DATABASE_URL=xxx
 */

import { PrismaClient, Subject } from '@prisma/client';
import { LlmClient } from '../src/services/llm/client';
import { config as loadEnv } from 'dotenv';

loadEnv();

const prisma = new PrismaClient();

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
const subjectArg = process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1] as Subject | undefined;
const limit = limitArg ? parseInt(limitArg, 10) : undefined;

export interface MisconceptionEntry {
  distractorIndex: 0 | 1;
  pattern: string;
  diagnosis: string;
  socraticResponse: string;
  prerequisiteGap: string;
}

const SYSTEM_PROMPT = `You are an expert math and science educator specializing in student misconception analysis.

Given a multiple-choice question with its correct answer and two distractors, analyze why a student might pick each wrong answer.

For EACH distractor, produce a JSON object:
{
  "distractorIndex": 0 or 1 (index into the distractors array),
  "pattern": "<2-5 word misconception pattern name, e.g., 'Forgot to carry over', 'Confused perimeter with area'>",
  "diagnosis": "<One sentence explaining the cognitive error. What operation or concept did the student confuse?>",
  "socraticResponse": "<One Socratic question to ask the student that leads them toward the correct reasoning WITHOUT giving the answer. Max 120 chars.>",
  "prerequisiteGap": "<The specific prerequisite concept the student likely has not mastered. One phrase, e.g., 'place value in addition', 'difference between perimeter and area'.>"
}

Return ONLY a valid JSON array of exactly 2 objects (one per distractor). No markdown, no explanation.`;

async function generateMisconceptions(
  client: LlmClient,
  template: {
    id: string;
    conceptKey: string;
    gradeLevel: number;
    questionText: string;
    answerFormula: string;
    distractors: string[];
    solutionSteps: string[];
    subject: string;
  },
): Promise<MisconceptionEntry[] | null> {
  const prompt = `Question: ${template.questionText}
Subject: ${template.subject}
Grade: ${template.gradeLevel}
Concept: ${template.conceptKey}

Correct answer: ${template.answerFormula}
Solution approach: ${template.solutionSteps.join(' → ')}

Distractor 0 (wrong answer A): ${template.distractors[0]}
Distractor 1 (wrong answer B): ${template.distractors[1]}

Analyze why a student would pick each distractor. Generate 2 misconception objects.`;

  try {
    const raw = await client.generateText({
      modelType: 'analysis',
      maxTokens: 600,
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      usePromptCache: false,
    });

    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return null;

    const parsed = JSON.parse(arrayMatch[0]) as MisconceptionEntry[];
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;

    return parsed.map((entry, i) => ({
      distractorIndex: (entry.distractorIndex ?? i) as 0 | 1,
      pattern: (entry.pattern ?? 'Unknown error').slice(0, 100),
      diagnosis: (entry.diagnosis ?? '').slice(0, 300),
      socraticResponse: (entry.socraticResponse ?? '').slice(0, 120),
      prerequisiteGap: (entry.prerequisiteGap ?? '').slice(0, 150),
    }));
  } catch {
    return null;
  }
}

async function main() {
  console.log('Fetching templates without misconception data...');

  const whereClause = {
    misconceptions: null,
    ...(subjectArg ? { subject: subjectArg } : {}),
  };

  const templates = await prisma.questionTemplate.findMany({
    where: whereClause,
    take: limit,
    orderBy: { gradeLevel: 'asc' },
    select: {
      id: true,
      conceptKey: true,
      gradeLevel: true,
      subject: true,
      questionText: true,
      answerFormula: true,
      distractors: true,
      solutionSteps: true,
    },
  });

  console.log(`Templates to process: ${templates.length}\n`);

  if (templates.length === 0) {
    console.log('All templates already have misconception data!');
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log('[DRY RUN] Would process', templates.length, 'templates. First template:');
    console.log(JSON.stringify(templates[0], null, 2));
    await prisma.$disconnect();
    return;
  }

  const client = new LlmClient();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    process.stdout.write(`  [${i + 1}/${templates.length}] ${template.conceptKey} (G${template.gradeLevel})... `);

    const misconceptions = await generateMisconceptions(client, template);

    if (misconceptions) {
      await prisma.questionTemplate.update({
        where: { id: template.id },
        data: { misconceptions: misconceptions as unknown[] },
      });
      success++;
      console.log(`✓`);
    } else {
      failed++;
      console.log(`✗ failed`);
    }

    // Rate limiting: 200ms between calls
    await new Promise((r) => setTimeout(r, 200));

    // Progress summary every 50
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${templates.length} | ✓ ${success} | ✗ ${failed} ---\n`);
    }
  }

  console.log(`\n=== Complete: ${success} succeeded, ${failed} failed out of ${templates.length} ===`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
