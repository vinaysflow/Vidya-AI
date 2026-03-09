/**
 * validate-concept-graph.ts
 *
 * Validates the concept prerequisite graph in concepts.json:
 *   1. No circular prerequisites (cycles)
 *   2. All prerequisite keys reference existing concepts
 *   3. Every concept is reachable from at least one root (no prerequisites)
 *
 * Usage:
 *   cd vidya/apps/api && npx tsx scripts/validate-concept-graph.ts
 *   cd vidya/apps/api && npx tsx scripts/validate-concept-graph.ts --fix
 *
 * With --fix: removes broken prereq references in-place.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_PATH = join(__dirname, '../prisma/seed-data/concepts.json');

interface ConceptRecord {
  conceptKey: string;
  subject: string;
  topic: string;
  name: string;
  description: string;
  difficulty: number;
  gradeLevel?: number;
  prerequisites: string[];
}

function detectCycles(concepts: ConceptRecord[]): { hasCycles: boolean; cycles: string[][] } {
  const adj = new Map<string, string[]>();
  for (const c of concepts) {
    adj.set(c.conceptKey, c.prerequisites ?? []);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const foundCycles: string[][] = [];

  for (const key of adj.keys()) color.set(key, WHITE);

  function dfs(node: string, path: string[]) {
    color.set(node, GRAY);
    const neighbors = adj.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!color.has(neighbor)) continue; // dangling ref, checked separately
      if (color.get(neighbor) === GRAY) {
        // Cycle found — extract it
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          foundCycles.push([...path.slice(cycleStart), node, neighbor]);
        } else {
          foundCycles.push([node, neighbor]);
        }
      } else if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, node);
        dfs(neighbor, [...path, node]);
      }
    }
    color.set(node, BLACK);
  }

  for (const key of adj.keys()) {
    if (color.get(key) === WHITE) {
      dfs(key, []);
    }
  }

  return { hasCycles: foundCycles.length > 0, cycles: foundCycles };
}

function findBrokenRefs(concepts: ConceptRecord[]): Map<string, string[]> {
  const allKeys = new Set(concepts.map((c) => c.conceptKey));
  const broken = new Map<string, string[]>();

  for (const c of concepts) {
    const badPrereqs = (c.prerequisites ?? []).filter((p) => !allKeys.has(p));
    if (badPrereqs.length > 0) {
      broken.set(c.conceptKey, badPrereqs);
    }
  }

  return broken;
}

function findUnreachable(concepts: ConceptRecord[]): string[] {
  const roots = new Set(concepts.filter((c) => !c.prerequisites || c.prerequisites.length === 0).map((c) => c.conceptKey));
  const allKeys = new Set(concepts.map((c) => c.conceptKey));

  // BFS from all roots
  const reachable = new Set<string>(roots);
  const queue = Array.from(roots);

  // Build reverse map: which concepts depend on X
  // For reachability, we traverse forward: from X, who can X reach?
  // Actually, every concept in a chain is reachable if its prerequisites are reachable
  // Iterative approach: keep expanding until stable
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of concepts) {
      if (reachable.has(c.conceptKey)) continue;
      const prereqsAllReachable = (c.prerequisites ?? []).every((p) => reachable.has(p) || !allKeys.has(p));
      if (prereqsAllReachable) {
        reachable.add(c.conceptKey);
        changed = true;
      }
    }
  }

  return Array.from(allKeys).filter((k) => !reachable.has(k));
}

function main() {
  const fix = process.argv.includes('--fix');

  const concepts: ConceptRecord[] = JSON.parse(readFileSync(CONCEPTS_PATH, 'utf-8'));
  console.log(`Loaded ${concepts.length} concepts from concepts.json\n`);

  let hasErrors = false;

  // 1. Check for duplicate conceptKeys
  const keyCounts = new Map<string, number>();
  for (const c of concepts) {
    keyCounts.set(c.conceptKey, (keyCounts.get(c.conceptKey) ?? 0) + 1);
  }
  const duplicates = Array.from(keyCounts.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`❌ DUPLICATE KEYS (${duplicates.length}):`);
    for (const [key, count] of duplicates) {
      console.log(`   ${key} appears ${count} times`);
    }
    hasErrors = true;
  } else {
    console.log(`✓ No duplicate conceptKeys`);
  }

  // 2. Check for broken prerequisite references
  const broken = findBrokenRefs(concepts);
  if (broken.size > 0) {
    console.log(`\n❌ BROKEN PREREQUISITE REFS (${broken.size} concepts affected):`);
    for (const [key, badPrereqs] of broken) {
      console.log(`   ${key} -> missing: ${badPrereqs.join(', ')}`);
    }
    hasErrors = true;

    if (fix) {
      for (const c of concepts) {
        if (broken.has(c.conceptKey)) {
          const allKeys = new Set(concepts.map((x) => x.conceptKey));
          c.prerequisites = c.prerequisites.filter((p) => allKeys.has(p));
        }
      }
      console.log(`   --fix applied: removed broken refs`);
    }
  } else {
    console.log(`✓ All prerequisite references are valid`);
  }

  // 3. Check for cycles
  const { hasCycles, cycles } = detectCycles(concepts);
  if (hasCycles) {
    console.log(`\n❌ CYCLES DETECTED (${cycles.length}):`);
    for (const cycle of cycles.slice(0, 10)) {
      console.log(`   ${cycle.join(' -> ')}`);
    }
    hasErrors = true;
  } else {
    console.log(`✓ No circular prerequisites`);
  }

  // 4. Check reachability
  const unreachable = findUnreachable(concepts);
  if (unreachable.length > 0) {
    console.log(`\n⚠  UNREACHABLE CONCEPTS (${unreachable.length}) — these have prerequisites that are all broken/missing:`);
    for (const key of unreachable.slice(0, 20)) {
      console.log(`   ${key}`);
    }
    if (unreachable.length > 20) console.log(`   ... and ${unreachable.length - 20} more`);
  } else {
    console.log(`✓ All concepts are reachable from root nodes`);
  }

  // Summary
  const roots = concepts.filter((c) => !c.prerequisites || c.prerequisites.length === 0);
  console.log(`\nSummary:`);
  console.log(`  Total concepts:    ${concepts.length}`);
  console.log(`  Root concepts:     ${roots.length} (no prerequisites)`);
  console.log(`  Grades covered:    ${[...new Set(concepts.map((c) => c.gradeLevel ?? 3))].sort().join(', ')}`);
  console.log(`  Subjects covered:  ${[...new Set(concepts.map((c) => c.subject))].sort().join(', ')}`);

  if (fix && hasErrors) {
    writeFileSync(CONCEPTS_PATH, JSON.stringify(concepts, null, 2), 'utf-8');
    console.log(`\n--fix: wrote updated concepts.json`);
  }

  if (hasErrors && !fix) {
    console.log(`\nRun with --fix to auto-repair broken prerequisite refs.`);
    process.exit(1);
  }

  console.log('\n✓ Graph validation complete.');
}

main();
