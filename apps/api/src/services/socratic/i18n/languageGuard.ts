/**
 * Language production-readiness guard.
 *
 * Non-Latin-character languages (Hindi, Kannada, Chinese) are
 * deprecated in production pending native-speaker review of
 * acknowledgment tone (P5 alignment). The localized strings
 * exist in module files for future re-introduction but must
 * not be served to users today — they contain praise patterns
 * that Prompt 1-B has not validated.
 *
 * When a deprecated language is requested, this guard routes
 * to English and logs a warning.
 */

import type { Language } from '@prisma/client';

const PRODUCTION_READY_LANGUAGES: Set<Language> = new Set([
  'EN', 'FR', 'DE', 'ES',
]);

const DEPRECATED_LANGUAGES: Set<Language> = new Set([
  'HI', 'KN', 'ZH',
]);

export function resolveProductionLanguage(requested: Language): Language {
  if (PRODUCTION_READY_LANGUAGES.has(requested)) return requested;
  if (DEPRECATED_LANGUAGES.has(requested)) {
    console.warn(
      `[i18n] Language ${requested} is deprecated pending native-speaker review (P5). Falling back to EN.`,
    );
    return 'EN';
  }
  // Unknown language — fall back to EN
  console.warn(`[i18n] Unknown language ${requested}. Falling back to EN.`);
  return 'EN';
}

export function isProductionReadyLanguage(lang: Language): boolean {
  return PRODUCTION_READY_LANGUAGES.has(lang);
}
