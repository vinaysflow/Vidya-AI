/**
 * Essay Prompt Scraper
 * 
 * Fetches essay prompts from aggregator sites, parses HTML with cheerio,
 * optionally classifies prompts via Haiku, and outputs JSON files ready
 * for bulk import via the admin API.
 * 
 * Usage:
 *   npx tsx scripts/scrapeEssayPrompts.ts                          # Full scrape + classify
 *   npx tsx scripts/scrapeEssayPrompts.ts --skip-classify           # Scrape only, category = OTHER
 *   npx tsx scripts/scrapeEssayPrompts.ts --dry-run                 # Preview without writing files
 *   npx tsx scripts/scrapeEssayPrompts.ts --url "https://..."       # Scrape a specific URL
 * 
 * Output files (in scripts/output/):
 *   scraped_schools.json   - Matches ImportSchoolsSchema
 *   scraped_prompts.json   - Matches ImportPromptsSchema
 * 
 * After scraping, import via:
 *   curl -X POST http://localhost:4000/api/prompts/admin/schools \
 *     -H "X-Admin-Secret: $SECRET" -H "Content-Type: application/json" \
 *     -d @scripts/output/scraped_schools.json
 *   curl -X POST http://localhost:4000/api/prompts/admin/import \
 *     -H "X-Admin-Secret: $SECRET" -H "Content-Type: application/json" \
 *     -d @scripts/output/scraped_prompts.json
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

// ============================================
// TYPES
// ============================================

interface ScrapedSchool {
  name: string;
  slug: string;
  location?: string;
  selectivity: 'MOST_SELECTIVE' | 'HIGHLY_SELECTIVE' | 'SELECTIVE' | 'MODERATE';
  applicationPlatform?: string;
  essayPageUrl?: string;
}

interface ScrapedPrompt {
  schoolSlug: string;
  academicYear: string;
  promptText: string;
  wordLimit?: number;
  required: boolean;
  promptType: 'PERSONAL_STATEMENT' | 'SUPPLEMENTAL' | 'SHORT_ANSWER' | 'ACTIVITY_DESCRIPTION' | 'WHY_SCHOOL';
  promptCategory: string;
  sortOrder: number;
  sourceUrl: string;
}

// ============================================
// CONFIG
// ============================================

const DEFAULT_YEAR = '2025-2026';
const MODEL = 'claude-3-5-haiku-20241022';
const RATE_LIMIT_MS = 1000; // 1 request per second
const OUTPUT_DIR = path.join(__dirname, 'output');

/**
 * Default list of aggregator URLs to scrape.
 * These are well-known college essay prompt aggregator pages.
 * Each entry contains the URL and a parser function name.
 */
const DEFAULT_SOURCES: Array<{ url: string; parser: ParserType }> = [
  // CollegeVine aggregator pages are structured HTML with school sections
  // Add more sources as discovered
];

type ParserType = 'generic' | 'collegevine' | 'custom';

