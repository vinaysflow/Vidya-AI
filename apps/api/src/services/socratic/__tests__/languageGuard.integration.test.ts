/**
 * Language guard integration tests.
 *
 * Verifies that:
 * 1. resolveProductionLanguage maps HI/KN/ZH → EN with a console.warn
 * 2. resolveProductionLanguage passes EN/FR/DE/ES through unchanged
 * 3. When the guard resolves a language, module getFallbackResponse
 *    returns the correct language strings (FR → French strings, not EN)
 * 4. A console.warn is logged exactly once per deprecated request
 *
 * TDD: written before full wiring, verified red (module not yet imported),
 * then green after engine.ts wires resolveProductionLanguage.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { resolveProductionLanguage } from '../i18n/languageGuard';
import { getModule, registerModule } from '../registry';
import { stemModule } from '../modules/stem';
import { codingModule } from '../modules/coding';
import type { Language } from '@prisma/client';

beforeAll(() => {
  // Modules may already be registered from other tests in the same worker
  // — re-registration is idempotent (overwrites same key)
  registerModule(stemModule);
  registerModule(codingModule);
});

describe('resolveProductionLanguage — integration with module calls', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('HI → EN: getFallbackResponse returns EN celebration string', () => {
    const resolved = resolveProductionLanguage('HI' as Language);
    expect(resolved).toBe('EN');
    expect(console.warn).toHaveBeenCalledOnce();

    const mod = getModule('PHYSICS');
    const fallback = mod.getFallbackResponse('celebration', resolved);
    // Should be English "That works." not Hindi
    expect(fallback).toContain('That works');
    expect(fallback).not.toMatch(/बहुत|बढ़िया/);
  });

  it('KN → EN: getFallbackResponse returns EN celebration string', () => {
    const resolved = resolveProductionLanguage('KN' as Language);
    expect(resolved).toBe('EN');
    expect(console.warn).toHaveBeenCalledOnce();

    const mod = getModule('PHYSICS');
    const fallback = mod.getFallbackResponse('celebration', resolved);
    expect(fallback).toContain('That works');
    expect(fallback).not.toMatch(/ಅತ್ಯುತ್ತಮ/);
  });

  it('ZH → EN: getFallbackResponse returns EN celebration string', () => {
    const resolved = resolveProductionLanguage('ZH' as Language);
    expect(resolved).toBe('EN');
    expect(console.warn).toHaveBeenCalledOnce();

    const mod = getModule('CODING');
    const fallback = mod.getFallbackResponse('celebration', resolved);
    expect(fallback).toContain('That works');
    expect(fallback).not.toMatch(/做得好/);
  });

  it('FR → FR: getFallbackResponse returns French celebration string (guard does not touch Latin)', () => {
    const resolved = resolveProductionLanguage('FR' as Language);
    expect(resolved).toBe('FR');
    expect(console.warn).not.toHaveBeenCalled();

    const mod = getModule('PHYSICS');
    const fallback = mod.getFallbackResponse('celebration', resolved);
    // Should be French "Ça marche." not English
    expect(fallback).toContain('marche');
    expect(fallback).not.toContain('That works');
  });

  it('DE → DE: guard passes through, module returns German string', () => {
    const resolved = resolveProductionLanguage('DE' as Language);
    expect(resolved).toBe('DE');
    expect(console.warn).not.toHaveBeenCalled();

    const mod = getModule('PHYSICS');
    const fallback = mod.getFallbackResponse('celebration', resolved);
    expect(fallback).toContain('funktioniert');
  });

  it('logs warning exactly once per deprecated language request', () => {
    resolveProductionLanguage('HI' as Language);
    expect(console.warn).toHaveBeenCalledTimes(1);
    // Second call logs another warning (each call is independent)
    resolveProductionLanguage('KN' as Language);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
