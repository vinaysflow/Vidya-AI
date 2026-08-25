/**
 * misconceptionTracker.ts
 *
 * Phase 1 of the learner model: a queryable misconception layer.
 *
 *  - The Misconception table is the content catalog (promoted from
 *    QuestionTemplate.misconceptions and Concept.misconceptionsData). Entries are
 *    created lazily the first time a misconception is observed, and can also be
 *    bulk-synced from content via `syncMisconceptionCatalog`.
 *  - MisconceptionState is the per-student ledger with an
 *    ACTIVE -> RESOLVING -> RESOLVED lifecycle.
 *
 * Inference has two paths:
 *  1. Choice cards: pickedDistractorIndex -> template.misconceptions[i].
 *  2. Free response: analysis.errorType + errorDescription matched against the
 *     catalog's `signature` for the concept.
 */

import { Subject } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const RESOLVE_AFTER_CONSECUTIVE_CORRECT = 2;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function keywords(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

/** Minimum match score required to attribute a free-response error to a catalog misconception. */
export const MIN_MATCH_SCORE = 2;

export interface CatalogCandidate {
  id: string;
  signature: { errorType?: string; keywords?: string[] } | null;
}

/**
 * Pure scoring for free-response misconception attribution: an exact errorType
 * match is worth 2, each overlapping description keyword worth 1. Returns the
 * best candidate at or above MIN_MATCH_SCORE, else null.
 */
export function selectBestMisconceptionMatch(
  candidates: CatalogCandidate[],
  errorType: string | null | undefined,
  errorDescription: string | null | undefined,
): { id: string; score: number } | null {
  const errKeywords = keywords(errorDescription);
  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const sig = c.signature ?? {};
    let score = 0;
    if (errorType && sig.errorType && sig.errorType === errorType) score += 2;
    const overlap = (sig.keywords ?? []).filter((k) => errKeywords.includes(k)).length;
    score += overlap;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best && best.score >= MIN_MATCH_SCORE ? best : null;
}

interface TemplateMisconceptionEntry {
  distractorIndex: number;
  pattern: string;
  diagnosis: string;
  socraticResponse?: string;
  prerequisiteGap?: string;
}

/** Upsert a catalog Misconception row, returning its id. */
async function upsertCatalogEntry(args: {
  conceptKey: string;
  subject: Subject;
  gradeLevel: number;
  pattern: string;
  description: string;
  parentLabel?: string | null;
  signature: Record<string, unknown>;
  remediation?: Record<string, unknown> | null;
  source?: string;
}): Promise<string> {
  const key = `${slugify(args.conceptKey)}__${slugify(args.pattern)}`;
  const row = await prisma.misconception.upsert({
    where: { key },
    update: {
      // Keep description/signature fresh from the latest content, but don't clobber a parent label.
      description: args.description,
      signature: args.signature as any,
      ...(args.remediation ? { remediation: args.remediation as any } : {}),
      ...(args.parentLabel ? { parentLabel: args.parentLabel } : {}),
    },
    create: {
      key,
      conceptKey: args.conceptKey,
      subject: args.subject,
      gradeLevel: args.gradeLevel,
      description: args.description,
      parentLabel: args.parentLabel ?? null,
      signature: args.signature as any,
      remediation: (args.remediation ?? null) as any,
      source: args.source ?? null,
    },
    select: { id: true },
  });
  return row.id;
}

/** Record/update the per-student ledger for an observed misconception. */
async function observeMisconceptionState(userId: string, misconceptionId: string): Promise<void> {
  const existing = await prisma.misconceptionState.findUnique({
    where: { userId_misconceptionId: { userId, misconceptionId } },
  });
  if (!existing) {
    await prisma.misconceptionState.create({
      data: { userId, misconceptionId, status: 'ACTIVE', observations: 1, consecutiveCorrect: 0 },
    });
    return;
  }
  // Re-observing resets resolution progress and re-activates a resolved/resolving one.
  await prisma.misconceptionState.update({
    where: { userId_misconceptionId: { userId, misconceptionId } },
    data: {
      status: 'ACTIVE',
      observations: existing.observations + 1,
      consecutiveCorrect: 0,
      lastObservedAt: new Date(),
      resolvedAt: null,
    },
  });
}

export interface InferMisconceptionArgs {
  userId: string;
  conceptKey: string | null;
  subject: Subject;
  templateId?: string | null;
  pickedDistractorIndex?: number | null;
  errorType?: string | null;
  errorDescription?: string | null;
  gradeLevel?: number;
}

/**
 * Infers the named misconception a wrong turn reveals, records it in the
 * student's ledger, and returns the catalog misconception id (or null).
 */
export async function inferMisconceptionForTurn(args: InferMisconceptionArgs): Promise<string | null> {
  const conceptKey = args.conceptKey;
  if (!conceptKey) return null;
  const gradeLevel = args.gradeLevel ?? 4;

  // ── Path 1: choice card → template.misconceptions[distractorIndex] ──
  if (args.templateId && args.pickedDistractorIndex != null) {
    const template = await prisma.questionTemplate.findUnique({
      where: { id: args.templateId },
      select: { misconceptions: true, gradeLevel: true },
    });
    const entries = (template?.misconceptions as unknown as TemplateMisconceptionEntry[] | null) ?? null;
    const entry = Array.isArray(entries)
      ? entries.find((e) => e.distractorIndex === args.pickedDistractorIndex)
      : null;
    if (entry) {
      const id = await upsertCatalogEntry({
        conceptKey,
        subject: args.subject,
        gradeLevel: template?.gradeLevel ?? gradeLevel,
        pattern: entry.pattern,
        description: entry.diagnosis,
        signature: {
          distractorIndices: [entry.distractorIndex],
          errorType: args.errorType ?? undefined,
          keywords: keywords(entry.pattern + ' ' + entry.diagnosis),
        },
        remediation: entry.socraticResponse
          ? { reframe: entry.socraticResponse, prerequisiteGap: entry.prerequisiteGap ?? null }
          : null,
        source: 'template',
      });
      await observeMisconceptionState(args.userId, id);
      return id;
    }
  }

  // ── Path 2: free-response → match analysis against the catalog ──
  if (args.errorType || args.errorDescription) {
    const candidates = await prisma.misconception.findMany({ where: { conceptKey } });
    const best = selectBestMisconceptionMatch(
      candidates.map((c) => ({
        id: c.id,
        signature: c.signature as { errorType?: string; keywords?: string[] } | null,
      })),
      args.errorType,
      args.errorDescription,
    );
    if (best) {
      await observeMisconceptionState(args.userId, best.id);
      return best.id;
    }
  }

  return null;
}

/**
 * A correct turn on `conceptKey` advances the student's ACTIVE/RESOLVING
 * misconceptions on that concept toward RESOLVED.
 */
export async function applyCorrectTowardResolution(
  userId: string,
  conceptKey: string | null,
  _subject: Subject,
): Promise<void> {
  if (!conceptKey) return;
  const concepts = await prisma.misconception.findMany({
    where: { conceptKey },
    select: { id: true },
  });
  if (concepts.length === 0) return;
  const ids = concepts.map((c) => c.id);

  const states = await prisma.misconceptionState.findMany({
    where: { userId, misconceptionId: { in: ids }, status: { in: ['ACTIVE', 'RESOLVING'] } },
  });

  await Promise.all(
    states.map((s) => {
      const next = s.consecutiveCorrect + 1;
      const resolved = next >= RESOLVE_AFTER_CONSECUTIVE_CORRECT;
      return prisma.misconceptionState.update({
        where: { id: s.id },
        data: {
          consecutiveCorrect: next,
          status: resolved ? 'RESOLVED' : 'RESOLVING',
          resolvedAt: resolved ? new Date() : null,
        },
      });
    }),
  );
}

export interface ActiveMisconception {
  misconceptionId: string;
  key: string;
  conceptKey: string;
  description: string;
  parentLabel: string | null;
  status: 'ACTIVE' | 'RESOLVING' | 'RESOLVED';
  observations: number;
  remediation: Record<string, unknown> | null;
}

/** Returns the student's open (ACTIVE/RESOLVING) misconceptions, newest first. */
export async function getActiveMisconceptions(
  userId: string,
  conceptKey?: string | null,
): Promise<ActiveMisconception[]> {
  const states = await prisma.misconceptionState.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'RESOLVING'] },
      ...(conceptKey ? { misconception: { conceptKey } } : {}),
    },
    orderBy: { lastObservedAt: 'desc' },
    include: { misconception: true },
    take: 20,
  });
  return states.map((s) => ({
    misconceptionId: s.misconceptionId,
    key: s.misconception.key,
    conceptKey: s.misconception.conceptKey,
    description: s.misconception.description,
    parentLabel: s.misconception.parentLabel,
    status: s.status as 'ACTIVE' | 'RESOLVING' | 'RESOLVED',
    observations: s.observations,
    remediation: (s.misconception.remediation as Record<string, unknown> | null) ?? null,
  }));
}

