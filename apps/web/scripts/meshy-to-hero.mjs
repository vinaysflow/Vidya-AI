#!/usr/bin/env node
/**
 * Image -> 3D -> (auto-rig + animation) -> hero.glb
 *
 * Turns a single character image into a rigged, textured GLB and drops it where
 * the R3F prototype loads it (public/proto/hero.glb). The scene auto-normalizes
 * scale/pivot, so the only manual step is running this once.
 *
 * Usage:
 *   MESHY_API_KEY=msy_xxx node scripts/meshy-to-hero.mjs
 *   MESHY_API_KEY=msy_xxx node scripts/meshy-to-hero.mjs --src public/proto/rm-hero.png --no-rig
 *
 * Flags:
 *   --src <path>     source image (default: public/proto/rm-hero.png)
 *   --out <path>     output glb   (default: public/proto/hero.glb)
 *   --no-rig         stop after image->3D (skip auto-rig; faster, but no skeleton)
 *   --polycount <n>  target polycount for remesh (default: 50000, rig-friendly)
 *   --height <m>     character height in meters for rigging (default: 1.75)
 *
 * Get a free key at https://www.meshy.ai (Settings -> API Keys). Costs ~Credits:
 * image-to-3d + auto-rig are a few credits; the free tier covers a few avatars.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');

const API = 'https://api.meshy.ai/openapi/v1';
const KEY = process.env.MESHY_API_KEY;

function parseArgs(argv) {
  const a = { rig: true, polycount: 50000, height: 1.75 };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--no-rig') a.rig = false;
    else if (t === '--src') a.src = argv[++i];
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--polycount') a.polycount = Number(argv[++i]);
    else if (t === '--height') a.height = Number(argv[++i]);
  }
  a.src = resolve(webRoot, a.src ?? 'public/proto/rm-hero.png');
  a.out = resolve(webRoot, a.out ?? 'public/proto/hero.glb');
  return a;
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

async function toDataUri(path) {
  const buf = await readFile(path);
  const mime = MIME[extname(path).toLowerCase()] ?? 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.message || json?.error || text || res.statusText;
    throw new Error(`${method} ${path} -> ${res.status}: ${msg}`);
  }
  return json;
}

async function pollTask(kind, id, label) {
  process.stdout.write(`  ${label} `);
  for (;;) {
    const task = await api('GET', `/${kind}/${id}`);
    if (task.status === 'SUCCEEDED') {
      process.stdout.write(` done (${task.consumed_credits ?? '?'} credits)\n`);
      return task;
    }
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`${label} ${task.status}: ${task.task_error?.message ?? 'unknown error'}`);
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function download(url, out) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  return buf.length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!KEY) {
    console.error(
      [
        'Missing MESHY_API_KEY.',
        '',
        '1. Sign up free at https://www.meshy.ai',
        '2. Settings -> API Keys -> create a key (starts with msy_)',
        '3. Re-run:',
        '   MESHY_API_KEY=msy_xxx pnpm avatar:3d',
        '',
        'This converts public/proto/rm-hero.png into a rigged GLB at public/proto/hero.glb.',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(`Source image : ${args.src}`);
  console.log(`Output GLB   : ${args.out}`);
  console.log(`Auto-rig     : ${args.rig ? 'yes' : 'no'}\n`);

  console.log('Step 1/3 - Image to 3D (A-pose, textured)...');
  const imageDataUri = await toDataUri(args.src);
  const create = await api('POST', '/image-to-3d', {
    image_url: imageDataUri,
    should_remesh: true,
    should_texture: true,
    enable_pbr: true,
    pose_mode: 'a-pose',
    target_polycount: args.polycount,
    target_formats: ['glb'],
  });
  const imgTaskId = create.result;
  const imgTask = await pollTask('image-to-3d', imgTaskId, 'generating mesh');
  let glbUrl = imgTask.model_urls?.glb;
  if (!glbUrl) throw new Error('image-to-3d returned no GLB url');

  if (args.rig) {
    console.log('\nStep 2/3 - Auto-rig (skeleton + basic animations)...');
    try {
      const rigCreate = await api('POST', '/rigging', {
        input_task_id: imgTaskId,
        height_meters: args.height,
      });
      const rigTask = await pollTask('rigging', rigCreate.result, 'rigging');
      glbUrl =
        rigTask.result?.basic_animations?.walking_glb_url ??
        rigTask.result?.rigged_character_glb_url ??
        glbUrl;
    } catch (err) {
      console.warn(`  rigging skipped: ${err.message}`);
      console.warn('  (falling back to the un-rigged mesh; scene adds a breathing bob)');
    }
  }

  console.log('\nStep 3/3 - Downloading GLB...');
  const bytes = await download(glbUrl, args.out);
  console.log(`\nDone. Wrote ${(bytes / 1e6).toFixed(2)} MB -> ${args.out}`);
  console.log('Refresh /proto/r3f to see the 3D avatar.');
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
