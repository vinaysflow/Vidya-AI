/**
 * English Literature / Comprehension Tutor Module
 *
 * Handles: ENGLISH_LITERATURE
 *
 * Provides multilingual support, interpretation/analysis attempt detection,
 * interpretation leak detection, and the literature hint ladder.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, AnalysisResult } from '../types';
import {
  ENGLISH_LIT_SYSTEM_PROMPT,
  ENGLISH_LIT_HINT_LEVEL_PROMPTS,
  getEnglishLitLanguageContext,
  ENGLISH_LIT_ATTEMPT_PROMPTS,
  ENGLISH_LIT_QUESTIONS,
  ENGLISH_LIT_CONCEPTS,
} from '../prompts/english-lit-system';
import { ENGLISH_LIT_ANALYSIS_PROMPT } from '../prompts/english-lit-analysis';
import { computeLitMetrics } from '../../nlp';
import { contentHash } from '../../cache';

// ============================================
// ATTEMPT DETECTION
// ============================================

const LIT_ATTEMPT_INDICATORS: Record<string, string[]> = {
  EN: [
    'i think', 'i believe', 'i noticed', 'it seems', 'this suggests',
    'the author', 'the narrator', 'the character', 'the speaker',
    'the theme', 'the tone', 'the mood', 'the imagery',
    'metaphor', 'simile', 'irony', 'symbolism', 'foreshadowing',
    'because', 'since', 'therefore', 'this means', 'this shows',
    'in my opinion', 'my interpretation', 'my reading',
    'the text says', 'the passage', 'the poem', 'the story',
    'it reminds me', 'it makes me think', 'i feel like',
    'represents', 'symbolizes', 'suggests', 'implies', 'conveys',
    'the word', 'the phrase', 'the line', 'the sentence',
    'my analysis', 'i read it as', 'what stood out',
  ],
  HI: [
    'मुझे लगता', 'मैंने देखा', 'लेखक', 'कथाकार', 'पात्र',
    'विषय', 'स्वर', 'रूपक', 'उपमा', 'व्यंग्य', 'प्रतीक',
    'क्योंकि', 'इसलिए', 'मेरी राय', 'मेरा विश्लेषण',
    'कविता', 'कहानी', 'पाठ', 'पंक्ति', 'शब्द',
  ],
  KN: [
    'ನನಗೆ ಅನಿಸುತ್ತದೆ', 'ನಾನು ಗಮನಿಸಿದೆ', 'ಲೇಖಕ', 'ಕಥೆಗಾರ', 'ಪಾತ್ರ',
    'ವಿಷಯ', 'ಧ್ವನಿ', 'ರೂಪಕ', 'ಉಪಮೆ', 'ವ್ಯಂಗ್ಯ', 'ಸಂಕೇತ',
    'ಏಕೆಂದರೆ', 'ಆದ್ದರಿಂದ', 'ನನ್ನ ಅಭಿಪ್ರಾಯ', 'ನನ್ನ ವಿಶ್ಲೇಷಣೆ',
    'ಕವಿತೆ', 'ಕಥೆ', 'ಪಠ್ಯ', 'ಸಾಲು', 'ಪದ',
  ],
  FR: [
    'je pense', 'je crois', "j'ai remarqué", 'il semble', 'cela suggère',
    "l'auteur", 'le narrateur', 'le personnage', 'le locuteur',
    'le thème', 'le ton', 'la tonalité', "l'imagerie",
    'métaphore', 'comparaison', 'ironie', 'symbole', 'symbolisme',
    'parce que', 'donc', 'cela signifie', 'cela montre',
    'à mon avis', 'mon interprétation', 'ma lecture',
    'le texte dit', 'le passage', 'le poème', "l'histoire",
    'représente', 'symbolise', 'suggère', 'implique', 'transmet',
    'le mot', 'la phrase', 'la ligne', 'mon analyse',
  ],
  DE: [
    'ich denke', 'ich glaube', 'mir ist aufgefallen', 'es scheint', 'das deutet',
    'der autor', 'der erzähler', 'die figur', 'der sprecher',
    'das thema', 'der ton', 'die stimmung', 'die bildsprache',
    'metapher', 'vergleich', 'ironie', 'symbol', 'symbolik',
    'weil', 'deshalb', 'das bedeutet', 'das zeigt',
    'meiner meinung nach', 'meine interpretation', 'meine lesart',
    'der text sagt', 'die passage', 'das gedicht', 'die geschichte',
    'stellt dar', 'symbolisiert', 'deutet an', 'vermittelt',
    'das wort', 'der satz', 'die zeile', 'meine analyse',
  ],
  ES: [
    'creo que', 'pienso que', 'noté', 'parece que', 'esto sugiere',
    'el autor', 'el narrador', 'el personaje', 'el hablante',
    'el tema', 'el tono', 'el estado de ánimo', 'la imagen',
    'metáfora', 'símil', 'ironía', 'símbolo', 'simbolismo',
    'porque', 'por lo tanto', 'esto significa', 'esto muestra',
    'en mi opinión', 'mi interpretación', 'mi lectura',
    'el texto dice', 'el pasaje', 'el poema', 'la historia',
    'representa', 'simboliza', 'sugiere', 'implica', 'transmite',
    'la palabra', 'la frase', 'la línea', 'mi análisis',
  ],
  ZH: [
    '我觉得', '我认为', '我注意到', '看起来', '这暗示',
    '作者', '叙述者', '人物', '说话者',
    '主题', '语气', '氛围', '意象',
    '隐喻', '比喻', '讽刺', '象征', '伏笔',
    '因为', '所以', '这意味着', '这表明',
    '我的看法', '我的解读', '我的分析',
    '文本说', '段落', '诗', '故事',
    '代表', '象征着', '暗示', '传达',
    '这个词', '这句话', '这一行',
  ],
};

function containsAttempt(message: string, language?: Language): boolean {
  const lowerMessage = message.toLowerCase();

  const langKeys = language ? [language, 'EN'] : Object.keys(LIT_ATTEMPT_INDICATORS);
  for (const lang of langKeys) {
    const indicators = LIT_ATTEMPT_INDICATORS[lang];
    if (!indicators) continue;
    for (const indicator of indicators) {
      if (message.includes(indicator) || lowerMessage.includes(indicator.toLowerCase())) return true;
    }
  }

  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount >= 30) return true;

  if (message.length < 20) return false;
  return false;
}

// ============================================
// LEAK DETECTION
// ============================================

const LIT_LEAK_PATTERNS: RegExp[] = [
  /the (?:theme|message|meaning|moral) (?:of|in) (?:this|the) (?:text|poem|story|novel|passage) is/i,
  /this (?:symbolizes|represents|means|signifies) that/i,
  /the author (?:is saying|means|intends|wants to say) that/i,
  /the (?:correct|right|real) interpretation is/i,
  /what (?:this|the author|the poet) really means is/i,
  /the answer is/i,
  /in conclusion,?\s+(?:the|this)/i,
];

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  for (const pattern of LIT_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "What specific words or phrases in the text gave you that impression?"
      };
    }
  }

  // Check for long interpretive prose (5+ sentences with no question)
  const sentences = response.split(/[.!]+(?:\s|$)/).filter(s => s.trim().length > 0);
  const hasQuestion = response.includes('?');
  if (sentences.length >= 5 && !hasQuestion) {
    return {
      isClean: false,
      fallbackMessage: "That's an interesting direction! What specific evidence from the text supports that reading?"
    };
  }

  return { isClean: true };
}

// ============================================
// FALLBACK RESPONSES
// ============================================

const FALLBACKS: Record<string, Record<string, string>> = {
  EN: {
    socratic: "That's an interesting observation! What specific words or phrases in the text support that reading?",
    celebration: "Great analysis! Can you explain how you moved from the text to that interpretation?",
    foundational: "Let's start with what you notice. Is there a word, image, or moment that stands out to you?",
    default: "Tell me more about what you're seeing in this text.",
  },
  HI: {
    socratic: "दिलचस्प observation! Text में कौन से specific words या phrases इसे support करते हैं?",
    celebration: "बहुत बढ़िया analysis! आप text से इस interpretation तक कैसे पहुंचे?",
    foundational: "चलो शुरू करते हैं। कोई word, image, या moment है जो आपको stand out करता है?",
    default: "इस text में आप और क्या देख रहे हैं, मुझे बताइए।",
  },
  KN: {
    socratic: "ಆಸಕ್ತಿದಾಯಕ observation! Text ನಲ್ಲಿ ಯಾವ specific words ಅಥವಾ phrases ಇದನ್ನು support ಮಾಡುತ್ತವೆ?",
    celebration: "ಅತ್ಯುತ್ತಮ analysis! Text ನಿಂದ ಈ interpretation ಗೆ ಹೇಗೆ ಬಂದಿರಿ ಎಂದು ವಿವರಿಸಬಹುದೇ?",
    foundational: "ಶುರು ಮಾಡೋಣ. ಯಾವ word, image, ಅಥವಾ moment stand out ಆಗುತ್ತದೆ?",
    default: "ಈ text ನಲ್ಲಿ ನೀವು ಏನು ನೋಡುತ್ತಿದ್ದೀರಿ ಎಂದು ಇನ್ನೂ ಹೇಳಿ.",
  },
  FR: {
    socratic: "Observation intéressante ! Quels mots ou phrases spécifiques dans le texte soutiennent cette lecture ?",
    celebration: "Excellente analyse ! Comment êtes-vous passé du texte à cette interprétation ?",
    foundational: "Commençons. Y a-t-il un mot, une image ou un moment qui vous a frappé ?",
    default: "Dites-moi en plus sur ce que vous voyez dans ce texte.",
  },
  DE: {
    socratic: "Interessante Beobachtung! Welche spezifischen Wörter oder Phrasen im Text unterstützen diese Lesart?",
    celebration: "Ausgezeichnete Analyse! Wie sind Sie vom Text zu dieser Interpretation gekommen?",
    foundational: "Fangen wir an. Gibt es ein Wort, ein Bild oder einen Moment, der Ihnen aufgefallen ist?",
    default: "Erzählen Sie mir mehr darüber, was Sie in diesem Text sehen.",
  },
  ES: {
    socratic: "¡Observación interesante! ¿Qué palabras o frases específicas del texto apoyan esa lectura?",
    celebration: "¡Excelente análisis! ¿Cómo pasaste del texto a esa interpretación?",
    foundational: "Empecemos. ¿Hay alguna palabra, imagen o momento que te haya llamado la atención?",
    default: "Cuéntame más sobre lo que ves en este texto.",
  },
  ZH: {
    socratic: "有趣的观察！文本中哪些具体的词语或短语支持这种理解？",
    celebration: "优秀的分析！你是如何从文本得出这个解读的？",
    foundational: "我们开始吧。有没有什么词语、意象或时刻让你印象深刻？",
    default: "告诉我更多关于你在这段文本中看到了什么。",
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
  metadata?: Record<string, any>;
}): string {
  const { questionType, analysis, language, historyText, metadata } = params;
  const a = analysis as AnalysisResult;

  const languageInstruction: Record<string, string> = {
    EN: 'Respond in English.',
    HI: 'हिंदी में जवाब दें। Literary terms English में रख सकते हैं।',
    KN: 'ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. Literary terms English ನಲ್ಲಿ ಇರಬಹುದು.',
    FR: 'Répondez en français. Les termes littéraires peuvent rester en anglais.',
    DE: 'Antworten Sie auf Deutsch. Literarische Begriffe können auf Englisch bleiben.',
    ES: 'Responde en español. Los términos literarios pueden quedarse en inglés.',
    ZH: '用中文回答。文学术语可以保持英文。',
  };

  const typeInstructions: Record<string, string> = {
    attempt_prompt: 'Ask the student to share their first impressions or what they noticed.',
    clarifying: 'Ask a clarifying question about their reading or interpretation.',
    socratic: `Ask ONE question that guides them toward a deeper reading of: "${a.conceptGaps?.[0] || 'the text'}". Do NOT give the interpretation.`,
    hint_with_question: `Point to a specific passage or device related to "${a.suggestedFocus}", then ask a guiding question. Do NOT interpret it for them.`,
    foundational: `The student seems unsure how to begin. Ask about something concrete they noticed: "${a.conceptGaps?.[0] || 'a word or image that stood out'}". Be encouraging.`,
    celebration: 'Celebrate their strong reading! Then ask them to deepen it — how does this connect to the broader text?',
    encouragement: 'The student is struggling. Validate their effort, then ask an easier question about something specific in the text.',
  };

  const contextSection = metadata?.context
    ? `\nPASSAGE (the student has read this — ONLY reference details from this text):\n"""\n${metadata.context}\n"""\n`
    : '';

  return `
CONVERSATION HISTORY:
${historyText}
${contextSection}
ANALYSIS:
- Error type: ${a.errorType}
- Error: ${a.errorDescription || 'none'}

TASK: ${typeInstructions[questionType] || typeInstructions.socratic}

${languageInstruction[language] || languageInstruction.EN}

CRITICAL RULES:
1. ONE question only (don't overwhelm)
2. Maximum 3-4 sentences
3. NEVER give the interpretation or state the theme/meaning directly
4. Be warm and encouraging
5. Always ground in the text — point to specific words, phrases, or passages${metadata?.context ? ' from the PASSAGE above' : ''}
6. Use literary-analysis language (text, passage, imagery, tone, device)
${metadata?.context ? '7. Do NOT invent details not present in the PASSAGE. All references MUST come from the provided text.' : ''}

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
  metadata?: Record<string, any>;
}): string {
  const passageSection = params.metadata?.context
    ? `\nPASSAGE (the reading material the student was given):\n"""\n${params.metadata.context}\n"""\n`
    : '';

  return `
SUBJECT: ${params.subject} (English Literature / Comprehension)
LANGUAGE: ${params.language}

TEXT / PASSAGE / QUESTION:
${params.problem || 'Not explicitly stated'}
${passageSection}
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

const THRESHOLDS = { celebration: 25, socratic: 50, hint: 80 };

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
  const m = computeLitMetrics(studentMessage);

  const additionalContext = `
PRE-COMPUTED METRICS (verified, do not re-analyze):
- Word count: ${m.wordCount}
- Sentences: ${m.sentenceCount}
- Quoted phrases from text: ${m.quotedPhraseCount}
- Questions asked: ${m.questionCount}
- References to text/author/narrator: ${m.hasTextualReference ? 'yes' : 'no'}
- Personal interpretation language: ${m.hasPersonalInterpretation ? 'yes' : 'no'}
- Literary devices mentioned: ${m.literaryDevicesFound.length > 0 ? m.literaryDevicesFound.join(', ') : 'none'}
- Evidence-based claim (quote + interpretation): ${m.hasEvidenceBasedClaim ? 'yes' : 'no'}

Focus analysis on depth of reading, evidence use, and interpretive reasoning.
Do NOT re-state metrics already provided above.`;

  return {
    additionalContext,
    cacheKey: `analysis:lit:${contentHash(studentMessage)}`,
  };
}

// ============================================
// MODULE DEFINITION
// ============================================

export const englishLitModule: TutorModule = {
  id: 'english-lit',
  subjects: ['ENGLISH_LITERATURE'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  systemPrompt: ENGLISH_LIT_SYSTEM_PROMPT,
  analysisPrompt: ENGLISH_LIT_ANALYSIS_PROMPT,
  hintLevelPrompts: ENGLISH_LIT_HINT_LEVEL_PROMPTS,
  attemptPrompts: ENGLISH_LIT_ATTEMPT_PROMPTS,

  containsAttempt,
  leakPatterns: LIT_LEAK_PATTERNS,
  validateResponse,
  getFallbackResponse: (questionType: string, language?: string) => {
    const lang = language || 'EN';
    const langFallbacks = FALLBACKS[lang] || FALLBACKS.EN;
    return langFallbacks[questionType] || langFallbacks.default;
  },
  getLanguageContext: getEnglishLitLanguageContext,

  preProcessAnalysis,
  maxResponseTokens: 400,

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as AnalysisResult;

    const topic = metadata?.topic as string | undefined;
    const hintLevel = metadata?.hintLevel || 0;

    let questionBankSection = '';
    if (topic && ENGLISH_LIT_QUESTIONS[topic]) {
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${ENGLISH_LIT_QUESTIONS[topic].map(q => `- ${q}`).join('\n')}`;
    } else {
      const allQs = Object.values(ENGLISH_LIT_QUESTIONS).flat();
      const sample = allQs.sort(() => 0.5 - Math.random()).slice(0, 4);
      questionBankSection = `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${sample.map(q => `- ${q}`).join('\n')}`;
    }

    let conceptHintSection = '';
    const conceptBank = topic ? ENGLISH_LIT_CONCEPTS[topic] : undefined;
    if (conceptBank && hintLevel > 0) {
      const hintIdx = Math.min(hintLevel, 5) - 1;
      const lines = conceptBank.map(c => `- ${c.concept}: ${c.hints[Math.min(hintIdx, c.hints.length - 1)]}`);
      conceptHintSection = `\nRELEVANT CONCEPTS (hint level ${hintLevel}/5):\n${lines.join('\n')}`;
    }

    return `
CURRENT CONTEXT:
- Subject: English Literature / Comprehension
- Student's Distance from Insight: ${a.distanceFromSolution}%
- Concepts Student Recognizes: ${a.conceptsIdentified?.join(', ') || 'unclear'}
- Concepts Student Needs: ${a.conceptGaps?.join(', ') || 'none identified'}
- Student's Strengths: ${a.studentStrengths?.join(', ') || 'engaging with the text'}
${questionBankSection}${conceptHintSection}

RESPONSE TYPE GUIDE:
- celebration: Acknowledge strong reading, then ask them to connect it to the broader text
- socratic: Ask a probing question about a passage, device, or pattern
- hint_with_question: Point to a specific passage or device, then ask what effect it has
- foundational: Ask about something concrete they noticed in the text
- encouragement: Validate effort, then ask an easier close-reading question`;
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