/** Returns misconceptions this student has cleared (for the parent view). */
export async function getResolvedMisconceptions(
  userId: string,
): Promise<Array<{ key: string; conceptKey: string; parentLabel: string | null; description: string; resolvedAt: Date | null }>> {
  const states = await prisma.misconceptionState.findMany({
    where: { userId, status: 'RESOLVED' },
    orderBy: { resolvedAt: 'desc' },
    include: { misconception: true },
    take: 20,
  });
  return states.map((s) => ({
    key: s.misconception.key,
    conceptKey: s.misconception.conceptKey,
    parentLabel: s.misconception.parentLabel,
    description: s.misconception.description,
    resolvedAt: s.resolvedAt,
  }));
}

/**
 * Bulk-promote misconceptions from content (QuestionTemplate.misconceptions and
 * Concept.misconceptionsData) into the catalog. Idempotent; safe to re-run.
 * Returns the number of catalog rows upserted.
 */
export async function syncMisconceptionCatalog(subject: Subject = 'MATHEMATICS'): Promise<number> {
  let count = 0;

  const templates = await prisma.questionTemplate.findMany({
    where: { subject, misconceptions: { not: undefined } },
    select: { conceptKey: true, gradeLevel: true, misconceptions: true },
  });
  for (const t of templates) {
    const entries = (t.misconceptions as unknown as TemplateMisconceptionEntry[] | null) ?? null;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry?.pattern) continue;
      await upsertCatalogEntry({
        conceptKey: t.conceptKey,
        subject,
        gradeLevel: t.gradeLevel,
        pattern: entry.pattern,
        description: entry.diagnosis ?? entry.pattern,
        signature: {
          distractorIndices: [entry.distractorIndex],
          keywords: keywords(entry.pattern + ' ' + (entry.diagnosis ?? '')),
        },
        remediation: entry.socraticResponse
          ? { reframe: entry.socraticResponse, prerequisiteGap: entry.prerequisiteGap ?? null }
          : null,
        source: 'seed-v1',
      });
      count++;
    }
  }

  const concepts = await prisma.concept.findMany({
    where: { subject, misconceptionsData: { not: undefined } },
    select: { conceptKey: true, gradeLevel: true, misconceptionsData: true },
  });
  for (const c of concepts) {
    if (!c.conceptKey) continue;
    const data = (c.misconceptionsData as unknown as Array<{ id?: string; description?: string }> | null) ?? null;
    if (!Array.isArray(data)) continue;
    for (const m of data) {
      if (!m?.description) continue;
      await upsertCatalogEntry({
        conceptKey: c.conceptKey,
        subject,
        gradeLevel: c.gradeLevel,
        pattern: m.id ?? m.description.slice(0, 40),
        description: m.description,
        signature: { keywords: keywords(m.description) },
        source: 'seed-v1',
      });
      count++;
    }
  }

  return count;
}
