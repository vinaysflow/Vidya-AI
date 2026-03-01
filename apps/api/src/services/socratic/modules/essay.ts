/**
 * Essay Tutor Module
 * 
 * Handles: ESSAY_WRITING
 * 
 * Provides English-only support, essay draft detection, essay leak detection
 * (regex + prose heuristics), the essay hint ladder, NLP pre-processing hook,
 * and category-specific coaching focus.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, EssayAnalysisResult } from '../types';
import {
  ESSAY_SYSTEM_PROMPT,
  ESSAY_HINT_LEVEL_PROMPTS,
  getEssayLanguageContext,
  ESSAY_ATTEMPT_PROMPTS
} from '../prompts/essay-system';
import { ESSAY_ANALYSIS_PROMPT } from '../prompts/essay-analysis';
import { computeEssayMetrics } from '../../nlp';
import { contentHash } from '../../cache';

// ============================================
// ATTEMPT DETECTION
// ============================================

/**
 * Detects if a message contains essay draft content.
 * Returns true if the message looks like it contains substantive essay content:
 * (a) 50+ words of continuous text, OR
 * (b) essay-related keywords indicating draft sharing.
 */
function containsEssayDraft(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Word count check — 50+ words suggests draft content
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount >= 50) return true;

  // Essay-specific keywords/phrases indicating they are sharing a draft or idea
  const essayDraftIndicators = [
    'my essay',
    'my draft',
    'my personal statement',
    'my statement',
    'personal statement',
    'here is my',
    'here\'s my',
    'this is my',
    'my opening',
    'my hook',
    'my conclusion',
    'my supplement',
    'my supplemental',
    'i wrote',
    'i\'ve written',
    'i started writing',
    'my first draft',
    'rough draft',
    'my paragraph',
    'word limit',
    'here is what i have',
    'here\'s what i have',
    'what i have so far',
    'my story is about',
    'my essay is about',
    'i want to write about'
  ];

  for (const indicator of essayDraftIndicators) {
    if (lowerMessage.includes(indicator)) return true;
  }

  return false;
}

// ============================================
// LEAK DETECTION
// ============================================

const ESSAY_LEAK_PATTERNS: RegExp[] = [
  // Explicit rewrite offers
  /here'?s a revised/i,
  /here'?s a rewritten/i,
  /here'?s an? (?:updated|improved|better|new) (?:version|draft|paragraph|opening|sentence)/i,
  /you could write:/i,
  /you could say:/i,
  /you might write:/i,
  /you might say:/i,
  /try (?:writing|saying) (?:something like|this):/i,
  /consider (?:writing|saying|phrasing it as):/i,
  /for example,? you could (?:write|say|open with|start with):/i,
  /here'?s (?:a |an? )?(?:example|sample|suggestion):/i,
  /your opening could be/i,
  /your (?:essay|paragraph|sentence|opening|conclusion) (?:could|might|should) (?:read|say|be|start)/i,

  // Stricter patterns
  /I'?d suggest you write/i,
  /here'?s how you could phrase/i,
  /here'?s how (?:you|that) (?:could|might) (?:sound|read|look)/i,
  /(?:let me|allow me to) (?:rewrite|rephrase|revise|reword)/i,
  /(?:let me|allow me to) (?:suggest|draft|write) (?:a |an? )?(?:sentence|paragraph|opening|hook|conclusion)/i,
  /a (?:stronger|better|revised) version (?:would|could|might) be/i,
];

/**
 * Check if a response contains a long prose block that looks like essay copy.
 * Heuristic: any single "paragraph" (text between blank lines) with 80+ words.
 */
function containsLongProseBlock(text: string): boolean {
  const paragraphs = text.split(/\n\s*\n/);
  for (const para of paragraphs) {
    const wordCount = para.trim().split(/\s+/).length;
    if (wordCount >= 80) return true;
  }
  return false;
}

/**
 * Count sentences in text (rough heuristic).
 */
