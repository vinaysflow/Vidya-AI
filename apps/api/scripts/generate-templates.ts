/**
 * generate-templates.ts
 *
 * Hybrid LLM template generator.
 * Reads rsm-topic-mapping.json, calls GPT-4 to generate 4-5 kid-friendly MCQ templates
 * per RSM concept, validates with Zod, deduplicates against existing templates,
 * and appends validated templates to question-templates.json.
 *
 * Usage:
 *   cd vidya/apps/api
 *   OPENAI_API_KEY=$OPENAI_API_KEY npx tsx scripts/generate-templates.ts
 *
 * Optional flags:
 *   --concepts set_theory_intro,venn_diagrams_basic   (comma-separated concept keys to target)
 *   --count 4                                          (templates per concept, default 4)
 *   --dry-run                                          (print output without writing to file)
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const TemplateSchema = z.object({
  conceptKey: z.string().min(1),
  gradeLevel: z.number().int().min(1).max(9),
  difficulty: z.number().int().min(1).max(5),
  questionText: z.string().min(10).max(300),
  answerFormula: z.string().min(1),
  distractors: z.array(z.string()).length(2),
  solutionSteps: z.array(z.string()).min(2),
  tags: z.array(z.string()),
  source: z.string(),
});

type Template = z.infer<typeof TemplateSchema>;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const SEED_DIR = path.join(__dirname, '../prisma/seed-data');
const RSM_MAPPING_PATH = path.join(SEED_DIR, 'raw/rsm-topic-mapping.json');
const TEMPLATES_PATH = path.join(SEED_DIR, 'question-templates.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const conceptsArg = args.find((a) => a.startsWith('--concepts='))?.split('=')[1];
  const countArg = args.find((a) => a.startsWith('--count='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  return {
    targetConcepts: conceptsArg ? conceptsArg.split(',') : null,
    count: countArg ? parseInt(countArg, 10) : 4,
    dryRun,
  };
}

function levenshteinSimilarity(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  const m = la.length, n = lb.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = la[i - 1] === lb[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

function isDuplicate(newText: string, existingTexts: string[]): boolean {
  return existingTexts.some((t) => levenshteinSimilarity(newText, t) > 0.75);
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------
const THEMES = ['Minecraft', 'cooking/kitchen', 'detective mystery', 'nature/science lab', 'sports/playground'];

async function generateTemplatesForConcept(
  client: OpenAI,
  conceptKey: string,
  gradeLevel: number,
  description: string,
  count: number,
  existingExamples: Template[]
): Promise<Template[]> {
  const fewShot = existingExamples.slice(0, 2)
    .map((t, i) => `Example ${i + 1}:\n${JSON.stringify(t, null, 2)}`)
    .join('\n\n');

  const themeList = THEMES.slice(0, count).join(', ');

  const prompt = `Generate exactly ${count} kid-friendly multiple-choice question templates for this math/logic concept.

Concept: ${conceptKey}
Grade level: ${gradeLevel}
Description: ${description}

Each template must use a DIFFERENT real-world theme from: ${themeList}
Each template must follow this EXACT JSON schema:
{
  "conceptKey": "${conceptKey}",
  "gradeLevel": ${gradeLevel},
  "difficulty": <1-5 integer>,
  "questionText": "<engaging scenario question under 250 chars>",
  "answerFormula": "<correct answer, concise>",
  "distractors": ["<wrong answer 1>", "<wrong answer 2>"],
  "solutionSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "tags": ["<theme tag>"],
  "source": "rsm-aligned"
}

Rules:
- The correct answer MUST NOT appear in distractors
- distractors must be exactly 2 items
- solutionSteps must have at least 2 items
- questionText must be engaging and use a real scenario (Minecraft, cooking, etc)
- Difficulty: grade-${gradeLevel} level. For RSM concepts, err toward higher difficulty within the grade.

${fewShot ? `Here are examples of good templates for similar concepts:\n\n${fewShot}\n\n` : ''}

Return ONLY a valid JSON array of ${count} template objects. No markdown fences, no explanation.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert curriculum designer creating math question templates for kids aged 8-13. You always output valid JSON arrays only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '[]';

  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`  ⚠ JSON parse failed for ${conceptKey}, raw output:\n${raw.slice(0, 200)}`);
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const validated: Template[] = [];
  for (const item of parsed) {
    const result = TemplateSchema.safeParse(item);
    if (result.success) {
      validated.push(result.data);
    } else {
      console.warn(`  ⚠ Validation failed for template in ${conceptKey}:`, result.error.issues[0]);
    }
  }

  return validated;
}

// ---------------------------------------------------------------------------
// RSM concept targets
// ---------------------------------------------------------------------------
const RSM_CONCEPTS_TO_GENERATE = [
  { conceptKey: 'set_theory_intro', gradeLevel: 3, description: 'Understanding sets: defined sets, equal sets, empty sets, set membership' },
  { conceptKey: 'venn_diagrams_basic', gradeLevel: 3, description: 'Using Venn diagrams to show set relationships, subsets, intersections' },
  { conceptKey: 'set_operations', gradeLevel: 4, description: 'Union (A∪B), intersection (A∩B), complement of sets' },
  { conceptKey: 'motion_problems', gradeLevel: 4, description: 'Distance = velocity × time word problems, solving for any of the three variables' },
  { conceptKey: 'work_rate_time', gradeLevel: 4, description: 'Worker rate problems: if A finishes in 6h and B in 4h, together they finish in 12/5 hours' },
  { conceptKey: 'cost_formula', gradeLevel: 3, description: 'Cost = price × quantity, multi-step cost problems with unit price' },
  { conceptKey: 'compound_word_problems', gradeLevel: 4, description: 'Multi-step problems requiring 2+ operations to solve, RSM hallmark' },
  { conceptKey: 'multi_step_equations', gradeLevel: 5, description: 'Equations like 3(x+2)=21, requiring distribution and inverse operations' },
  { conceptKey: 'mixed_numbers', gradeLevel: 4, description: 'Converting between mixed numbers (2½) and improper fractions (5/2)' },
  { conceptKey: 'fraction_of_number', gradeLevel: 4, description: 'Finding (3/4) of 24, linking fractions to multiplication' },
  { conceptKey: 'percent_as_hundredths', gradeLevel: 5, description: 'Percentages as parts per hundred, converting fractions/decimals to percents' },
  { conceptKey: 'simultaneous_motion', gradeLevel: 5, description: 'Two objects moving toward/away — combined rate and gap problems (trains problem)' },
  { conceptKey: 'motion_graphs', gradeLevel: 5, description: 'Distance-time graphs, reading slope as speed, identifying constant vs changing speed' },
  { conceptKey: 'right_triangle_area', gradeLevel: 5, description: 'Area = (base × height) / 2 for right triangles' },
  { conceptKey: 'inequalities_intro', gradeLevel: 5, description: 'Solving and graphing inequalities: x+3 > 7, meaning all values > 4' },
  { conceptKey: 'counting_principles', gradeLevel: 4, description: 'If event A has m outcomes and B has n, together m×n outcomes (shirts×pants combos)' },
  { conceptKey: 'logical_connectives', gradeLevel: 5, description: 'If-then statements, for all (universal), there exists (existential) quantifiers' },
  { conceptKey: 'coordinate_graphing', gradeLevel: 5, description: 'Plotting (x,y) ordered pairs on coordinate plane, reading graph coordinates' },
];

const THIN_COVERAGE_CONCEPTS = [
  { conceptKey: 'forces_push_pull', gradeLevel: 3, description: 'Pushes and pulls as forces, direction of force, effect on object motion' },
  { conceptKey: 'solutions', gradeLevel: 4, description: 'Solutes dissolving in solvents, concentration, saturation of solutions' },
  { conceptKey: 'friction', gradeLevel: 3, description: 'Friction as a force opposing motion, rough vs smooth surfaces' },
  { conceptKey: 'balance_weight', gradeLevel: 3, description: 'Balancing objects on a seesaw, torque and weight distribution' },
  { conceptKey: 'light_shadows', gradeLevel: 3, description: 'Light travels in straight lines, shadows form when light is blocked' },
  { conceptKey: 'density', gradeLevel: 5, description: 'Density = mass/volume, why objects float or sink, comparing densities' },
  { conceptKey: 'multidigit_multiplication_2digit', gradeLevel: 4, description: '2-digit × 2-digit multiplication using standard algorithm, e.g. 34 × 56' },
  { conceptKey: 'fraction_addition_same_denominator', gradeLevel: 4, description: 'Adding and subtracting fractions with the same denominator' },
  { conceptKey: 'area_complex_figures', gradeLevel: 5, description: 'Area of composite shapes by decomposing into rectangles and triangles' },
  { conceptKey: 'algebraic_patterns', gradeLevel: 5, description: 'Finding patterns in sequences and writing algebraic rules for them' },
  { conceptKey: 'multi_step_deduction', gradeLevel: 5, description: 'Multi-step logical deduction chains, eliminating possibilities systematically' },
  { conceptKey: 'geometry_scale_drawings', gradeLevel: 6, description: 'Scale factors in drawings and maps, proportional reasoning with measurements' },
  { conceptKey: 'kinetic_potential_energy', gradeLevel: 5, description: 'Kinetic energy (moving objects) vs potential energy (stored), energy conversion' },
  { conceptKey: 'wave_properties', gradeLevel: 5, description: 'Wavelength, frequency, amplitude of waves; sound and light as waves' },
  { conceptKey: 'spatial_rotation', gradeLevel: 6, description: 'Mentally rotating 2D and 3D shapes, visualizing cross-sections' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { targetConcepts, count, dryRun } = parseArgs();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  // Load existing templates
  const existingTemplates: Template[] = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf-8'));
  const existingTexts = existingTemplates.map((t) => t.questionText);
  console.log(`Loaded ${existingTemplates.length} existing templates`);

  // Determine which concepts to target
  const allConcepts = [...RSM_CONCEPTS_TO_GENERATE, ...THIN_COVERAGE_CONCEPTS];
  const concepts = targetConcepts
    ? allConcepts.filter((c) => targetConcepts.includes(c.conceptKey))
    : allConcepts;

  console.log(`Generating templates for ${concepts.length} concepts (${count} per concept)...\n`);

  const newTemplates: Template[] = [];
  let successCount = 0;
  let skipCount = 0;

  for (const concept of concepts) {
    console.log(`  Generating for: ${concept.conceptKey} (grade ${concept.gradeLevel})`);

    // Get existing examples for this concept as few-shot
    const examples = existingTemplates.filter((t) => t.conceptKey === concept.conceptKey);

    try {
      const generated = await generateTemplatesForConcept(
        client,
        concept.conceptKey,
        concept.gradeLevel,
        concept.description,
        count,
        examples
      );

      let added = 0;
      for (const t of generated) {
        if (isDuplicate(t.questionText, existingTexts)) {
          skipCount++;
          console.log(`    ↩ Skipped duplicate: "${t.questionText.slice(0, 60)}..."`);
        } else {
          newTemplates.push(t);
          existingTexts.push(t.questionText);
          added++;
        }
      }

      console.log(`    ✓ Added ${added} / ${generated.length} templates`);
      successCount += added;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`    ✗ Error generating for ${concept.conceptKey}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nSummary: ${successCount} new templates generated, ${skipCount} duplicates skipped`);

  if (dryRun) {
    console.log('\n-- DRY RUN: Sample output (first 2 templates) --');
    console.log(JSON.stringify(newTemplates.slice(0, 2), null, 2));
    return;
  }

  if (newTemplates.length === 0) {
    console.log('No new templates to write.');
    return;
  }

  // Append to existing file
  const combined = [...existingTemplates, ...newTemplates];
  fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(combined, null, 2));
  console.log(`\n✅ Written ${combined.length} total templates to ${TEMPLATES_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
