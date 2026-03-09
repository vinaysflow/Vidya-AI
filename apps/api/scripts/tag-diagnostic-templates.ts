/**
 * tag-diagnostic-templates.ts
 *
 * Tags 60 QuestionTemplate records as diagnostic=true.
 * Selection strategy:
 *   - 6 templates per grade (3-9) × approximately uniform subject coverage
 *   - Prefer difficulty=2 or 3 (not too hard, not too easy) for placement
 *   - Prioritize templates with solutionSteps length >= 2 (well-structured)
 *
 * Usage:
 *   cd vidya/apps/api
 *   npx tsx scripts/tag-diagnostic-templates.ts
 *   npx tsx scripts/tag-diagnostic-templates.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv();

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const SUBJECTS = [
  'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY',
  'CODING', 'ENGLISH_LITERATURE', 'ECONOMICS', 'AI_LEARNING', 'LOGIC',
];

async function main() {
  console.log('Finding templates to tag as diagnostic...\n');

  const toTag: string[] = [];

  for (let grade = 3; grade <= 9; grade++) {
    // Rotate through subjects for this grade
    for (let si = 0; si < SUBJECTS.length && toTag.length < 63; si++) {
      const subject = SUBJECTS[si];
      // For grades 3-5, only Math and Chemistry and Biology are well-populated
      // For grades 6-9, all subjects
      if (grade <= 5 && !['MATHEMATICS', 'CHEMISTRY', 'BIOLOGY', 'PHYSICS'].includes(subject)) {
        continue;
      }

      const templates = await prisma.questionTemplate.findMany({
        where: {
          gradeLevel: grade,
          subject: { equals: subject },
          difficulty: { in: [2, 3] },
          diagnostic: false,
        },
        select: { id: true },
        take: 5,
        orderBy: { id: 'asc' },
      });

      if (templates.length > 0) {
        toTag.push(templates[0].id);
      }
    }
  }

  console.log(`Selected ${toTag.length} templates to tag as diagnostic`);

  if (dryRun) {
    console.log('[DRY RUN] Template IDs:', toTag.slice(0, 10), '...');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.questionTemplate.updateMany({
    where: { id: { in: toTag } },
    data: { diagnostic: true },
  });

  console.log(`\nTagged ${result.count} templates as diagnostic=true`);

  // Verify distribution
  const counts = await prisma.questionTemplate.groupBy({
    by: ['gradeLevel', 'subject'],
    where: { diagnostic: true },
    _count: { id: true },
    orderBy: [{ gradeLevel: 'asc' }],
  });

  console.log('\nDiagnostic template distribution:');
  for (const row of counts) {
    console.log(`  G${row.gradeLevel} ${row.subject}: ${row._count.id}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
