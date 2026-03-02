/**
 * Coding / Programming Tutor Module
 *
 * Handles: CODING
 *
 * Provides multilingual support, code/pseudocode attempt detection,
 * solution leak detection, and the coding hint ladder.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, AnalysisResult } from '../types';
import {
  CODING_SYSTEM_PROMPT,
  CODING_HINT_LEVEL_PROMPTS,
  getCodingLanguageContext,
  CODING_ATTEMPT_PROMPTS,
  CODING_QUESTIONS,
  CODING_CONCEPTS,
  CODING_TOPIC_PRIMERS,
} from '../prompts/coding-system';
import { CODING_ANALYSIS_PROMPT } from '../prompts/coding-analysis';
import { computeCodingMetrics } from '../../nlp';
import { contentHash } from '../../cache';

// ============================================
// ATTEMPT DETECTION
// ============================================

const ATTEMPT_INDICATORS: Record<string, string[]> = {
  EN: [
    'i tried', 'i think', 'my approach', 'i used', 'i wrote',
    'my code', 'my solution', 'my algorithm', 'here is my',
    'pseudocode', 'brute force', 'time complexity', 'space complexity',
    'i would use', 'data structure', 'hash map', 'array', 'linked list',
    'binary search', 'dynamic programming', 'recursion', 'recursive',
    'iterate', 'loop through', 'traverse', 'sort', 'two pointer',
    'sliding window', 'stack', 'queue', 'tree', 'graph', 'bfs', 'dfs',
    'step 1', 'step 2', 'first i', 'then i',
  ],
  HI: [
    'मैंने कोशिश', 'मुझे लगता', 'मेरा तरीका', 'मैंने इस्तेमाल',
    'मेरा code', 'मेरा solution', 'मैंने लिखा', 'क्योंकि', 'इसलिए',
    'पहले', 'फिर', 'मैंने सोचा',
  ],
  KN: [
    'ನಾನು ಪ್ರಯತ್ನಿಸಿದೆ', 'ನನಗೆ ಅನಿಸುತ್ತದೆ', 'ನನ್ನ ವಿಧಾನ',
    'ನಾನು ಬಳಸಿದೆ', 'ನನ್ನ code', 'ಏಕೆಂದರೆ', 'ಆದ್ದರಿಂದ',
    'ಮೊದಲು', 'ನಂತರ',
  ],
  FR: [
    "j'ai essayé", 'je pense', 'mon approche', "j'ai utilisé",
    "j'ai écrit", 'mon code', 'ma solution', 'mon algorithme',
    'parce que', 'donc', "d'abord", 'ensuite', 'étape',
    'complexité', 'structure de données', 'récursion', 'boucle',
    'tableau', 'pile', 'file', 'tri', 'parcourir',
  ],
  DE: [
    'ich habe versucht', 'ich denke', 'mein ansatz', 'ich habe benutzt',
    'ich habe geschrieben', 'mein code', 'meine lösung', 'mein algorithmus',
    'weil', 'deshalb', 'zuerst', 'dann', 'schritt',
    'komplexität', 'datenstruktur', 'rekursion', 'schleife',
    'array', 'stapel', 'warteschlange', 'sortieren', 'durchlaufen',
  ],
  ES: [
    'intenté', 'creo que', 'mi enfoque', 'usé', 'escribí',
    'mi código', 'mi solución', 'mi algoritmo',
    'porque', 'por lo tanto', 'primero', 'luego', 'paso',
    'complejidad', 'estructura de datos', 'recursión', 'bucle',
    'arreglo', 'pila', 'cola', 'ordenar', 'recorrer',
  ],
  ZH: [
    '我试了', '我觉得', '我认为', '我的方法', '我用了',
    '我写了', '我的代码', '我的解决方案', '我的算法',
    '因为', '所以', '首先', '然后', '步骤',
    '复杂度', '数据结构', '递归', '循环',
    '数组', '栈', '队列', '排序', '遍历',
  ],
};

function containsAttempt(message: string, language?: Language): boolean {
  const lowerMessage = message.toLowerCase();

  if (/\w+\s*=\s*.+/.test(message) && /[;{}()\[\]]/.test(message)) return true;
  if (/def\s+\w+|function\s+\w+|class\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+/.test(message)) return true;
  if (/for\s*\(|while\s*\(|if\s*\(|for\s+\w+\s+in/.test(message)) return true;
  if (/=>|->|return\s/.test(message)) return true;

  const langKeys = language ? [language, 'EN'] : Object.keys(ATTEMPT_INDICATORS);
  for (const lang of langKeys) {
    const indicators = ATTEMPT_INDICATORS[lang];
    if (!indicators) continue;
    for (const indicator of indicators) {
      if (message.includes(indicator) || lowerMessage.includes(indicator.toLowerCase())) return true;
    }
  }

  const lines = message.split('\n');
  const indentedLines = lines.filter(l => /^\s{2,}/.test(l));
  if (indentedLines.length >= 3) return true;

  if (message.length < 20) return false;
  return false;
}

// ============================================
// LEAK DETECTION
// ============================================

const CODE_LEAK_PATTERNS: RegExp[] = [
  /here'?s the (?:solution|code|answer|implementation)/i,
  /the (?:solution|answer) is/i,
  /def\s+\w+\([^)]*\):\s*\n(?:\s+.+\n){3,}/,
  /function\s+\w+\([^)]*\)\s*\{[\s\S]{100,}\}/,
  /```(?:python|java|cpp|javascript|typescript)?\n[\s\S]{150,}```/,
  /(?:let me|allow me to) (?:write|code|implement|solve) (?:this|it|the)/i,
  /here'?s (?:a |the )?(?:complete|full|working) (?:solution|implementation|code)/i,
];

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  for (const pattern of CODE_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "Let's think about this step by step. What's your approach, and what data structure would work well here?"
      };
    }
  }

  // Check for long code blocks (>5 lines of code-like content)
  const codeLinePattern = /^[\s]*(?:def |function |class |for |while |if |return |const |let |var |import |from |print|console\.)/;
  const lines = response.split('\n');
  let consecutiveCodeLines = 0;
  for (const line of lines) {
    if (codeLinePattern.test(line)) {
      consecutiveCodeLines++;
      if (consecutiveCodeLines >= 5) {
        return {
          isClean: false,
          fallbackMessage: "Rather than giving you the code, can you tell me what approach you're thinking of? I'll help you work through it."
        };
      }
    } else {
      consecutiveCodeLines = 0;
    }
  }

  return { isClean: true };
}

// ============================================
// FALLBACK RESPONSES
// ============================================

const FALLBACKS: Record<string, Record<string, string>> = {
  EN: {
    socratic: "That's an interesting approach! Can you trace through your logic with a small example?",
    celebration: "Great work! Can you explain why this approach gives the correct result?",
    foundational: "Let's take a step back. What data structure or algorithm pattern might fit this problem?",
    default: "Tell me more about how you're thinking about this problem.",
  },
  HI: {
    socratic: "दिलचस्प approach है! क्या आप एक छोटे example के साथ trace कर सकते हैं?",
    celebration: "बहुत बढ़िया! क्या बता सकते हैं कि यह approach सही result क्यों देता है?",
    foundational: "चलो थोड़ा पीछे जाते हैं। कौन सा data structure या algorithm pattern fit करेगा?",
    default: "मुझे और बताइए कि आप इस problem के बारे में कैसे सोच रहे हैं।",
  },
  KN: {
    socratic: "ಆಸಕ್ತಿದಾಯಕ approach! ಒಂದು ಸಣ್ಣ example ನೊಂದಿಗೆ trace ಮಾಡಬಹುದೇ?",
    celebration: "ಅತ್ಯುತ್ತಮ! ಈ approach ಸರಿಯಾದ result ಏಕೆ ಕೊಡುತ್ತದೆ ಎಂದು ವಿವರಿಸಬಹುದೇ?",
    foundational: "ಸ್ವಲ್ಪ ಹಿಂದೆ ಹೋಗೋಣ. ಯಾವ data structure ಅಥವಾ algorithm pattern fit ಆಗಬಹುದು?",
    default: "ಈ problem ಬಗ್ಗೆ ನೀವು ಹೇಗೆ ಯೋಚಿಸುತ್ತಿದ್ದೀರಿ ಎಂದು ಇನ್ನೂ ಹೇಳಿ.",
  },
  FR: {
    socratic: "Approche intéressante ! Pouvez-vous la tester avec un petit exemple ?",
    celebration: "Excellent travail ! Pouvez-vous expliquer pourquoi cette approche donne le bon résultat ?",
    foundational: "Revenons en arrière. Quelle structure de données ou quel algorithme pourrait convenir ici ?",
    default: "Dites-moi en plus sur votre approche de ce problème.",
  },
  DE: {
    socratic: "Interessanter Ansatz! Können Sie ihn mit einem kleinen Beispiel durchgehen?",
    celebration: "Großartige Arbeit! Können Sie erklären, warum dieser Ansatz das richtige Ergebnis liefert?",
    foundational: "Gehen wir einen Schritt zurück. Welche Datenstruktur oder welches Algorithmus-Pattern könnte hier passen?",
    default: "Erzählen Sie mir mehr über Ihren Ansatz.",
  },
  ES: {
    socratic: "¡Enfoque interesante! ¿Puedes probarlo con un ejemplo pequeño?",
    celebration: "¡Gran trabajo! ¿Puedes explicar por qué este enfoque da el resultado correcto?",
    foundational: "Vamos un paso atrás. ¿Qué estructura de datos o patrón de algoritmo podría funcionar aquí?",
    default: "Cuéntame más sobre cómo estás abordando este problema.",
  },
  ZH: {
    socratic: "有趣的方法！能用一个小例子来验证一下吗？",
    celebration: "做得好！能解释一下为什么这个方法能得到正确结果吗？",
    foundational: "我们退一步想想。什么数据结构或算法模式可能适合这里？",
    default: "告诉我更多关于你是如何思考这个问题的。",
  },
};

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
  const a = analysis as AnalysisResult & { timeComplexity?: string; spaceComplexity?: string };

  const languageInstruction: Record<string, string> = {
    EN: 'Respond in English.',
    HI: 'हिंदी में जवाब दें। Technical terms English में रख सकते हैं।',
    KN: 'ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. Technical terms English ನಲ್ಲಿ ಇರಬಹುದು.',
    FR: 'Répondez en français. Les termes techniques peuvent rester en anglais.',
    DE: 'Antworten Sie auf Deutsch. Technische Begriffe können auf Englisch bleiben.',
    ES: 'Responde en español. Los términos técnicos pueden quedarse en inglés.',
    ZH: '用中文回答。技术术语可以保持英文。',
  };

  const typeInstructions: Record<string, string> = {
    attempt_prompt: 'Ask the student to share their approach or code.',
    clarifying: 'Ask a clarifying question about their code or approach.',
    socratic: `Ask ONE Socratic question that guides them toward understanding: "${a.conceptGaps?.[0] || 'the core concept'}". Do NOT give the solution.`,
    hint_with_question: `Give a small hint about "${a.suggestedFocus}", then ask a guiding question. Still NO direct solutions or complete code.`,
    foundational: `The student seems lost. Ask about a foundational concept they need: "${a.conceptGaps?.[0] || 'basics'}". Be encouraging.`,
    celebration: 'Celebrate their solution! Then ask them to explain WHY it works or to analyze its time/space complexity.',
    encouragement: 'The student is struggling. Acknowledge their effort, then simplify with an easier guiding question.',
  };

  return `
CONVERSATION HISTORY:
${historyText}

ANALYSIS:
- Error type: ${a.errorType}
- Error: ${a.errorDescription || 'none'}
${a.timeComplexity ? `- Time complexity: ${a.timeComplexity}` : ''}

TASK: ${typeInstructions[questionType] || typeInstructions.socratic}

${languageInstruction[language] || languageInstruction.EN}

CRITICAL RULES:
1. ONE question only (don't overwhelm)
2. Maximum 3-4 sentences
3. NEVER give the solution or write complete working code
4. Be warm and encouraging
5. Use the student's language style
6. Use backtick formatting for code terms

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
SUBJECT: ${params.subject} (Coding/Programming)
LANGUAGE: ${params.language}

ORIGINAL PROBLEM:
${params.problem || 'Not explicitly stated'}

CONVERSATION HISTORY:
${params.historyText}

LATEST STUDENT MESSAGE:
${params.studentMessage}

Analyze this and respond with JSON only.
  `.trim();
}

// ============================================
// STRATEGY MAPPING
// ============================================

const THRESHOLDS = { celebration: 10, socratic: 35, hint: 65 };

function mapAnalysisToStrategy(
  analysis: any,
  currentHintLevel: number
): { questionType: QuestionType; newHintLevel: number } {
  const a = analysis as AnalysisResult;
  const { distanceFromSolution } = a;

  let questionType: QuestionType;
  let newHintLevel = currentHintLevel;

  if (distanceFromSolution < THRESHOLDS.celebration) {
    questionType = 'celebration';
  } else if (distanceFromSolution < THRESHOLDS.socratic) {
    questionType = 'socratic';
  } else if (distanceFromSolution < THRESHOLDS.hint) {
    questionType = 'hint_with_question';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  } else {
    questionType = 'foundational';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  }

  return { questionType, newHintLevel };
}

// ============================================
// PRE-PROCESS HOOK (NLP metrics)
// ============================================

function preProcessAnalysis(params: {
  studentMessage: string;
  conversationHistory: any[];
  metadata?: Record<string, any>;
}): { additionalContext?: string; cacheKey?: string } {
  const { studentMessage } = params;
  const m = computeCodingMetrics(studentMessage);

  const features = [
    m.hasFunctionDef && 'function definition',
    m.hasLoop && 'loop construct',
    m.hasConditional && 'conditional',
    m.hasClass && 'class/struct',
    m.hasImports && 'import statements',
    m.hasComments && 'comments',
  ].filter(Boolean);

  const additionalContext = `
PRE-COMPUTED METRICS (verified, do not re-analyze):
- Detected language: ${m.detectedLanguage}
- Lines of code: ${m.lineCount}
- Format: ${m.isPseudocode ? 'pseudocode' : 'code'}
- Structures found: ${features.length > 0 ? features.join(', ') : 'none'}
- Distinct identifiers: ~${m.identifierCount}
- Max nesting depth: ${m.maxNestingDepth}

Focus analysis on logic, approach correctness, and conceptual understanding.
Do NOT re-state metrics already provided above.`;

  return {
    additionalContext,
    cacheKey: `analysis:coding:${contentHash(studentMessage)}`,
  };
}

// ============================================
// MODULE DEFINITION
// ============================================

export const codingModule: TutorModule = {
  id: 'coding',
  subjects: ['CODING'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  modelPolicy: {
    response: { provider: process.env.CODING_RESPONSE_PROVIDER || '', model: process.env.CODING_RESPONSE_MODEL || '' },
    analysis: { provider: process.env.CODING_ANALYSIS_PROVIDER || '', model: process.env.CODING_ANALYSIS_MODEL || '' },
  },

  systemPrompt: CODING_SYSTEM_PROMPT,
  analysisPrompt: CODING_ANALYSIS_PROMPT,
  hintLevelPrompts: CODING_HINT_LEVEL_PROMPTS,
  attemptPrompts: CODING_ATTEMPT_PROMPTS,

  containsAttempt,
  leakPatterns: CODE_LEAK_PATTERNS,
  validateResponse,
  getFallbackResponse: (questionType: string, language?: string) => {
    const lang = language || 'EN';
    const langFallbacks = FALLBACKS[lang] || FALLBACKS.EN;
    return langFallbacks[questionType] || langFallbacks.default;
  },
  getLanguageContext: getCodingLanguageContext,

  preProcessAnalysis,
  maxResponseTokens: 400,

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as AnalysisResult & { timeComplexity?: string; spaceComplexity?: string };

    const topic = metadata?.topic as string | undefined;
    const hintLevel = metadata?.hintLevel || 0;

    let questionBankSection = '';
    if (topic && CODING_QUESTIONS[topic]) {
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${CODING_QUESTIONS[topic].map(q => `- ${q}`).join('\n')}`;
    } else {
      const allQs = Object.values(CODING_QUESTIONS).flat();
      const sample = allQs.sort(() => 0.5 - Math.random()).slice(0, 4);
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${sample.map(q => `- ${q}`).join('\n')}`;
    }

    const primerLines = topic ? (CODING_TOPIC_PRIMERS[topic] || []) : [];
    const primerSection = primerLines.length
      ? `\nTOPIC PRIMER (short):\n${primerLines.map(p => `- ${p}`).join('\n')}`
      : '';

    let conceptHintSection = '';
    const conceptBank = topic ? CODING_CONCEPTS[topic] : undefined;
    if (conceptBank && hintLevel > 0) {
      const hintIdx = Math.min(hintLevel, 5) - 1;
      const lines = conceptBank.map(c => `- ${c.concept}: ${c.hints[Math.min(hintIdx, c.hints.length - 1)]}`);
      conceptHintSection = `\nRELEVANT CONCEPTS (hint level ${hintLevel}/5):\n${lines.join('\n')}`;
    }

    return `
CURRENT CONTEXT:
- Subject: Coding / Programming
- Student's Distance from Solution: ${a.distanceFromSolution}%
- Concepts Student is Using: ${a.conceptsIdentified?.join(', ') || 'unclear'}
- Concepts Student is Missing: ${a.conceptGaps?.join(', ') || 'none identified'}
- Student's Strengths: ${a.studentStrengths?.join(', ') || 'attempting the problem'}
${a.timeComplexity ? `- Current Time Complexity: ${a.timeComplexity}` : ''}
${a.spaceComplexity ? `- Current Space Complexity: ${a.spaceComplexity}` : ''}
${questionBankSection}${primerSection}${conceptHintSection}

RESPONSE TYPE GUIDE:
- celebration: Acknowledge success, then ask them to explain WHY or analyze complexity
- socratic: Ask a probing question about their approach or a missing concept
- hint_with_question: Give a small hint about a pattern or data structure, then ask a question
- foundational: Ask about basic concepts they may need to review
- encouragement: Validate their effort, simplify the path forward`;
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