function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 0);
  return sentences.length;
}

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  const defaultFallback = "What's one specific detail from that moment that stands out to you?";

  // Check regex patterns
  for (const pattern of ESSAY_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      console.warn(`Essay leak pattern matched: ${pattern.source}`);
      return { isClean: false, fallbackMessage: defaultFallback };
    }
  }

  // Check for long prose blocks
  if (containsLongProseBlock(response)) {
    console.warn('Essay leak: long prose block detected (80+ words in paragraph)');
    return { isClean: false, fallbackMessage: defaultFallback };
  }

  // Check for many consecutive non-question sentences
  const sentenceCount = countSentences(response);
  const hasQuestion = response.includes('?');
  if (sentenceCount >= 5 && !hasQuestion) {
    console.warn('Essay leak: 5+ sentences with no question — likely essay prose');
    return { isClean: false, fallbackMessage: defaultFallback };
  }

  return { isClean: true };
}

// ============================================
// FALLBACK RESPONSES
// ============================================

const ESSAY_FALLBACKS: Record<string, string> = {
  socratic: "That's a great start! What's one specific moment from this experience that really stands out to you?",
  celebration: "This is coming together nicely! What do you want the reader to feel when they finish reading?",
  foundational: "Let's find the heart of your essay. What's the one moment or experience you keep coming back to?",
  hint_with_question: "I notice your essay could be more specific in places. Can you describe one scene in vivid detail — what did you see, hear, or feel?",
  encouragement: "You're making progress — every draft gets you closer. What's one small thing you could add to make this feel more like you?",
  attempt_prompt: ESSAY_ATTEMPT_PROMPTS.EN,
  default: "Tell me more about what this experience meant to you. What changed for you?"
};

// ============================================
// CATEGORY COACHING
// ============================================

const CATEGORY_COACHING: Record<string, string> = {
  WHY_US: 'CATEGORY COACHING: This is a "Why This School" essay. Push for SPECIFICITY — ask about specific programs, professors, research labs, campus traditions, or courses. Generic answers that could apply to any school are a red flag.',
  IDENTITY: 'CATEGORY COACHING: This is an identity/background essay. Focus on VOICE and AUTHENTICITY — ask the student to show (not tell) who they are through specific moments and details. Avoid cliche openings.',
  CHALLENGE: 'CATEGORY COACHING: This is a challenge/obstacle essay. Focus on GROWTH and REFLECTION — the obstacle itself matters less than what they learned and how they changed. Push for the "so what?"',
  INTELLECTUAL: 'CATEGORY COACHING: This is an intellectual curiosity essay. Focus on DEPTH and SPECIFICITY — ask them to go beyond "I love this subject" to show how they think, what questions excite them, what they\'ve explored independently.',
  COMMUNITY: 'CATEGORY COACHING: This is a community/service essay. Focus on IMPACT and RECIPROCITY — push them to show what they contributed AND what they learned, not just a list of activities.',
  GROWTH: 'CATEGORY COACHING: This is a personal growth essay. Focus on the TURNING POINT and the BEFORE/AFTER — help them show how they changed, not just describe an event.',
  CREATIVE: 'CATEGORY COACHING: This is a creative/unconventional essay. Encourage RISK-TAKING and ORIGINALITY — this is where personality can shine. Push for unexpected angles and genuine voice.',
  EXTRACURRICULAR: 'CATEGORY COACHING: This is an extracurricular/talent essay. Focus on DEDICATION and MEANING — ask why this activity matters to them personally, not just what they accomplished.',
  DIVERSITY: 'CATEGORY COACHING: This is a diversity/perspective essay. Focus on SPECIFICITY and NUANCE — push for concrete experiences rather than abstract statements about diversity.',
  SHORT_ANSWER: 'CATEGORY COACHING: This is a short-answer response. BREVITY is key — every word must count. Push for precision and impact in very few words.',
};

// ============================================
// PRE-PROCESS HOOK (NLP metrics)
// ============================================