// ============================================
// SLUG GENERATION
// ============================================

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\buniversity\b/g, '')
    .replace(/\bcollege\b/g, '')
    .replace(/\binstitute\b/g, '')
    .replace(/\bof\b/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/\bat\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Attempt to detect selectivity from school name or context.
 * Falls back to SELECTIVE as default.
 */
function guessSelectivity(name: string): ScrapedSchool['selectivity'] {
  const mostSelective = [
    'harvard', 'stanford', 'mit', 'yale', 'princeton', 'columbia',
    'caltech', 'uchicago', 'duke', 'penn', 'dartmouth', 'brown',
    'northwestern', 'rice', 'vanderbilt', 'johns hopkins', 'cornell',
    'notre dame', 'wash u', 'georgetown', 'carnegie mellon', 'emory',
    'usc', 'nyu', 'tufts', 'boston college',
  ];
  const lower = name.toLowerCase();
  if (mostSelective.some(s => lower.includes(s))) return 'MOST_SELECTIVE';
  if (lower.includes('uc ') || lower.includes('university of california')) return 'HIGHLY_SELECTIVE';
  return 'SELECTIVE';
}

// ============================================
// HTML FETCHING
// ============================================

async function fetchPage(url: string): Promise<string> {
  console.log(`  Fetching: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Vidya-Essay-Prompt-Scraper/1.0 (educational tool)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
  }

  return response.text();
}

// ============================================
// PARSERS
// ============================================

/**
 * Generic parser: looks for common patterns in college essay prompt pages.
 * Works with many aggregator sites that use headings for school names
 * and lists/paragraphs for prompts.
 */
function parseGeneric(html: string, sourceUrl: string): { schools: ScrapedSchool[]; prompts: ScrapedPrompt[] } {
  const $ = cheerio.load(html);
  const schools: ScrapedSchool[] = [];
  const prompts: ScrapedPrompt[] = [];
  const seenSchools = new Set<string>();

  // Strategy: look for heading tags (h2, h3) that contain school names,
  // followed by list items or paragraphs containing prompt text.
  const headings = $('h2, h3').toArray();

  for (const heading of headings) {
    const schoolName = $(heading).text().trim();
    if (!schoolName || schoolName.length < 3 || schoolName.length > 100) continue;

    // Skip non-school headings
    if (/table of contents|introduction|tips|how to|about|faq/i.test(schoolName)) continue;

    const slug = toSlug(schoolName);
    if (!slug || slug.length < 2) continue;

    // Add school if not seen
    if (!seenSchools.has(slug)) {
      seenSchools.add(slug);
      schools.push({
        name: schoolName,
        slug,
        selectivity: guessSelectivity(schoolName),
        essayPageUrl: sourceUrl,
      });
    }

    // Collect prompts from the elements after the heading until the next heading
    let sortOrder = 1;
    let nextEl = $(heading).next();
    while (nextEl.length && !nextEl.is('h2, h3')) {
      // Look for list items
      if (nextEl.is('ul, ol')) {
        nextEl.find('li').each((_, li) => {
          const text = $(li).text().trim();
          if (text.length >= 20) {
            const wordLimit = extractWordLimit(text);
            prompts.push({
              schoolSlug: slug,
              academicYear: DEFAULT_YEAR,
              promptText: cleanPromptText(text),
              wordLimit,
              required: true,
              promptType: guessPromptType(text, schoolName),
              promptCategory: 'OTHER',
              sortOrder: sortOrder++,
              sourceUrl,
            });
          }
        });
      }

      // Look for paragraphs that look like prompts (20+ words, contains a question or instruction)
      if (nextEl.is('p')) {
        const text = nextEl.text().trim();
        if (text.length >= 40 && looksLikePrompt(text)) {
          const wordLimit = extractWordLimit(text);
          prompts.push({
            schoolSlug: slug,
            academicYear: DEFAULT_YEAR,
            promptText: cleanPromptText(text),
            wordLimit,
            required: true,
            promptType: guessPromptType(text, schoolName),
            promptCategory: 'OTHER',
            sortOrder: sortOrder++,
            sourceUrl,
          });
        }
      }

      nextEl = nextEl.next();
    }
  }

  return { schools, prompts };
}

// ============================================
// TEXT UTILITIES
// ============================================

function cleanPromptText(text: string): string {
  return text
    .replace(/\s+/g, ' ')            // Collapse whitespace
    .replace(/^\d+[.)]\s*/, '')       // Remove leading numbering
    .replace(/\(\d+ words?\)/gi, '')  // Remove "(250 words)" from text
    .replace(/\((?:optional|required)\)/gi, '') // Remove "(Optional)"
    .trim();
}

function extractWordLimit(text: string): number | undefined {
  // Match patterns like "250 words", "(650 words)", "word limit: 500"
  const match = text.match(/(\d{2,4})\s*(?:words?|word limit|character)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 50 && num <= 5000) return num;
  }
  return undefined;
}

function looksLikePrompt(text: string): boolean {
  const lower = text.toLowerCase();
  // Common essay prompt indicators
  return (
    text.includes('?') ||
    /\b(?:describe|discuss|reflect|explain|share|tell us|write about|what|how|why)\b/i.test(lower)
  );
}

function guessPromptType(text: string, schoolName: string): ScrapedPrompt['promptType'] {
  const lower = text.toLowerCase();
  if (/\bcommon app\b|\bpersonal statement\b/i.test(lower)) return 'PERSONAL_STATEMENT';
  if (/\bwhy\b.*\b(?:school|college|university)\b|\bwhy (?:us|here)\b/i.test(lower)) return 'WHY_SCHOOL';
  if (/\b(?:activity|extracurricular|club|organization)\b/i.test(lower)) return 'ACTIVITY_DESCRIPTION';
  if (/\b(?:50|75|100|150)\s*(?:words?|characters?)/i.test(lower)) return 'SHORT_ANSWER';
  return 'SUPPLEMENTAL';
}

// ============================================
// LLM CLASSIFICATION (batched)
// ============================================

const VALID_CATEGORIES = [
  'IDENTITY', 'CHALLENGE', 'INTELLECTUAL', 'COMMUNITY', 'GROWTH',
  'WHY_US', 'CREATIVE', 'EXTRACURRICULAR', 'DIVERSITY', 'SHORT_ANSWER', 'OTHER',
] as const;

async function classifyPrompts(
  prompts: ScrapedPrompt[],
  client: Anthropic
): Promise<ScrapedPrompt[]> {
  const BATCH_SIZE = 10;
  const classified = [...prompts];

  for (let i = 0; i < classified.length; i += BATCH_SIZE) {
    const batch = classified.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(classified.length / BATCH_SIZE);

    console.log(`  Classifying batch ${batchNum}/${totalBatches}...`);

    const promptsText = batch
      .map((p, idx) => `[${i + idx}] School: ${p.schoolSlug}\nPrompt: "${p.promptText.slice(0, 500)}"`)
      .join('\n\n');

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: `Classify each essay prompt into exactly ONE category: ${VALID_CATEGORIES.join(', ')}. Return ONLY a JSON array: [{"index": <number>, "category": "<CATEGORY>"}, ...]`,
        messages: [{ role: 'user', content: `Classify:\n\n${promptsText}` }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const results = JSON.parse(jsonMatch[0]) as Array<{ index: number; category: string }>;
          for (const { index, category } of results) {
            if (index >= 0 && index < classified.length) {
              const valid = VALID_CATEGORIES.includes(category as any);
              classified[index].promptCategory = valid ? category : 'OTHER';
            }
          }
        }
      }
    } catch (error) {
      console.error(`  Classification batch ${batchNum} failed:`, error);
    }

    // Rate limit
    if (i + BATCH_SIZE < classified.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return classified;
}

// ============================================
// DEDUPLICATION
// ============================================

function deduplicatePrompts(prompts: ScrapedPrompt[]): ScrapedPrompt[] {
  const seen = new Set<string>();
  return prompts.filter(p => {
    // Key: school slug + first 100 chars of normalized prompt text
    const key = `${p.schoolSlug}:${p.promptText.toLowerCase().slice(0, 100).replace(/\s+/g, ' ')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipClassify = args.includes('--skip-classify');
  const customUrl = args.find(a => a.startsWith('--url='))?.split('=')[1]
    || (args.includes('--url') ? args[args.indexOf('--url') + 1] : null);

  console.log('========================================');
  console.log('Vidya Essay Prompt Scraper');
  console.log(`  Dry run: ${dryRun}`);
  console.log(`  Skip classify: ${skipClassify}`);
  console.log(`  Custom URL: ${customUrl || 'none (using defaults)'}`);
  console.log('========================================\n');

  // Determine URLs to scrape
  const sources = customUrl
    ? [{ url: customUrl, parser: 'generic' as ParserType }]
    : DEFAULT_SOURCES;

  if (sources.length === 0) {
    console.log('No URLs configured to scrape.');
    console.log('');
    console.log('Usage examples:');
    console.log('  npx tsx scripts/scrapeEssayPrompts.ts --url "https://example.com/essay-prompts"');
    console.log('');
    console.log('Or add URLs to the DEFAULT_SOURCES array in this script.');
    console.log('');
    console.log('The scraper will:');
    console.log('  1. Fetch HTML from the URL');
    console.log('  2. Parse headings (h2/h3) as school names');
    console.log('  3. Extract list items and paragraphs as prompts');
    console.log('  4. Optionally classify prompts via Haiku');
    console.log('  5. Output JSON files for bulk import');
    console.log('');

    // Demo: create sample output to show the format
    if (dryRun) {
      console.log('Sample output format (--dry-run):');
      const sampleSchool: ScrapedSchool = {
        name: 'Sample University',
        slug: 'sample',
        selectivity: 'SELECTIVE',
        essayPageUrl: 'https://example.com',
      };
      const samplePrompt: ScrapedPrompt = {
        schoolSlug: 'sample',
        academicYear: DEFAULT_YEAR,
        promptText: 'Describe a time when you challenged a belief or idea. What prompted your thinking? What was the outcome?',
        wordLimit: 650,
        required: true,
        promptType: 'SUPPLEMENTAL',
        promptCategory: 'CHALLENGE',
        sortOrder: 1,
        sourceUrl: 'https://example.com',
      };
      console.log('\nscraped_schools.json:');
      console.log(JSON.stringify([sampleSchool], null, 2));
      console.log('\nscraped_prompts.json:');
      console.log(JSON.stringify([samplePrompt], null, 2));
    }
    return;
  }

  // Initialize Anthropic client (only if classifying)
  let client: Anthropic | null = null;
  if (!skipClassify) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ERROR: ANTHROPIC_API_KEY not set. Use --skip-classify to skip LLM classification.');
      process.exit(1);
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // Scrape all sources
  let allSchools: ScrapedSchool[] = [];
  let allPrompts: ScrapedPrompt[] = [];

  for (const source of sources) {
    console.log(`\n--- Scraping: ${source.url} ---`);
    try {
      const html = await fetchPage(source.url);

      let result: { schools: ScrapedSchool[]; prompts: ScrapedPrompt[] };
      switch (source.parser) {
        case 'generic':
        default:
          result = parseGeneric(html, source.url);
          break;
      }

      console.log(`  Found ${result.schools.length} schools, ${result.prompts.length} prompts`);
      allSchools.push(...result.schools);
      allPrompts.push(...result.prompts);

      // Rate limit between sources
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    } catch (error) {
      console.error(`  Failed to scrape ${source.url}:`, error);
    }
  }

  // Deduplicate
  const uniquePrompts = deduplicatePrompts(allPrompts);
  console.log(`\nTotal after dedup: ${allSchools.length} schools, ${uniquePrompts.length} prompts`);

  // Classify if not skipped
  let finalPrompts = uniquePrompts;
  if (!skipClassify && client && uniquePrompts.length > 0) {
    console.log('\nClassifying prompts with Haiku...');
    finalPrompts = await classifyPrompts(uniquePrompts, client);

    const classifiedCount = finalPrompts.filter(p => p.promptCategory !== 'OTHER').length;
    console.log(`  Classified: ${classifiedCount}/${finalPrompts.length}`);
  }

  // Output
  if (dryRun) {
    console.log('\n[DRY RUN] Would write:');
    console.log(`  ${allSchools.length} schools`);
    console.log(`  ${finalPrompts.length} prompts`);
    if (allSchools.length > 0) {
      console.log('\nFirst school:', JSON.stringify(allSchools[0], null, 2));
    }
    if (finalPrompts.length > 0) {
      console.log('\nFirst prompt:', JSON.stringify(finalPrompts[0], null, 2));
    }
  } else {
    // Write output files
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const schoolsPath = path.join(OUTPUT_DIR, 'scraped_schools.json');
    const promptsPath = path.join(OUTPUT_DIR, 'scraped_prompts.json');

    fs.writeFileSync(schoolsPath, JSON.stringify(allSchools, null, 2));
    fs.writeFileSync(promptsPath, JSON.stringify(finalPrompts, null, 2));

    console.log(`\nOutput written:`);
    console.log(`  ${schoolsPath} (${allSchools.length} schools)`);
    console.log(`  ${promptsPath} (${finalPrompts.length} prompts)`);
    console.log(`\nTo import, run:`);
    console.log(`  curl -X POST http://localhost:4000/api/prompts/admin/schools \\`);
    console.log(`    -H "X-Admin-Secret: YOUR_SECRET" -H "Content-Type: application/json" \\`);
    console.log(`    -d @${schoolsPath}`);
    console.log(`  curl -X POST http://localhost:4000/api/prompts/admin/import \\`);
    console.log(`    -H "X-Admin-Secret: YOUR_SECRET" -H "Content-Type: application/json" \\`);
    console.log(`    -d @${promptsPath}`);
  }

  console.log('\nDone.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
