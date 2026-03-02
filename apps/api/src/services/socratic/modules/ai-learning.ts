/**
 * AI Learning Tutor Module
 *
 * Handles: AI_LEARNING
 *
 * Teaches AI/ML fundamentals to K-12 learners through Socratic discovery.
 * Uses SLM routing when configured, with LLM fallback for analysis.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, AnalysisResult } from '../types';
import {
  AI_LEARNING_SYSTEM_PROMPT,
  AI_LEARNING_HINT_LEVEL_PROMPTS,
  getAILearningLanguageContext,
  AI_LEARNING_ATTEMPT_PROMPTS,
  AI_LEARNING_QUESTIONS,
  AI_LEARNING_CONCEPTS,
  AI_LEARNING_TOPIC_PRIMERS,
} from '../prompts/ai-learning-system';
import { AI_LEARNING_ANALYSIS_PROMPT } from '../prompts/ai-learning-analysis';

// ============================================
// ATTEMPT DETECTION
// ============================================

const ATTEMPT_INDICATORS: Record<string, string[]> = {
  EN: [
    'i think', 'i believe', 'my guess', 'i know that', 'for example',
    'like when', 'it means', 'it could be', 'maybe because', 'i heard',
    'i read', 'my understanding', 'so basically', 'is it like',
    'classification', 'regression', 'features', 'labels', 'data',
    'training', 'neural', 'bias', 'supervised', 'unsupervised',
    'machine learning', 'artificial intelligence', 'model', 'predict',
    'algorithm', 'pattern', 'cluster',
  ],
  HI: [
    'मुझे लगता', 'मेरा अनुमान', 'मैंने सुना', 'मुझे पता है',
    'उदाहरण', 'जैसे कि', 'इसका मतलब', 'शायद', 'मेरी समझ',
  ],
  KN: [
    'ನನಗೆ ಅನಿಸುತ್ತದೆ', 'ನನ್ನ ಊಹೆ', 'ನಾನು ಕೇಳಿದೆ',
    'ಉದಾಹರಣೆ', 'ಹಾಗೆ', 'ಅರ್ಥ', 'ಬಹುಶಃ',
  ],
};

function containsAttempt(message: string, language?: Language): boolean {
  const lowerMessage = message.toLowerCase();

  if (message.split(/\s+/).length >= 15) return true;

  const langKeys = language ? [language, 'EN'] : Object.keys(ATTEMPT_INDICATORS);
  for (const lang of langKeys) {
    const indicators = ATTEMPT_INDICATORS[lang];
    if (!indicators) continue;
    for (const indicator of indicators) {
      if (lowerMessage.includes(indicator.toLowerCase())) return true;
    }
  }

  return false;
}

// ============================================
// LEAK DETECTION
// ============================================

const AI_LEAK_PATTERNS: RegExp[] = [
  /the (?:answer|definition) is/i,
  /(?:classification|regression) (?:is |means )/i,
  /a neural network is/i,
  /(?:supervised|unsupervised) learning (?:is |means )/i,
  /(?:features|labels) are/i,
  /(?:bias|fairness) (?:is |means )/i,
  /(?:let me explain|let me define|let me tell you)/i,
  /here'?s (?:the |a )?(?:definition|explanation)/i,
];

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  for (const pattern of AI_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "That's a great concept to explore! Can you think of an everyday example that relates to this idea?",
      };
    }
  }
  return { isClean: true };
}

// ============================================
// FALLBACK RESPONSES
// ============================================

const FALLBACKS: Record<string, Record<string, string>> = {
  EN: {
    socratic: "Interesting thinking! Can you give me a real-world example of that idea?",
    celebration: "You've got a great grasp of this! Can you explain it to me as if I were 10 years old?",
    foundational: "Let's start simpler. If you had to sort your toys into groups, what groups would you make?",
    default: "Tell me more — what do you think AI or machine learning is all about?",
  },
  HI: {
    socratic: "दिलचस्प सोच! क्या आप एक real-world example दे सकते हैं?",
    celebration: "बहुत बढ़िया समझ! क्या मुझे ऐसे समझा सकते हैं जैसे मैं 10 साल का हूं?",
    foundational: "चलो आसान से शुरू करते हैं। अगर अपने toys को groups में sort करना हो, तो कैसे करोगे?",
    default: "और बताओ — तुम्हें क्या लगता है AI या machine learning क्या है?",
  },
  KN: {
    socratic: "ಆಸಕ್ತಿದಾಯಕ ಯೋಚನೆ! ಒಂದು real-world example ಕೊಡಬಹುದೇ?",
    celebration: "ಅತ್ಯುತ್ತಮ ತಿಳುವಳಿಕೆ! ನನಗೆ 10 ವರ್ಷದವನಿಗೆ ಹೇಳುವಂತೆ ವಿವರಿಸಬಹುದೇ?",
    foundational: "ಸರಳವಾಗಿ ಶುರು ಮಾಡೋಣ. ನಿಮ್ಮ toys ಅನ್ನು groups ಗೆ sort ಮಾಡಿ ಎಂದರೆ ಹೇಗೆ ಮಾಡುತ್ತೀರಿ?",
    default: "ಇನ್ನೂ ಹೇಳಿ — AI ಅಥವಾ machine learning ಎಂದರೇನು ಎಂದು ನಿಮಗೆ ಅನಿಸುತ್ತದೆ?",
  },
};

// ============================================
// STRATEGY MAPPING
// ============================================

function mapAnalysisToStrategy(
  analysis: any,
  currentHintLevel: number,
): { questionType: QuestionType; newHintLevel: number } {
  const a = analysis as AnalysisResult;
  const { distanceFromSolution } = a;

  let questionType: QuestionType;
  let newHintLevel = currentHintLevel;

  if (distanceFromSolution < 15) {
    questionType = 'celebration';
  } else if (distanceFromSolution < 40) {
    questionType = 'socratic';
  } else if (distanceFromSolution < 70) {
    questionType = 'hint_with_question';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  } else {
    questionType = 'foundational';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  }

  return { questionType, newHintLevel };
}

// ============================================
// RESPONSE PROMPT BUILDER
// ============================================

function buildResponseUserPrompt(params: {
  questionType: QuestionType;
  analysis: any;
  language: Language;
  historyText: string;
}): string {
  const { questionType, analysis, language, historyText } = params;
  const a = analysis as AnalysisResult;

  const languageInstruction: Record<string, string> = {
    EN: 'Respond in English.',
    HI: 'हिंदी में जवाब दें। Technical terms English में रख सकते हैं।',
    KN: 'ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. Technical terms English ನಲ್ಲಿ ಇರಬಹುದು.',
    FR: 'Répondez en français.',
    DE: 'Antworten Sie auf Deutsch.',
    ES: 'Responde en español.',
    ZH: '用中文回答。技术术语可以保持英文。',
  };

  const typeInstructions: Record<string, string> = {
    attempt_prompt: 'Ask the student to share what they already know or guess about this AI/ML concept.',
    clarifying: 'Ask a clarifying question about their understanding or example.',
    socratic: `Ask ONE Socratic question using a concrete analogy to guide them toward: "${a.conceptGaps?.[0] || 'the concept'}". Do NOT define the concept.`,
    hint_with_question: `Give a small hint using an everyday analogy about "${a.suggestedFocus}", then ask a guiding question.`,
    foundational: `The student seems unfamiliar. Start with a very concrete, relatable example and ask: "${a.conceptGaps?.[0] || 'what do you already know?'}".`,
    celebration: 'Celebrate their understanding! Ask them to explain the concept in their own words or give a new example.',
    encouragement: 'Acknowledge their effort and curiosity. Simplify with a more concrete analogy.',
  };

  return `
CONVERSATION HISTORY:
${historyText}

ANALYSIS:
- Error type: ${a.errorType}
- Error: ${a.errorDescription || 'none'}
- Concept gaps: ${a.conceptGaps?.join(', ') || 'none'}

TASK: ${typeInstructions[questionType] || typeInstructions.socratic}

${languageInstruction[language] || languageInstruction.EN}

CRITICAL RULES:
1. ONE question only
2. Maximum 3-4 sentences
3. Use everyday analogies (sorting toys, predicting weather, recognizing faces)
4. NEVER give formal definitions
5. Be warm and encouraging

Generate the response:
  `.trim();
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
}): string {
  return `
SUBJECT: ${params.subject} (AI/ML Learning)
LANGUAGE: ${params.language}

ORIGINAL TOPIC/QUESTION:
${params.problem || 'Not explicitly stated'}

CONVERSATION HISTORY:
${params.historyText}

LATEST STUDENT MESSAGE:
${params.studentMessage}

Analyze this and respond with JSON only.
  `.trim();
}

// ============================================
// MODULE DEFINITION
// ============================================

export const aiLearningModule: TutorModule = {
  id: 'ai-learning',
  subjects: ['AI_LEARNING'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  modelPolicy: {
    response: { provider: process.env.AI_LEARNING_RESPONSE_PROVIDER || '', model: process.env.AI_LEARNING_RESPONSE_MODEL || '' },
    analysis: { provider: process.env.AI_LEARNING_ANALYSIS_PROVIDER || '', model: process.env.AI_LEARNING_ANALYSIS_MODEL || '' },
  },

  systemPrompt: AI_LEARNING_SYSTEM_PROMPT,
  analysisPrompt: AI_LEARNING_ANALYSIS_PROMPT,
  hintLevelPrompts: AI_LEARNING_HINT_LEVEL_PROMPTS,
  attemptPrompts: AI_LEARNING_ATTEMPT_PROMPTS,

  containsAttempt,
  leakPatterns: AI_LEAK_PATTERNS,
  validateResponse,
  getFallbackResponse: (questionType: string, language?: string) => {
    const lang = language || 'EN';
    const langFallbacks = FALLBACKS[lang] || FALLBACKS.EN;
    return langFallbacks[questionType] || langFallbacks.default;
  },
  getLanguageContext: getAILearningLanguageContext,

  maxResponseTokens: 350,

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as AnalysisResult;
    const topic = metadata?.topic as string | undefined;
    const hintLevel = metadata?.hintLevel || 0;

    let questionBankSection = '';
    if (topic && AI_LEARNING_QUESTIONS[topic]) {
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${AI_LEARNING_QUESTIONS[topic].map(q => `- ${q}`).join('\n')}`;
    } else {
      const allQs = Object.values(AI_LEARNING_QUESTIONS).flat();
      const sample = allQs.sort(() => 0.5 - Math.random()).slice(0, 4);
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${sample.map(q => `- ${q}`).join('\n')}`;
    }

    const primerLines = topic ? (AI_LEARNING_TOPIC_PRIMERS[topic] || []) : [];
    const primerSection = primerLines.length
      ? `\nTOPIC PRIMER (short):\n${primerLines.map(p => `- ${p}`).join('\n')}`
      : '';

    let conceptHintSection = '';
    const conceptBank = topic ? AI_LEARNING_CONCEPTS[topic] : undefined;
    if (conceptBank && hintLevel > 0) {
      const hintIdx = Math.min(hintLevel, 5) - 1;
      const lines = conceptBank.map(c => `- ${c.concept}: ${c.hints[Math.min(hintIdx, c.hints.length - 1)]}`);
      conceptHintSection = `\nRELEVANT CONCEPTS (hint level ${hintLevel}/5):\n${lines.join('\n')}`;
    }

    return `
CURRENT CONTEXT:
- Subject: AI / Machine Learning Fundamentals (K-12)
- Student's Understanding Level: ${100 - a.distanceFromSolution}%
- Concepts Student Understands: ${a.conceptsIdentified?.join(', ') || 'unclear'}
- Concepts Student Needs: ${a.conceptGaps?.join(', ') || 'none identified'}
- Student's Strengths: ${a.studentStrengths?.join(', ') || 'showing curiosity'}
${questionBankSection}${primerSection}${conceptHintSection}

RESPONSE TYPE GUIDE:
- celebration: Acknowledge understanding, ask them to explain in own words or give new example
- socratic: Ask a probing question using a concrete analogy
- hint_with_question: Give a small analogy-based hint, then ask a question
- foundational: Start with a very simple, tangible example
- encouragement: Validate curiosity, simplify further`;
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
