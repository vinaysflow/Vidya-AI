/**
 * Unit tests for languageGuard.ts
 *
 * TDD: these tests are written BEFORE the implementation.
 * Expected: RED on first run (module doesn't exist yet).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('resolveProductionLanguage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes EN through unchanged', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    expect(resolveProductionLanguage('EN')).toBe('EN');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('passes FR through unchanged', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    expect(resolveProductionLanguage('FR')).toBe('FR');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('passes DE through unchanged', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    expect(resolveProductionLanguage('DE')).toBe('DE');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('passes ES through unchanged', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    expect(resolveProductionLanguage('ES')).toBe('ES');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('maps HI to EN and logs a warning', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    const result = resolveProductionLanguage('HI');
    expect(result).toBe('EN');
    expect(console.warn).toHaveBeenCalledOnce();
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('HI');
  });

  it('maps KN to EN and logs a warning', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    const result = resolveProductionLanguage('KN');
    expect(result).toBe('EN');
    expect(console.warn).toHaveBeenCalledOnce();
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('KN');
  });

  it('maps ZH to EN and logs a warning', async () => {
    const { resolveProductionLanguage } = await import('../languageGuard');
    const result = resolveProductionLanguage('ZH');
    expect(result).toBe('EN');
    expect(console.warn).toHaveBeenCalledOnce();
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('ZH');
  });
});

describe('isProductionReadyLanguage', () => {
  it('returns true for EN', async () => {
    const { isProductionReadyLanguage } = await import('../languageGuard');
    expect(isProductionReadyLanguage('EN')).toBe(true);
  });

  it('returns true for FR, DE, ES', async () => {
    const { isProductionReadyLanguage } = await import('../languageGuard');
    expect(isProductionReadyLanguage('FR')).toBe(true);
    expect(isProductionReadyLanguage('DE')).toBe(true);
    expect(isProductionReadyLanguage('ES')).toBe(true);
  });

  it('returns false for HI', async () => {
    const { isProductionReadyLanguage } = await import('../languageGuard');
    expect(isProductionReadyLanguage('HI')).toBe(false);
  });

  it('returns false for KN', async () => {
    const { isProductionReadyLanguage } = await import('../languageGuard');
    expect(isProductionReadyLanguage('KN')).toBe(false);
  });

  it('returns false for ZH', async () => {
    const { isProductionReadyLanguage } = await import('../languageGuard');
    expect(isProductionReadyLanguage('ZH')).toBe(false);
  });
});