function preProcessAnalysis(params: {
  studentMessage: string;
  conversationHistory: any[];
  metadata?: Record<string, any>;
}): { additionalContext?: string; cacheKey?: string } {
  const { studentMessage, metadata } = params;
  const wordLimit = metadata?.wordLimit;

  // Pre-compute NLP metrics (zero LLM cost) so Claude does less work
  const metrics = computeEssayMetrics(studentMessage, wordLimit);

  const wordLimitLine = wordLimit
    ? `- Word count: ${metrics.wordCount}/${wordLimit} (${metrics.wordLimitStatus || 'unknown'})${metrics.wordsRemaining !== undefined ? `, ${metrics.wordsRemaining} words remaining` : ''}`
    : `- Word count: ${metrics.wordCount}`;

  const additionalContext = `
PRE-COMPUTED METRICS (verified, do not re-analyze):
${wordLimitLine}
- Paragraphs: ${metrics.paragraphCount}
- Avg sentence length: ${metrics.avgSentenceLength} words
- Readability: Grade ${metrics.readabilityGrade} (Flesch score: ${metrics.readabilityScore})
- Passive voice: ${metrics.passiveVoicePercent}%
- Cliches detected: ${metrics.clichesFound.length > 0 ? metrics.clichesFound.join(', ') : 'none'}
- Specific names/places: ${metrics.hasSpecificNames ? 'yes' : 'no'}
- Sensory language instances: ${metrics.sensoryLanguageCount}
- Vocabulary diversity: ${Math.round(metrics.uniqueWordRatio * 100)}%

Focus your analysis on voice, reflection depth, prompt alignment, and structure.
Do NOT re-state metrics already provided above.`;

  return {
    additionalContext,
    cacheKey: `analysis:${contentHash(studentMessage)}`,
  };
}

// ============================================
// ANALYSIS PROMPT BUILDER
// ============================================

function buildAnalysisUserPrompt(params: {
  problem: string;
  studentMessage: string;
  historyText: string;
  subject: string;
  language: string;
  metadata?: Record<string, any>;
}): string {
  const { problem, studentMessage, historyText, metadata } = params;
  const essayPromptText = metadata?.essayPromptText || problem || 'Not explicitly stated';
  const schoolName = metadata?.schoolName;
  const essayType = metadata?.essayType;
  const essayCategory = metadata?.essayCategory;
  const wordLimit = metadata?.wordLimit;

  const metadataLines = [
    schoolName ? `School: ${schoolName}` : '',
    essayType ? `Type: ${essayType}` : '',
    essayCategory ? `Category: ${essayCategory}` : '',
    wordLimit ? `Word Limit: ${wordLimit}` : '',
  ].filter(Boolean).join('\n');

  // additionalContext is injected by the engine via the preProcessAnalysis hook
  return `
ESSAY PROMPT / CONTEXT:
Prompt: "${essayPromptText}"
${metadataLines}

CONVERSATION HISTORY:
${historyText}

LATEST STUDENT MESSAGE:
${studentMessage}

Analyze this and respond with JSON only.
  `.trim();
}

// ============================================
// RESPONSE PROMPT BUILDER
// ============================================

function buildResponseUserPrompt(params: {
  questionType: QuestionType;
  analysis: any;
  language: Language;
  historyText: string;
  metadata?: Record<string, any>;
}): string {
  const { questionType, analysis, historyText } = params;
  const a = analysis as EssayAnalysisResult;

  const essayTypeInstructions: Record<string, string> = {
    attempt_prompt: 'Ask the student to share their essay prompt and a draft or idea.',
    clarifying: 'Ask a clarifying question about their story or perspective.',
    socratic: `Ask ONE question that guides them toward: "${a.suggestedFocus}". Do NOT write any part of their essay.`,
    hint_with_question: `Point to the area "${a.suggestedFocus}" and ask a guiding question. Do NOT rewrite or supply sentences.`,
    foundational: `The student seems early in their process. Ask about the core moment or experience: "${a.gaps?.[0] || 'what matters most to you'}". Be encouraging.`,
    celebration: 'Celebrate what works in their draft! Then ask them to explain what they want the reader to take away.',
    encouragement: 'Validate their effort. Then ask a simpler question about one specific moment in their essay.'
  };

  return `
CONVERSATION HISTORY:
${historyText}

TASK: ${essayTypeInstructions[questionType] || essayTypeInstructions.socratic}

CRITICAL RULES:
1. ONE question only (do not overwhelm)
2. Maximum 2-3 sentences
3. NEVER write any part of their essay — no paragraphs, no sample sentences, no "You could write:"
4. Be warm and encouraging
5. Use essay-coaching language (voice, story, moment, detail, reflection) — no STEM language

Generate the response:
  `.trim();
}

