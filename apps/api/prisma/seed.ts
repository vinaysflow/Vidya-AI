/**
 * Database Seed Script
 * 
 * Creates the initial API key for PathWiz integration.
 * Run with: pnpm db:seed
 * 
 * IMPORTANT: The generated API key is printed to console ONCE.
 * Save it immediately — it cannot be retrieved from the database later.
 */

import { PrismaClient, Subject } from '@prisma/client';
import { generateApiKey } from '../src/middleware/auth';
import { seedEssayPrompts } from './seeds/essayPrompts';
import { seedConcepts } from './seeds/concepts';
import { seedHints } from './seeds/hints';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Vidya database...\n');

  // Check if PathWiz key already exists
  const existingKey = await prisma.apiKey.findFirst({
    where: { name: 'PathWiz Production' }
  });

  if (existingKey) {
    console.log('PathWiz API key already exists (prefix: %s)', existingKey.prefix);
    console.log('Skipping API key creation.\n');
  } else {

  // Generate PathWiz API key
  const { plainKey, hashedKey, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      key: hashedKey,
      prefix,
      name: 'PathWiz Production',
      ownerEmail: 'admin@mypathwiz.com',
      ownerName: 'MyPathWiz',
      tier: 'PREMIUM',
      rateLimit: 1000,
      allowedOrigins: [
        'https://mypathwiz.com',
        'https://www.mypathwiz.com',
        'http://localhost:5173',  // Local dev
        'http://localhost:3000'   // Local dev
      ]
    }
  });

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   PathWiz API Key Created Successfully                    ║');
  console.log('║                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  console.log(`║   Key:    ${plainKey}`);
  console.log('║                                                           ║');
  console.log(`║   Prefix: ${prefix}`);
  console.log(`║   Tier:   ${apiKey.tier}`);
  console.log(`║   Limit:  ${apiKey.rateLimit} req/min`);
  console.log('║                                                           ║');
  console.log('║   ⚠  SAVE THIS KEY NOW — it cannot be retrieved later!   ║');
  console.log('║                                                           ║');
  console.log('║   Set in PathWiz .env:                                    ║');
  console.log('║   VITE_VIDYA_API_KEY=<the key above>                     ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  }

  // Seed essay prompts (Common App, UC PIQs, top 20 schools)
  await seedEssayPrompts(prisma);

  // Seed concept and hint banks (STEM, Counseling, Essay, etc.)
  await seedConcepts(prisma);
  await seedHints(prisma);

  // Seed concept graph (grades 3-7, all subjects) from generated JSON
  const conceptsPath = join(__dirname, 'seed-data', 'concepts.json');
  try {
    const conceptsData = JSON.parse(readFileSync(conceptsPath, 'utf-8')) as Array<{
      conceptKey: string;
      subject: string;
      topic: string;
      name: string;
      description: string;
      difficulty: number;
      gradeLevel?: number;
      prerequisites: string[];
    }>;
    let conceptCount = 0;
    for (const c of conceptsData) {
      await prisma.concept.upsert({
        where: { conceptKey: c.conceptKey },
        update: {
          name: c.name,
          description: c.description,
          subject: c.subject as Subject,
          topic: c.topic,
          difficulty: c.difficulty,
          gradeLevel: c.gradeLevel ?? 3,
          prerequisites: c.prerequisites,
        },
        create: {
          conceptKey: c.conceptKey,
          name: c.name,
          description: c.description,
          subject: c.subject as Subject,
          topic: c.topic,
          difficulty: c.difficulty,
          gradeLevel: c.gradeLevel ?? 3,
          prerequisites: c.prerequisites,
        },
      });
      conceptCount++;
    }
    console.log(`Seeded ${conceptCount} concepts (grades 3-7).`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No concepts.json found. Skipping concept graph seeding.');
    } else {
      throw e;
    }
  }

  // Build conceptKey -> Subject map from concepts.json for template subject population
  const conceptSubjectMap = new Map<string, Subject>();
  const conceptsPathForMap = join(__dirname, 'seed-data', 'concepts.json');
  try {
    const conceptsForMap = JSON.parse(readFileSync(conceptsPathForMap, 'utf-8')) as Array<{
      conceptKey: string;
      subject: string;
    }>;
    for (const c of conceptsForMap) {
      conceptSubjectMap.set(c.conceptKey, c.subject as Subject);
    }
  } catch {
    // If concepts.json not found, subject defaults to MATHEMATICS
  }

  // Seed question templates from generated JSON
  const templatesPath = join(__dirname, 'seed-data', 'question-templates.json');
  try {
    const templatesData = JSON.parse(readFileSync(templatesPath, 'utf-8')) as Array<{
      conceptKey: string;
      gradeLevel: number;
      difficulty: number;
      subject?: string;
      questionText: string;
      answerFormula: string;
      distractors: string[];
      solutionSteps: string[];
      tags: string[];
      source?: string;
    }>;
    // Clear existing templates and re-seed for idempotency
    await prisma.questionTemplate.deleteMany({});
    await prisma.questionTemplate.createMany({
      data: templatesData.map(t => ({
        ...t,
        subject: (t.subject as Subject | undefined) ?? conceptSubjectMap.get(t.conceptKey) ?? Subject.MATHEMATICS,
        source: t.source ?? 'generated',
      }))
    });
    console.log(`Seeded ${templatesData.length} question templates.`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No question-templates.json found. Skipping template seeding.');
    } else {
      throw e;
    }
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
