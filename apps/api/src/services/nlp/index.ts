/**
 * NLP Service - Pre-computed text metrics
 * 
 * Zero external dependencies, zero LLM calls.
 * Provides structural and stylistic analysis that would otherwise
 * consume tokens in the Claude prompt.
 */

export { computeEssayMetrics } from './essayMetrics';
export type { EssayMetrics } from './essayMetrics';
export { computeCodingMetrics } from './codingMetrics';
export type { CodingMetrics } from './codingMetrics';
export { computeEconomicsMetrics } from './economicsMetrics';
export type { EconomicsMetrics } from './economicsMetrics';
export { computeLitMetrics } from './litMetrics';
export type { LitMetrics } from './litMetrics';
export { ESSAY_CLICHES, PASSIVE_VOICE_PATTERNS, SENSORY_WORDS } from './cliches';
