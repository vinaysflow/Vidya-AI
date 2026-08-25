#!/usr/bin/env node
/**
 * Image -> textured 3D -> (auto-rig) -> hero.glb  via Tripo3D OpenAPI.
 *
 * Tripo's free tier grants credits on API-key creation (no credit card) and
 * produces a TEXTURED model (face + color, the RM look) and can auto-rig it.
 * The result is dropped at public/proto/hero.glb, which the R3F scene loads and
 * auto-normalizes.
 *
 * Usage:
 *   TRIPO_API_KEY=tsk_xxx node scripts/tripo-to-hero.mjs
 *   TRIPO_API_KEY=tsk_xxx node scripts/tripo-to-hero.mjs --no-rig
 *
 * Flags:
 *   --src <path>   source image (default: public/proto/rm-hero.png)
 *   --out <path>   output glb   (default: public/proto/hero.glb)
 *   --no-rig       skip auto-rig (textured but no skeleton)
 *
 * Get a free key: https://platform.tripo3d.ai -> API Keys (starts with tsk_).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const API = 'https://api.tripo3d.ai/v2/openapi';
const KEY = process.env.TRIPO_API_KEY;

const TASKS_FILE = resolve(webRoot, '.tripo-tasks.json');

function parseArgs(argv) {
  const a = { rig: true, animate: null, animateOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--no-rig') a.rig = false;
    else if (t === '--src') a.src = argv[++i];
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--animate') a.animate = argv[++i] ?? 'preset:idle';
    else if (t === '--animate-only') {
      a.animateOnly = true;
      a.animate = a.animate ?? 'preset:idle';
    }
  }
  a.src = resolve(webRoot, a.src ?? 'public/proto/rm-hero.png');
  a.out = resolve(webRoot, a.out ?? 'public/proto/hero.glb');
  return a;
}

async function readTasks() {
  try {
    return JSON.parse(await readFile(TASKS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveTasks(patch) {
  const cur = await readTasks();
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  await writeFile(TASKS_FILE, JSON.stringify(next, null, 2));
  return next;
}

const auth = () => ({ Authorization: `Bearer ${KEY}` });

async function uploadImage(path) {
  const buf = await readFile(path);
  const ext = extname(path).slice(1).toLowerCase().replace('jpg', 'jpeg');
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: `image/${ext}` }), `image.${ext}`);
  const res = await fetch(`${API}/upload`, { method: 'POST', headers: auth(), body: fd });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`upload failed: ${JSON.stringify(json)}`);
  const token = json.data?.image_token ?? json.data?.file_token ?? json.data?.token;
  if (!token) throw new Error(`no file token in upload response: ${JSON.stringify(json)}`);
  return { token, type: ext === 'jpeg' ? 'jpg' : ext };
}

async function createTask(body) {
  const res = await fetch(`${API}/task`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`task create failed (${json.code}): ${json.message ?? JSON.stringify(json)}`);
  return json.data.task_id;
}

async function pollTask(taskId, label) {
  process.stdout.write(`  ${label} `);
  for (;;) {
    const res = await fetch(`${API}/task/${taskId}`, { headers: auth() });
    const json = await res.json();
    if (json.code !== 0) throw new Error(`poll failed: ${JSON.stringify(json)}`);
    const d = json.data;
    if (d.status === 'success') {
      process.stdout.write(` done\n`);
      return d;
    }
    if (['failed', 'cancelled', 'unknown', 'banned', 'expired'].includes(d.status)) {
      throw new Error(`${label} ${d.status}`);
    }
    process.stdout.write(`.${d.progress ?? 0}%`.replace('.0%', '.'));
    await new Promise((r) => setTimeout(r, 4000));
  }
}

function pickGlb(output) {
  return (
    output?.pbr_model ??
    output?.model ??
    output?.rigged_model ??
    (typeof output?.base_model === 'string' ? output.base_model : undefined)
  );
}

async function download(url, out) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  return buf.length;
}

async function retarget(rigTaskId, animation) {
  const taskId = await createTask({
    type: 'animate_retarget',
    original_model_task_id: rigTaskId,
    animation,
    out_format: 'glb',
    bake_animation: true,
    export_with_geometry: true,
  });
  const task = await pollTask(taskId, `animating (${animation})`);
  return { taskId, glbUrl: pickGlb(task.output) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!KEY) {
    console.error(
      [
        'Missing TRIPO_API_KEY.',
        '',
        '1. Sign up free (no credit card) at https://platform.tripo3d.ai',
        '2. API Keys -> create a key (starts with tsk_)',
        '3. Re-run:',
        '   TRIPO_API_KEY=tsk_xxx pnpm avatar:3d:tripo',
      ].join('\n'),
    );
    process.exit(1);
  }

  // Cheap path: reuse a previously-rigged task to bake an animation (10 credits).
  if (args.animateOnly) {
    const tasks = await readTasks();
    if (!tasks.rigTaskId) {
      throw new Error('No saved rigTaskId in .tripo-tasks.json — run a full chain first.');
    }
    console.log(`Animate-only: retargeting rig ${tasks.rigTaskId} with ${args.animate}...`);
    const { glbUrl } = await retarget(tasks.rigTaskId, args.animate);
    if (!glbUrl) throw new Error('retarget produced no GLB');
    const bytes = await download(glbUrl, args.out);
    console.log(`\nDone. Wrote ${(bytes / 1e6).toFixed(2)} MB -> ${args.out}`);
    return;
  }

  console.log(`Source  : ${args.src}`);
  console.log(`Output  : ${args.out}`);
  console.log(`Rig     : ${args.rig ? 'yes' : 'no'}`);
  console.log(`Animate : ${args.animate ?? 'no'}\n`);

  console.log('Uploading image...');
  const file = await uploadImage(args.src);

  console.log('Image to 3D (textured, PBR)...');
  const imgTaskId = await createTask({
    type: 'image_to_model',
    file: { type: file.type, file_token: file.token },
    texture: true,
    pbr: true,
    texture_alignment: 'original_image',
    orientation: 'align_image',
  });
  const imgTask = await pollTask(imgTaskId, 'generating');
  let glbUrl = pickGlb(imgTask.output);
  if (!glbUrl) throw new Error(`no GLB in output: ${JSON.stringify(imgTask.output)}`);
  await saveTasks({ imageTaskId: imgTaskId });

  let rigTaskId = null;
  if (args.rig || args.animate) {
    console.log('\nAuto-rig...');
    rigTaskId = await createTask({ type: 'animate_rig', original_model_task_id: imgTaskId, out_format: 'glb' });
    const rigTask = await pollTask(rigTaskId, 'rigging');
    glbUrl = pickGlb(rigTask.output) ?? glbUrl;
    await saveTasks({ rigTaskId });
  }

  if (args.animate && rigTaskId) {
    console.log('\nBake animation...');
    const { glbUrl: animUrl } = await retarget(rigTaskId, args.animate);
    if (animUrl) glbUrl = animUrl;
  }

  console.log('\nDownloading GLB...');
  const bytes = await download(glbUrl, args.out);
  console.log(`\nDone. Wrote ${(bytes / 1e6).toFixed(2)} MB -> ${args.out}`);
  console.log('Task ids saved to .tripo-tasks.json (future animations cost only 10 credits via --animate-only).');
  console.log('Refresh /proto/r3f to see the avatar.');
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