// ============================================
// STRATEGY MAPPING
// ============================================

function mapAnalysisToStrategy(
  analysis: any,
  currentHintLevel: number
): { questionType: QuestionType; newHintLevel: number } {
  const a = analysis as EssayAnalysisResult;
  const { readiness } = a;

  let questionType: QuestionType;
  let newHintLevel = currentHintLevel;

  if (readiness >= 80) {
    questionType = 'celebration';
  } else if (readiness >= 50) {
    questionType = 'socratic';
  } else if (readiness >= 25) {
    questionType = 'hint_with_question';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  } else {
    questionType = 'foundational';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  }

  return { questionType, newHintLevel };
}

// ============================================
// MODULE DEFINITION
// ============================================

export const essayModule: TutorModule = {
  id: 'essay',
  subjects: ['ESSAY_WRITING'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  systemPrompt: ESSAY_SYSTEM_PROMPT,
  analysisPrompt: ESSAY_ANALYSIS_PROMPT,
  hintLevelPrompts: ESSAY_HINT_LEVEL_PROMPTS,
  attemptPrompts: ESSAY_ATTEMPT_PROMPTS,

  containsAttempt: containsEssayDraft,
  leakPatterns: ESSAY_LEAK_PATTERNS,
  validateResponse,
  getFallbackResponse: (questionType: string) => {
    return ESSAY_FALLBACKS[questionType] || ESSAY_FALLBACKS.default;
  },
  getLanguageContext: (language) => getEssayLanguageContext(language),

  preProcessAnalysis,
  maxResponseTokens: 300, // Shorter to reduce leak risk

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as EssayAnalysisResult;
    const schoolName = metadata?.schoolName;
    const essayCategory = metadata?.essayCategory;
    const wordLimit = metadata?.wordLimit;
    const hintLevel = metadata?.hintLevel || 0;

    const hintText = hintLevel > 0
      ? `\nHINT LEVEL: ${hintLevel}/5\n${ESSAY_HINT_LEVEL_PROMPTS[hintLevel] || ESSAY_HINT_LEVEL_PROMPTS[1]}`
      : '';

    const categoryCoaching = essayCategory ? (CATEGORY_COACHING[essayCategory] || '') : '';

    return `
CURRENT CONTEXT:
- Mode: Essay Coaching
${schoolName ? `- School: ${schoolName}` : ''}
${essayCategory ? `- Essay Category: ${essayCategory}` : ''}
${wordLimit ? `- Word Limit: ${wordLimit}` : ''}
- Student's Essay Readiness: ${a.readiness}%
- Strengths: ${a.strengths?.join(', ') || 'not yet assessed'}
- Areas to Improve: ${a.gaps?.join(', ') || 'not yet assessed'}
- Suggested Focus: ${a.suggestedFocus}
- Voice Assessment: ${a.voice || 'not yet assessed'}
- Show-Don't-Tell: ${a.showDontTell || 'not yet assessed'}
- Structure: ${a.structure || 'not yet assessed'}
${hintText}
${categoryCoaching}

RESPONSE TYPE GUIDE:
- celebration: Acknowledge what works well, then ask them to reflect on what they want the reader to feel
- socratic: Ask ONE probing question about their story, voice, or reflection
- hint_with_question: Point to one specific area, then ask a guiding question
- foundational: Ask about the core of their story — what moment or experience matters most
- encouragement: Validate their effort, then ask an easier question about their essay`;
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
