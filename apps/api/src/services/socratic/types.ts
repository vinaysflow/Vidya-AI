/**
 * Shared Types for the Socratic Engine
 * 
 * All types used across the engine, modules, and routes.
 * Extracted to avoid circular dependencies between engine.ts and module files.
 */

import type { Language, Subject } from '@prisma/client';

// Re-export Prisma types for convenience
export type { Language, Subject } from '@prisma/client';

// ============================================
// CORE TYPES
// ============================================

export interface TutorInput {
  sessionId: string;
  userMessage: string;
  language: Language;
  conversationHistory: Message[];
  subject: Subject;
  topic?: string;
  currentHintLevel: number;
  noFinalAnswer?: boolean;
  // Essay prompt metadata (populated when subject is ESSAY_WRITING)
  essayType?: string;         // "Common App", "Supplemental", etc.
  wordLimit?: number;         // From the matched prompt
  essayPromptText?: string;   // The actual prompt text from the catalog
  essayCategory?: string;     // "WHY_US", "IDENTITY", etc.
  schoolName?: string;        // "Stanford University"
  // Counselor metadata (populated when subject is COUNSELING)
  clientContext?: Record<string, any>;  // Full client context (PathWiz or ODEE shape)
  variant?: string;                     // 'COLLEGE_US' | 'CAREER_INDIA'
  clientUserId?: string;                // Opaque client user ID
}

export interface TutorResponse {
  message: string;
  language: Language;
  metadata: {
    questionType: QuestionType;
    topic?: string;
    grounding?: 'bank' | 'reasoned' | 'retrieved';
    confidence?: number;
    safetyEvents?: string[];
    analysisResult?: AnalysisResult;
    essayAnalysisResult?: EssayAnalysisResult;
    counselorAnalysisResult?: CounselorAnalysisResult;
    hintLevel: number;
    conceptsIdentified: string[];
    distanceFromSolution: number;
    // Essay-specific metadata (populated when subject is ESSAY_WRITING)
    readiness?: number;
    essayStrengths?: string[];
    essayGaps?: string[];
    essaySuggestedFocus?: string;
    // Counselor-specific metadata (populated when subject is COUNSELING)
    counselorIntent?: string;
    counselorUrgency?: string;
    counselorSuggestedFocus?: string;
    // Interaction signals (V2 — populated by computeInteractionSignals)
    interactionSignals?: {
      engagementQuality: 'high' | 'medium' | 'low';
      topicsCovered: string[];
      behavioralObservations: string[];
      messageCount: number;
    };
    // Model observability (populated by engine)
    modelUsed?: {
      provider: string;
      model: string;
      fallbackUsed: boolean;
    };
    // Visual content for interactive whiteboard (populated by modules)
    visualContent?: VisualContent;
  };
}

// ============================================
// VISUAL CONTENT (Interactive Whiteboard)
// ============================================

export interface VisualContent {
  type: 'equation_steps' | 'code_trace' | 'diagram' | 'graph' | 'scatter_plot';
  data: any;
}

// ============================================
// ESSAY-SPECIFIC TYPES
// ============================================

export interface EssayAnalysisResult {
  readiness: number;              // 0-100 (100 = polished, 0 = no draft)
  strengths: string[];            // What the student is doing well
  gaps: string[];                 // Areas needing improvement
  suggestedFocus: string;         // Single most important area to address next
  hasDraft: boolean;              // Whether student shared substantive draft content
  promptAlignment?: string;       // How well the draft addresses the prompt
  showDontTell?: string;          // Assessment of specificity vs abstraction
  voice?: string;                 // Assessment of authenticity and tone
  structure?: string;             // Assessment of pacing, hook, flow, reflection
}

// ============================================
// STEM-SPECIFIC TYPES
// ============================================

export interface AnalysisResult {
  distanceFromSolution: number;  // 0-100 (0 = correct)
  topic?: string;
  conceptsIdentified: string[];
  conceptGaps: string[];
  errorType: 'conceptual' | 'computational' | 'approach' | 'none';
  errorDescription: string | null;
  studentStrengths: string[];
  suggestedFocus: string;
  isAttemptShown: boolean;
}

// ============================================
// COMMON TYPES
// ============================================

export type QuestionType = 
  | 'attempt_prompt'     // Ask student to show work first
  | 'clarifying'         // Clarify the problem/question
  | 'socratic'           // Core Socratic question
  | 'hint_with_question' // Hint + follow-up question
  | 'foundational'       // Back to basics question
  | 'celebration'        // Student got it right
  | 'encouragement';     // Student struggling, need support

export interface Message {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  language?: Language;
}

export type AttemptQuality = 'none' | 'minimal' | 'partial' | 'substantial';

export interface AttemptAnalysis {
  attemptShown: boolean;
  attemptQuality: AttemptQuality;
  conceptsUsed: string[];
  misconceptions: string[];
}

export interface SocraticContext {
  language: Language;
  subject: Subject;
  topic?: string;
  hintLevel: number;
  knowledgeState: KnowledgeState;
  conversationHistory: Message[];
}

export interface ResponseStrategy {
  type:
    | 'request_attempt'
    | 'address_misconception'
    | 'guide_completion'
    | 'progressive_hint'
    | 'socratic_dialogue';
  promptAddition: string;
  targetMisconception?: string;
  hintLevel?: number;
}

export interface KnowledgeState {
  strengths: string[];
  struggles: string[];
}

// ============================================
// MODULE HOOK TYPES
// ============================================

/**
 * Parameters passed to a module's preProcessAnalysis hook.
 */
export interface PreProcessParams {
  studentMessage: string;
  conversationHistory: Message[];
  metadata?: Record<string, any>;
}

/**
 * Result from a module's preProcessAnalysis hook.
 */
export interface PreProcessResult {
  /** Additional context to inject into the analysis prompt */
  additionalContext?: string;
  /** If provided, used as cache key for the analysis result */
  cacheKey?: string;
}

// ============================================
// COUNSELOR-SPECIFIC TYPES
// ============================================

export interface CounselorAnalysisResult {
  intent: 'question' | 'concern' | 'update' | 'exploration' | 'reflection' | 'greeting';
  urgency: 'high' | 'medium' | 'low';
  relevantContextAreas: string[];  // Which clientContext fields are relevant
  suggestedFocus: string;          // Single most important area to address
  sentimentTone: 'positive' | 'neutral' | 'anxious' | 'frustrated';
  actionability: number;           // 0-100: how actionable is the student's situation
  counselingStage?: string;        // Derived by deriveCounselingStage (V2)
}

/**
 * Union type for analysis results from any module.
 * The engine uses this for the generic pipeline.
 */
export type ModuleAnalysisResult = AnalysisResult | EssayAnalysisResult | CounselorAnalysisResult;
