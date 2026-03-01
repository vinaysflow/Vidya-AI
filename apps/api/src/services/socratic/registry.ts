/**
 * Module Registry
 * 
 * Maps Subject enum values to TutorModule implementations.
 * The engine queries this registry to find the right module for each session.
 * 
 * Usage:
 *   import { getModule, registerModule } from './registry';
 *   
 *   // At startup, modules self-register:
 *   registerModule(stemModule);
 *   registerModule(essayModule);
 *   
 *   // At runtime, the engine looks up:
 *   const module = getModule('PHYSICS'); // → stemModule
 *   const module = getModule('ESSAY_WRITING'); // → essayModule
 */

import type { Subject } from '@prisma/client';
import type { TutorModule } from './module';

// ============================================
// REGISTRY
// ============================================

/** Internal map from Subject → TutorModule */
const moduleMap = new Map<Subject, TutorModule>();

/**
 * Register a TutorModule for one or more subjects.
 * Overwrites any existing registration for the same subject.
 */
export function registerModule(mod: TutorModule): void {
  for (const subject of mod.subjects) {
    moduleMap.set(subject, mod);
  }
  console.log(`[Registry] Registered module '${mod.id}' for subjects: ${mod.subjects.join(', ')}`);
}

/**
 * Get the TutorModule registered for a given subject.
 * Throws if no module is registered (programming error — modules should be
 * registered at startup before any requests arrive).
 */
export function getModule(subject: Subject): TutorModule {
  const mod = moduleMap.get(subject);
  if (!mod) {
    throw new Error(
      `No TutorModule registered for subject '${subject}'. ` +
      `Available subjects: ${[...moduleMap.keys()].join(', ') || '(none)'}`
    );
  }
  return mod;
}

/**
 * Check if a module is registered for a given subject.
 */
export function hasModule(subject: Subject): boolean {
  return moduleMap.has(subject);
}

/**
 * List all registered modules (useful for health checks / admin).
 */
export function listModules(): Array<{ id: string; subjects: Subject[] }> {
  const seen = new Set<string>();
  const result: Array<{ id: string; subjects: Subject[] }> = [];

  for (const mod of moduleMap.values()) {
    if (!seen.has(mod.id)) {
      seen.add(mod.id);
      result.push({ id: mod.id, subjects: [...mod.subjects] });
    }
  }

  return result;
}
