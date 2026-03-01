/**
 * Batch LLM Classification Script
 * 
 * Finds all essay prompts with promptCategory = 'OTHER' and auto-classifies
 * them into one of the 11 PromptCategory values using Claude Haiku.
 * 
 * Usage:
 *   npx tsx scripts/classifyPrompts.ts              # Classify and update DB
 *   npx tsx scripts/classifyPrompts.ts --dry-run     # Preview without updating
 * 
 * Cost: ~$0.001 per 10 prompts (Haiku is very cheap for classification)
 * Idempotent: only touches prompts with category 'OTHER'
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

// ============================================
// CONFIG
// ============================================

const BATCH_SIZE = 10;
const MODEL = 'claude-3-5-haiku-20241022';

const VALID_CATEGORIES = [
  'IDENTITY',
  'CHALLENGE',
  'INTELLECTUAL',
  'COMMUNITY',
  'GROWTH',
  'WHY_US',
  'CREATIVE',
  'EXTRACURRICULAR',
  'DIVERSITY',
  'SHORT_ANSWER',
  'OTHER',
] as const;

type PromptCategory = typeof VALID_CATEGORIES[number];

// ============================================
// CLASSIFICATION PROMPT
// ============================================

const CLASSIFICATION_SYSTEM_PROMPT = `You are a college essay prompt classifier. Given essay prompts, classify each into exactly ONE of these categories:

- IDENTITY: Background, culture, identity, who you are
- CHALLENGE: Obstacles, setbacks, failure, adversity
- INTELLECTUAL: Academic curiosity, a subject or idea you love
- COMMUNITY: Contribution, service, making a difference, belonging
- GROWTH: Personal development, realization, transformation
- WHY_US: Why this specific school (mentions school name, programs, campus)
- CREATIVE: Unconventional, imaginative prompts (e.g., UChicago-style)
- EXTRACURRICULAR: Activities, talents, skills, hobbies
- DIVERSITY: Perspectives, experiences with difference, inclusion
- SHORT_ANSWER: Very brief responses (typically < 150 words or a single sentence)
- OTHER: Does not clearly fit any category above

Return ONLY a JSON array of objects, one per prompt, with this schema:
[
  { "id": "<prompt_id>", "category": "<CATEGORY>" },
  ...
]

Do NOT include any text outside the JSON array.`;

// ============================================
// MAIN
// ============================================

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('[DRY RUN] Preview mode — no database changes will be made.\n');
  }

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // 1. Fetch all unclassified prompts
    const unclassified = await prisma.essayPrompt.findMany({
      where: { promptCategory: 'OTHER' },
      include: {
        school: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${unclassified.length} prompts with category OTHER.\n`);

    if (unclassified.length === 0) {
      console.log('Nothing to classify. Exiting.');
      return;
    }

    // 2. Process in batches
    let totalClassified = 0;
    const categoryCounts: Record<string, number> = {};

    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
      const batch = unclassified.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(unclassified.length / BATCH_SIZE);

      console.log(`--- Batch ${batchNum}/${totalBatches} (${batch.length} prompts) ---`);

      // Build the user prompt
      const promptsText = batch
        .map(p => {
          const school = p.school?.name || 'Unknown';
          return `ID: ${p.id}\nSchool: ${school}\nPrompt: "${p.promptText.slice(0, 500)}"`;
        })
        .join('\n\n');

      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 1000,
          system: CLASSIFICATION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Classify these ${batch.length} prompts:\n\n${promptsText}` }],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          console.error(`  Batch ${batchNum}: unexpected response type, skipping`);
          continue;
        }

        // Parse the JSON array
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error(`  Batch ${batchNum}: no JSON array found in response, skipping`);
          continue;
        }

        const classifications = JSON.parse(jsonMatch[0]) as Array<{ id: string; category: string }>;

        // 3. Update each prompt
        for (const { id, category } of classifications) {
          const validCategory = VALID_CATEGORIES.includes(category as PromptCategory)
            ? (category as PromptCategory)
            : 'OTHER';

          if (validCategory === 'OTHER') {
            console.log(`  ${id}: still OTHER (LLM unsure)`);
            continue;
          }

          const prompt = batch.find(p => p.id === id);
          const schoolName = prompt?.school?.name || 'Unknown';
          const shortText = prompt?.promptText.slice(0, 60) || '?';

          console.log(`  ${schoolName}: "${shortText}..." → ${validCategory}`);

          if (!dryRun) {
            await prisma.essayPrompt.update({
              where: { id },
              data: { promptCategory: validCategory },
            });
          }

          totalClassified++;
          categoryCounts[validCategory] = (categoryCounts[validCategory] || 0) + 1;
        }
      } catch (error) {
        console.error(`  Batch ${batchNum}: LLM call failed:`, error);
        continue;
      }

      // Brief pause between batches to avoid rate limits
      if (i + BATCH_SIZE < unclassified.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 4. Print summary
    console.log('\n========================================');
    console.log(`Classification complete${dryRun ? ' (DRY RUN)' : ''}`);
    console.log(`  Total prompts processed: ${unclassified.length}`);
    console.log(`  Successfully classified: ${totalClassified}`);
    console.log(`  Remaining as OTHER: ${unclassified.length - totalClassified}`);
    console.log('\nCategory breakdown:');
    for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count}`);
    }
    console.log('========================================');

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
