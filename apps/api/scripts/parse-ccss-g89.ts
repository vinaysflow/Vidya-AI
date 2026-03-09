/**
 * parse-ccss-g89.ts
 *
 * Parses Grade 8 and Grade 9 (Algebra I + Geometry subset) CCSS Math standards
 * from the raw ccss-math.json file and appends them to ccss-math-parsed.json.
 *
 * Grade 8: All entries with gradelevel === "8"
 * Grade 9: HS standards matching Algebra I (HSA.*) and Geometry (HSG.CO, HSG.SRT) prefixes
 *
 * Run: cd vidya/apps/api && npx tsx scripts/parse-ccss-g89.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_PATH = join(__dirname, '../prisma/seed-data/raw/ccss-math.json');
const PARSED_PATH = join(__dirname, '../prisma/seed-data/raw/ccss-math-parsed.json');

interface RawStandard {
  category: string;
  details: string;
  domain: string;
  gradelevel: string;
  key: string;
  section: string;
  type: string;
}

interface ParsedStandard {
  code: string;
  description: string;
  grade: number;
  domain: string;
  cluster: string;
}

const TARGET_G9_PREFIXES = [
  'HSA.REI', 'HSA.SSE', 'HSA.APR',
  'HSF.IF', 'HSF.BF',
  'HSG.CO', 'HSG.SRT',
];

function main() {
  const raw = JSON.parse(readFileSync(RAW_PATH, 'utf-8')) as { standards: Array<{ standard: RawStandard }> };
  const entries = raw.standards.map((s) => s.standard).filter((e) => e.type === 'standard');

  const existing: ParsedStandard[] = JSON.parse(readFileSync(PARSED_PATH, 'utf-8'));
  console.log(`Existing parsed entries: ${existing.length}`);

  const newEntries: ParsedStandard[] = [];

  // Grade 8 standards
  const grade8 = entries.filter((e) => e.gradelevel === '8');
  for (const e of grade8) {
    const code = e.key.replace('CCSS.MATH.CONTENT.', '');
    newEntries.push({
      code,
      description: e.details,
      grade: 8,
      domain: e.domain,
      cluster: e.category.replace('Grade 8: ', ''),
    });
  }

  // Grade 9: Algebra I and Geometry subset only
  const hs = entries.filter((e) => e.gradelevel === '9-12');
  for (const e of hs) {
    const code = e.key.replace('CCSS.MATH.CONTENT.', '');
    if (TARGET_G9_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      newEntries.push({
        code,
        description: e.details,
        grade: 9,
        domain: e.domain,
        cluster: e.category,
      });
    }
  }

  console.log(`Grade 8 added: ${newEntries.filter((e) => e.grade === 8).length}`);
  console.log(`Grade 9 added: ${newEntries.filter((e) => e.grade === 9).length}`);

  const combined = [...existing, ...newEntries];
  writeFileSync(PARSED_PATH, JSON.stringify(combined, null, 2) + '\n', 'utf-8');
  console.log(`Total standards: ${combined.length}. Written to ${PARSED_PATH}`);
}

main();
