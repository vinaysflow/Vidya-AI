/**
 * Economics Tutor Module
 *
 * Handles: ECONOMICS
 *
 * Provides multilingual support, economic reasoning attempt detection,
 * answer leak detection, and the economics hint ladder.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, AnalysisResult } from '../types';
import {
  ECONOMICS_SYSTEM_PROMPT,
  ECONOMICS_HINT_LEVEL_PROMPTS,
  getEconomicsLanguageContext,
  ECONOMICS_ATTEMPT_PROMPTS,
  ECONOMICS_QUESTIONS,
  ECONOMICS_CONCEPTS,
} from '../prompts/economics-system';
import { ECONOMICS_ANALYSIS_PROMPT } from '../prompts/economics-analysis';
import { computeEconomicsMetrics } from '../../nlp';
import { contentHash } from '../../cache';

// ============================================
// ATTEMPT DETECTION
// ============================================

const ECON_ATTEMPT_INDICATORS: Record<string, string[]> = {
  EN: [
    'i think', 'i believe', 'my approach', 'because', 'since', 'therefore',
    'supply', 'demand', 'equilibrium', 'elasticity', 'gdp', 'inflation',
    'the price', 'the cost', 'the market', 'the economy',
    'increases', 'decreases', 'shifts', 'curve',
    'ceteris paribus', 'opportunity cost', 'trade-off', 'tradeoff',
    'marginal', 'aggregate', 'fiscal', 'monetary',
    'consumer', 'producer', 'surplus', 'deficit',
    'first', 'then', 'step', 'so', 'if', 'when',
    'the graph', 'the model', 'according to',
    'comparative advantage', 'externality', 'public good',
    'multiplier', 'phillips curve', 'ad-as',
  ],
  HI: [
    'मैंने सोचा', 'मुझे लगता', 'क्योंकि', 'इसलिए',
    'कीमत', 'बाज़ार', 'अर्थव्यवस्था', 'मांग', 'पूर्ति',
    'संतुलन', 'लागत', 'उपभोक्ता', 'उत्पादक', 'घाटा', 'अधिशेष',
  ],
  KN: [
    'ನನಗೆ ಅನಿಸುತ್ತದೆ', 'ಏಕೆಂದರೆ', 'ಆದ್ದರಿಂದ',
    'ಬೆಲೆ', 'ಮಾರುಕಟ್ಟೆ', 'ಅರ್ಥವ್ಯವಸ್ಥೆ', 'ಬೇಡಿಕೆ', 'ಪೂರೈಕೆ',
    'ಸಮತೋಲನ', 'ವೆಚ್ಚ', 'ಗ್ರಾಹಕ', 'ಉತ್ಪಾದಕ',
  ],
  FR: [
    'je pense', 'je crois', 'mon approche', 'parce que', 'donc', 'par conséquent',
    "l'offre", 'la demande', 'équilibre', 'élasticité', 'pib', 'inflation',
    'le prix', 'le coût', 'le marché', "l'économie",
    'augmente', 'diminue', 'se déplace', 'courbe',
    'coût d\'opportunité', 'avantage comparatif', 'externalité',
    'consommateur', 'producteur', 'surplus', 'déficit',
    "d'abord", 'ensuite', 'étape', 'le graphique', 'le modèle',
    'multiplicateur', 'bien public', 'marginal',
  ],
  DE: [
    'ich denke', 'ich glaube', 'mein ansatz', 'weil', 'deshalb', 'daher',
    'angebot', 'nachfrage', 'gleichgewicht', 'elastizität', 'bip', 'inflation',
    'der preis', 'die kosten', 'der markt', 'die wirtschaft',
    'steigt', 'sinkt', 'verschiebt', 'kurve',
    'opportunitätskosten', 'komparativer vorteil', 'externalität',
    'verbraucher', 'produzent', 'überschuss', 'defizit',
    'zuerst', 'dann', 'schritt', 'das diagramm', 'das modell',
    'multiplikator', 'öffentliches gut', 'grenznutzen',
  ],
  ES: [
    'creo que', 'pienso que', 'mi enfoque', 'porque', 'por lo tanto', 'por eso',
    'la oferta', 'la demanda', 'equilibrio', 'elasticidad', 'pib', 'inflación',
    'el precio', 'el costo', 'el mercado', 'la economía',
    'aumenta', 'disminuye', 'se desplaza', 'curva',
    'costo de oportunidad', 'ventaja comparativa', 'externalidad',
    'consumidor', 'productor', 'superávit', 'déficit',
    'primero', 'luego', 'paso', 'el gráfico', 'el modelo',
    'multiplicador', 'bien público', 'marginal',
  ],
  ZH: [
    '我觉得', '我认为', '我的方法', '因为', '所以', '因此',
    '供给', '需求', '均衡', '弹性', 'GDP', '通货膨胀',
    '价格', '成本', '市场', '经济',
    '增加', '减少', '移动', '曲线',
    '机会成本', '比较优势', '外部性',
    '消费者', '生产者', '盈余', '赤字',
    '首先', '然后', '步骤', '图表', '模型',
    '乘数', '公共物品', '边际',
  ],
};

function containsAttempt(message: string, language?: Language): boolean {
  const lowerMessage = message.toLowerCase();

  if (/\d+\s*[+\-*/=]\s*\d+/.test(message)) return true;
  if (/[a-z]\s*=\s*\d+/i.test(message)) return true;

  const langKeys = language ? [language, 'EN'] : Object.keys(ECON_ATTEMPT_INDICATORS);
  for (const lang of langKeys) {
    const indicators = ECON_ATTEMPT_INDICATORS[lang];
    if (!indicators) continue;
    for (const indicator of indicators) {
      if (message.includes(indicator) || lowerMessage.includes(indicator.toLowerCase())) return true;
    }
  }

  if (message.length < 20) return false;
  return false;
}

