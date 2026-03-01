/**
 * TutorModule Interface
 * 
 * Defines the contract for domain-specific tutoring modules.
 * Each module provides the prompts, detection functions, validation rules,
 * fallbacks, and optional hooks for a particular tutoring domain.
 * 
 * The engine handles shared infrastructure:
 * - Anthropic client and prompt caching
 * - Model routing (Haiku for analysis, Sonnet for response)
 * - Session summarization
 * - Context management and hint ladder progression
 * 
 * Modules provide domain-specific configuration:
 * - System and analysis prompts
 * - Attempt detection logic
 * - Response validation (leak detection)
 * - Hint ladder text
 * - Fallback responses
 * - Language support
 * - Pre/post processing hooks
 */

import type {
  Language,
  Subject,
  QuestionType,
  Message,
  PreProcessParams,
  PreProcessResult,
} from './types';

// ============================================
// TUTOR MODULE INTERFACE
// ============================================

export interface TutorModule {
  /** Unique identifier for this module (e.g., 'stem', 'essay') */
  id: string;

  /** Which Subject enum values this module handles */
  subjects: Subject[];

  /** Languages this module supports */
  supportedLanguages: Language[];

  // ==========================================
  // PROMPTS
  // ==========================================

  /** The system prompt for response generation (Sonnet) */
  systemPrompt: string;

  /** The system prompt for analysis (Haiku) */
  analysisPrompt: string;

  /** Progressive hint prompts by level (1-5) */
  hintLevelPrompts: Record<number, string>;

  /** "Show your work" prompt text, keyed by language */
  attemptPrompts: Record<string, string>;

  // ==========================================
  // DETECTION + VALIDATION
  // ==========================================

  /**
   * Detect whether the student's message contains an actual attempt.
   * STEM: checks for math expressions, formulas, reasoning keywords.
   * Essay: checks for 50+ word blocks, essay draft indicators.
   * Language parameter enables multilingual keyword detection.
   */
  containsAttempt(message: string, language?: Language): boolean;

  /** Regex patterns that indicate the model is leaking answers/content */
  leakPatterns: RegExp[];

  /**
   * Full response validation including leak patterns and domain-specific heuristics.
   * Returns whether the response is clean, and a safe fallback message if not.
   */
  validateResponse(response: string): { isClean: boolean; fallbackMessage?: string };

  /**
   * Get a fallback response for a given question type and language.
   * Used when generation fails or when a leak is detected.
   */
  getFallbackResponse(questionType: QuestionType | string, language?: string): string;

  /**
   * Get language-specific context to append to the system prompt.
   * (e.g., Hindi coaching vocabulary for STEM, essay-coaching vocabulary for essays)
   */
  getLanguageContext(language: Language): string;

  // ==========================================
  // MODEL POLICY (per-module SLM routing)
  // ==========================================

  /**
   * Optional per-module model policy. When set, overrides the global
   * LlmClient defaults for this module's analysis and/or response calls.
   * Enables routing specific modules to cheaper SLMs while keeping
   * others on full LLMs.
   */
  modelPolicy?: {
    analysis?: { provider: string; model: string };
    response?: { provider: string; model: string };
  };

  // ==========================================
  // OPTIONAL HOOKS
  // ==========================================

  /**
   * Pre-process before analysis. Can inject additional context (e.g., NLP metrics)
   * and provide a cache key for deduplication.
   * If not provided, the engine runs analysis without pre-processing.
   */
  preProcessAnalysis?(params: PreProcessParams): PreProcessResult;

  /**
   * Max tokens for response generation. Defaults to 400 if not specified.
   * Essay mode uses 300 to reduce leak risk.
   */
  maxResponseTokens?: number;

  /**
   * Build additional system prompt content based on analysis results and metadata.
   * Appended to the system prompt during response generation.
   * (e.g., essay category-specific coaching focus)
   */
  buildResponseSystemAddendum?(analysis: any, metadata?: Record<string, any>): string;

  /**
   * Build the user prompt for response generation.
   * If not provided, the engine uses a generic format.
   */
  buildResponseUserPrompt?(params: {
    questionType: QuestionType;
    analysis: any;
    language: Language;
    historyText: string;
    metadata?: Record<string, any>;
  }): string;

  /**
   * Build the user prompt for analysis.
   * If not provided, the engine uses a generic format.
   */
  buildAnalysisUserPrompt?(params: {
    problem: string;
    studentMessage: string;
    historyText: string;
    subject: Subject;
    language: Language;
    metadata?: Record<string, any>;
  }): string;

  /**
   * Map analysis results to a question type and hint level.
   * If not provided, the engine uses a default mapping.
   */
  mapAnalysisToStrategy?(analysis: any, currentHintLevel: number): {
    questionType: QuestionType;
    newHintLevel: number;
  };
}
