/**
 * generate-scenes.ts
 *
 * One-time script to generate AI scene background images using DALL-E 3.
 * Images are saved as WebP to apps/web/public/scenes/{chapter-slug}.webp
 *
 * Usage:
 *   cd vidya/apps/api
 *   OPENAI_API_KEY=$OPENAI_API_KEY npx tsx scripts/generate-scenes.ts
 *
 * Options:
 *   --dry-run   Show prompts without generating images
 *   --chapter   minecraft-builder  (generate only one chapter)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import OpenAI from 'openai';

const SCENES_OUTPUT_DIR = path.join(__dirname, '../../web/public/scenes');

const CHAPTER_SCENES: Array<{ slug: string; chapter: string; prompt: string }> = [
  {
    slug: 'minecraft-builder',
    chapter: 'Minecraft Builder',
    prompt:
      'A bright, colorful Minecraft-style world scene for kids. Pixel art landscape with green hills, blocky mountains, a blue sky with white clouds, and a cheerful blocky village. Warm sunlight, adventure feel, no characters. Flat vector digital illustration, vibrant palette, child-friendly, 16:9 widescreen, educational game background.',
  },
  {
    slug: 'kitchen-scientist',
    chapter: 'Kitchen Scientist',
    prompt:
      'A cozy, colorful kitchen science lab for kids. Cute bubbling flasks, measuring cups, mixing bowls, and cooking ingredients on a bright wooden counter. Warm lighting, cheerful and safe feeling. Flat vector digital illustration, pastel colors, child-friendly, 16:9 widescreen, educational game background. No characters.',
  },
  {
    slug: 'playground-lab',
    chapter: 'Playground Lab',
    prompt:
      'A sunny outdoor playground physics lab for kids. Colorful slides, swings, ramps, and a see-saw under a clear blue sky with puffy clouds. Green grass, bright colors, fun and safe atmosphere. Flat vector digital illustration, vibrant palette, child-friendly, 16:9 widescreen, educational game background. No characters.',
  },
  {
    slug: 'pattern-detective',
    chapter: 'Pattern Detective',
    prompt:
      'A mysterious detective agency office for kids with colorful patterns everywhere. Walls covered in math patterns, number sequences, geometric shapes, and clue boards. Warm lamp light, magnifying glasses, and notebooks. Flat vector digital illustration, navy and amber palette, child-friendly, 16:9 widescreen, educational game background. No characters.',
  },
  {
    slug: 'nature-explorer',
    chapter: 'Nature Explorer',
    prompt:
      'A lush, colorful nature exploration scene for kids. Rolling green hills, a gentle stream, butterflies, flowers, and a blue sky. Binoculars and a nature journal rest on a log. Bright and cheerful, sense of discovery. Flat vector digital illustration, vivid greens and blues, child-friendly, 16:9 widescreen, educational game background. No characters.',
  },
  {
    slug: 'logic-detective',
    chapter: 'Logic Detective',
    prompt:
      'A fun, colorful logic puzzle room for kids. Venn diagrams on a chalkboard, Sudoku grids, logic puzzles on paper, and colored connecting pieces. Soft purple and gold tones, mysterious but inviting. Flat vector digital illustration, child-friendly, 16:9 widescreen, educational game background. No characters.',
  },
  {
    slug: 'adventures',
    chapter: 'Adventures',
    prompt:
      'A magical starry night adventure landscape for kids. Glowing stars, a rainbow arc, a distant castle on a hill, and rolling meadows below. Dreamy, colorful, full of wonder and possibility. Flat vector digital illustration, vivid night palette, child-friendly, 16:9 widescreen, educational game background. No characters.',
  },
];

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const chapterFilter = args.find((a) => a.startsWith('--chapter='))?.split('=')[1];

  if (!fs.existsSync(SCENES_OUTPUT_DIR)) {
    fs.mkdirSync(SCENES_OUTPUT_DIR, { recursive: true });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !dryRun) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  const client = apiKey ? new OpenAI({ apiKey }) : null;

  const scenes = chapterFilter
    ? CHAPTER_SCENES.filter((s) => s.slug === chapterFilter)
    : CHAPTER_SCENES;

  console.log(`Generating ${scenes.length} scene images...\n`);

  for (const scene of scenes) {
    const outputPath = path.join(SCENES_OUTPUT_DIR, `${scene.slug}.png`);

    if (fs.existsSync(outputPath) && !dryRun) {
      console.log(`  ↩ Skipping ${scene.slug} — file already exists`);
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] ${scene.slug}:`);
      console.log(`    Prompt: ${scene.prompt.slice(0, 100)}...`);
      console.log(`    Output: ${outputPath}\n`);
      continue;
    }

    console.log(`  Generating: ${scene.chapter} (${scene.slug})...`);
    try {
      const response = await client!.images.generate({
        model: 'dall-e-3',
        prompt: scene.prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        response_format: 'url',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        console.error(`  ✗ No URL returned for ${scene.slug}`);
        continue;
      }

      const imageBuffer = await downloadImage(imageUrl);
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`  ✓ Saved: ${outputPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);

      // Delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ Error generating ${scene.slug}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\nDone! Copy the generated PNG files to apps/web/public/scenes/');
  console.log('The SceneCanvas component will automatically use them as backgrounds.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