// ============================================
// LEAK DETECTION
// ============================================

const ECON_LEAK_PATTERNS: RegExp[] = [
  /the answer is/i,
  /the equilibrium (?:price|quantity|output) is \d+/i,
  /gdp (?:will be|equals?|is) \d+/i,
  /the (?:correct|right) answer/i,
  /therefore,?\s*(?:the|gdp|price|quantity|output)\s*(?:is|equals?|will be)\s*\d+/i,
  /(?:in conclusion|to summarize),?\s*(?:the|gdp|price)/i,
  /final answer/i,
];

const ECON_ANSWER_PATTERNS: RegExp[] = [
  /= \$?\d+(\.\d+)?(?:\s*(?:billion|million|trillion|percent|%))?/i,
  /(?:so|therefore|thus)\s+(?:the|it|this)\s+(?:equals?|is)\s*\$?\d+/i,
  /which gives us \$?\d+/i,
  /the formula (?:is|gives).*=/i,
];

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  for (const pattern of ECON_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "Let's think about this step by step. What happens first in the causation chain?"
      };
    }
  }

  for (const pattern of ECON_ANSWER_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "That's an interesting direction! Can you walk me through the reasoning that leads you there?"
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
    socratic: "That's interesting reasoning! Can you trace through the chain of effects step by step?",
    celebration: "Excellent economic thinking! Can you explain why this particular model applies here?",
    foundational: "Let's take a step back. What economic concept or model might help us analyze this?",
    default: "Tell me more about how you're reasoning through this economic problem.",
  },
  HI: {
    socratic: "दिलचस्प reasoning! क्या आप step by step effects की chain trace कर सकते हैं?",
    celebration: "बहुत बढ़िया economic thinking! क्या बता सकते हैं कि यह model यहाँ क्यों apply होता है?",
    foundational: "चलो पीछे जाते हैं। कौन सा economic concept या model help करेगा?",
    default: "इस economic problem के बारे में आप कैसे reason कर रहे हैं, और बताइए।",
  },
  KN: {
    socratic: "ಆಸಕ್ತಿದಾಯಕ reasoning! Step by step effects ನ chain trace ಮಾಡಬಹುದೇ?",
    celebration: "ಅತ್ಯುತ್ತಮ economic thinking! ಈ model ಇಲ್ಲಿ ಏಕೆ apply ಆಗುತ್ತದೆ ಎಂದು ವಿವರಿಸಬಹುದೇ?",
    foundational: "ಸ್ವಲ್ಪ ಹಿಂದೆ ಹೋಗೋಣ. ಯಾವ economic concept ಅಥವಾ model help ಮಾಡಬಹುದು?",
    default: "ಈ economic problem ಬಗ್ಗೆ ನೀವು ಹೇಗೆ reason ಮಾಡುತ್ತಿದ್ದೀರಿ ಎಂದು ಇನ್ನೂ ಹೇಳಿ.",
  },
  FR: {
    socratic: "Raisonnement intéressant ! Pouvez-vous retracer la chaîne d'effets étape par étape ?",
    celebration: "Excellente pensée économique ! Pouvez-vous expliquer pourquoi ce modèle s'applique ici ?",
    foundational: "Revenons en arrière. Quel concept ou modèle économique pourrait nous aider ?",
    default: "Dites-moi en plus sur votre raisonnement économique.",
  },
  DE: {
    socratic: "Interessante Argumentation! Können Sie die Wirkungskette Schritt für Schritt nachverfolgen?",
    celebration: "Ausgezeichnetes wirtschaftliches Denken! Können Sie erklären, warum dieses Modell hier passt?",
    foundational: "Gehen wir einen Schritt zurück. Welches Konzept oder Modell könnte hier helfen?",
    default: "Erzählen Sie mir mehr über Ihre wirtschaftliche Argumentation.",
  },
  ES: {
    socratic: "¡Razonamiento interesante! ¿Puedes trazar la cadena de efectos paso a paso?",
    celebration: "¡Excelente pensamiento económico! ¿Puedes explicar por qué este modelo aplica aquí?",
    foundational: "Vamos un paso atrás. ¿Qué concepto o modelo económico podría ayudarnos?",
    default: "Cuéntame más sobre tu razonamiento económico.",
  },
  ZH: {
    socratic: "有趣的推理！能一步一步地追踪因果链吗？",
    celebration: "出色的经济学思维！能解释一下为什么这个模型适用于这里吗？",
    foundational: "我们退一步想想。什么经济概念或模型可能有帮助？",
    default: "告诉我更多关于你的经济学推理。",
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
  const a = analysis as AnalysisResult;

  const languageInstruction: Record<string, string> = {
    EN: 'Respond in English.',
    HI: 'हिंदी में जवाब दें। Economic terms English में रख सकते हैं।',
    KN: 'ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. Economic terms English ನಲ್ಲಿ ಇರಬಹುದು.',
    FR: 'Répondez en français. Les termes économiques peuvent rester en anglais.',
    DE: 'Antworten Sie auf Deutsch. Wirtschaftliche Fachbegriffe können auf Englisch bleiben.',
    ES: 'Responde en español. Los términos económicos pueden quedarse en inglés.',
    ZH: '用中文回答。经济学术语可以保持英文。',
  };

  const typeInstructions: Record<string, string> = {
    attempt_prompt: 'Ask the student to share their economic reasoning or initial analysis.',
    clarifying: 'Ask a clarifying question about their economic reasoning.',
    socratic: `Ask ONE question that guides them toward understanding: "${a.conceptGaps?.[0] || 'the economic principle'}". Do NOT give the answer.`,
    hint_with_question: `Give a small hint about "${a.suggestedFocus}", then ask a guiding question. Still NO direct answers.`,
    foundational: `The student seems lost. Ask about a foundational concept: "${a.conceptGaps?.[0] || 'basics'}". Be encouraging.`,
    celebration: 'Celebrate their economic reasoning! Then ask them to extend it — what are the broader implications?',
    encouragement: 'The student is struggling. Acknowledge their effort, then simplify with an easier real-world example.',
  };

  return `
CONVERSATION HISTORY:
${historyText}

ANALYSIS:
- Error type: ${a.errorType}
- Error: ${a.errorDescription || 'none'}

TASK: ${typeInstructions[questionType] || typeInstructions.socratic}

${languageInstruction[language] || languageInstruction.EN}

CRITICAL RULES:
1. ONE question only (don't overwhelm)
2. Maximum 3-4 sentences
3. NEVER give the answer or complete the reasoning chain
4. Be warm and encouraging
5. Connect to real-world examples when helpful
6. Use economic vocabulary (supply, demand, equilibrium, trade-off, etc.)

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
SUBJECT: ${params.subject} (Economics)
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

const THRESHOLDS = { celebration: 20, socratic: 45, hint: 75 };

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
  const m = computeEconomicsMetrics(studentMessage);

  const additionalContext = `
PRE-COMPUTED METRICS (verified, do not re-analyze):
- Word count: ${m.wordCount}
- Quantitative content: ${m.hasQuantitativeContent ? `yes (${m.numericValueCount} values)` : 'no'}
- Economic models referenced: ${m.modelsReferenced.length > 0 ? m.modelsReferenced.join(', ') : 'none'}
- Graph/diagram reference: ${m.hasGraphReference ? 'yes' : 'no'}
- Causal reasoning language: ${m.hasCausalReasoning ? 'yes' : 'no'}
- Detected domain: ${m.detectedDomain}
- Reasoning steps: ${m.reasoningStepCount}

Focus analysis on causation chain completeness, model choice, and economic reasoning.
Do NOT re-state metrics already provided above.`;

  return {
    additionalContext,
    cacheKey: `analysis:econ:${contentHash(studentMessage)}`,
  };
}

// ============================================
// MODULE DEFINITION
// ============================================

export const economicsModule: TutorModule = {
  id: 'economics',
  subjects: ['ECONOMICS'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  systemPrompt: ECONOMICS_SYSTEM_PROMPT,
  analysisPrompt: ECONOMICS_ANALYSIS_PROMPT,
  hintLevelPrompts: ECONOMICS_HINT_LEVEL_PROMPTS,
  attemptPrompts: ECONOMICS_ATTEMPT_PROMPTS,

  containsAttempt,
  leakPatterns: [...ECON_LEAK_PATTERNS, ...ECON_ANSWER_PATTERNS],
  validateResponse,
  getFallbackResponse: (questionType: string, language?: string) => {
    const lang = language || 'EN';
    const langFallbacks = FALLBACKS[lang] || FALLBACKS.EN;
    return langFallbacks[questionType] || langFallbacks.default;
  },
  getLanguageContext: getEconomicsLanguageContext,

  preProcessAnalysis,
  maxResponseTokens: 400,

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as AnalysisResult;

    const topic = metadata?.topic as string | undefined;
    const hintLevel = metadata?.hintLevel || 0;

    let questionBankSection = '';
    if (topic && ECONOMICS_QUESTIONS[topic]) {
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${ECONOMICS_QUESTIONS[topic].map(q => `- ${q}`).join('\n')}`;
    } else {
      const allQs = Object.values(ECONOMICS_QUESTIONS).flat();
      const sample = allQs.sort(() => 0.5 - Math.random()).slice(0, 4);
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${sample.map(q => `- ${q}`).join('\n')}`;
    }

    let conceptHintSection = '';
    const conceptBank = topic ? ECONOMICS_CONCEPTS[topic] : undefined;
    if (conceptBank && hintLevel > 0) {
      const hintIdx = Math.min(hintLevel, 5) - 1;
      const lines = conceptBank.map(c => `- ${c.concept}: ${c.hints[Math.min(hintIdx, c.hints.length - 1)]}`);
      conceptHintSection = `\nRELEVANT CONCEPTS (hint level ${hintLevel}/5):\n${lines.join('\n')}`;
    }

    return `
CURRENT CONTEXT:
- Subject: Economics
- Student's Distance from Solution: ${a.distanceFromSolution}%
- Concepts Student is Using: ${a.conceptsIdentified?.join(', ') || 'unclear'}
- Concepts Student is Missing: ${a.conceptGaps?.join(', ') || 'none identified'}
- Student's Strengths: ${a.studentStrengths?.join(', ') || 'engaging with the problem'}
${questionBankSection}${conceptHintSection}

RESPONSE TYPE GUIDE:
- celebration: Acknowledge strong reasoning, then ask about broader implications
- socratic: Ask about the causation chain or a missing concept
- hint_with_question: Point to a relevant model or graph, then ask a guiding question
- foundational: Ask about a basic concept they need to review
- encouragement: Validate effort, simplify with a real-world example`;
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
