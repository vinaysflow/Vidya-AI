/**
 * STEM Tutor Module
 * 
 * Handles: PHYSICS, CHEMISTRY, MATHEMATICS, BIOLOGY
 * 
 * Provides trilingual support (EN, HI, KN), math/formula attempt detection,
 * answer leak detection, and the STEM hint ladder.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, AnalysisResult } from '../types';
import { SOCRATIC_SYSTEM_PROMPT, getLanguageContext, SUBJECT_QUESTIONS, STEM_TOPIC_KEYS, STEM_TOPIC_PRIMERS } from '../prompts/socratic';
import { ANALYSIS_PROMPT } from '../prompts/analysis';
import { HINT_LEVEL_PROMPTS } from '../../../prompts/socratic-system-prompt';
import { classifyPhysicsTopic, buildPhysicsDepthAddendum } from '../prompts/physics-depth';
import { buildElementaryOverlay } from '../prompts/elementary-overlay';
import { getExampleQuestions } from '../../learning/templateLookup';

// ============================================
// ATTEMPT DETECTION
// ============================================

const STEM_ATTEMPT_INDICATORS: Record<string, string[]> = {
  EN: [
    'i tried', 'i think', 'i believe', 'my approach',
    'i used', 'i applied', 'i calculated', 'i got',
    'let me try', 'here is my', 'this is what i',
    'because', 'since', 'therefore', 'so',
    'first', 'then', 'step', 'formula',
  ],
  HI: [
    'मैंने कोशिश', 'मुझे लगता', 'मैंने सोचा', 'मेरा तरीका',
    'मैंने इस्तेमाल', 'मैंने लगाया', 'मुझे मिला',
    'क्योंकि', 'इसलिए', 'तो', 'पहले', 'फिर',
    'सूत्र', 'समीकरण', 'हल',
  ],
  KN: [
    'ನಾನು ಪ್ರಯತ್ನಿಸಿದೆ', 'ನನಗೆ ಅನಿಸುತ್ತದೆ', 'ನನ್ನ ವಿಧಾನ',
    'ನಾನು ಬಳಸಿದೆ', 'ನನಗೆ ಸಿಕ್ಕಿತು',
    'ಏಕೆಂದರೆ', 'ಆದ್ದರಿಂದ', 'ಮೊದಲು', 'ನಂತರ',
    'ಸೂತ್ರ', 'ಸಮೀಕರಣ',
  ],
  FR: [
    "j'ai essayé", 'je pense', 'je crois', 'mon approche',
    "j'ai utilisé", "j'ai appliqué", "j'ai calculé", "j'ai obtenu",
    'parce que', 'donc', "d'abord", 'ensuite', 'étape', 'formule',
    'équation', 'résoudre',
  ],
  DE: [
    'ich habe versucht', 'ich denke', 'ich glaube', 'mein ansatz',
    'ich habe benutzt', 'ich habe angewendet', 'ich habe berechnet', 'ich habe bekommen',
    'weil', 'deshalb', 'zuerst', 'dann', 'schritt', 'formel',
    'gleichung', 'lösen',
  ],
  ES: [
    'intenté', 'creo que', 'pienso que', 'mi enfoque',
    'usé', 'apliqué', 'calculé', 'obtuve',
    'porque', 'por lo tanto', 'primero', 'luego', 'paso', 'fórmula',
    'ecuación', 'resolver',
  ],
  ZH: [
    '我试了', '我觉得', '我认为', '我的方法',
    '我用了', '我计算了', '我得到了',
    '因为', '所以', '首先', '然后', '步骤', '公式',
    '方程', '求解',
  ],
};

function containsAttempt(message: string, language?: Language): boolean {
  const lowerMessage = message.toLowerCase();

  if (/\d+\s*[+\-*/=]\s*\d+/.test(message)) return true;
  if (/[a-z]\s*=\s*\d+/i.test(message)) return true;

  const langKeys = language ? [language, 'EN'] : Object.keys(STEM_ATTEMPT_INDICATORS);
  for (const lang of langKeys) {
    const indicators = STEM_ATTEMPT_INDICATORS[lang];
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

const ANSWER_LEAK_PATTERNS: RegExp[] = [
  /the answer is/i,
  /=\s*\d+(\.\d+)?$/m,
  /therefore,?\s*x\s*=\s*\d+/i,
  /solution:\s*\d+/i,
  /final answer/i,
  /\bans\s*=\s*\d+/i,
  /\bresult\s*=\s*\d+/i,
  /\bvalue\s*=\s*\d+/i,
  /\bboxed\{[^}]+\}/i,
  /\bapproximately\s*\d+(\.\d+)?/i
];

/** Additional physics-specific leak patterns */
const STEM_ANSWER_PATTERNS: RegExp[] = [
  /= \d+(\.\d+)?\s*(m\/s|N|J|kg|m|s|Hz|W|V|A|Ω)/i,
  /therefore,?\s*(the|it|this)\s*(value|answer|result)/i,
  /so\s*(the|it)\s*(equals?|is)\s*\d+/i,
  /which gives us \d+/i,
  /you get \d+/i,
  /the formula is.*=/i,
  /substituting.*we get/i
];

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  // Check primary leak patterns
  for (const pattern of ANSWER_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "Let's step back. What do you think the first step should be?"
      };
    }
  }

  // Check additional STEM answer patterns
  for (const pattern of STEM_ANSWER_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isClean: false,
        fallbackMessage: "That's an interesting approach! Can you walk me through your reasoning step by step?"
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
    socratic: "That's an interesting approach! Can you walk me through your reasoning step by step?",
    hint_with_question: "Let's try a simpler question! How many would you have if you started with 1?\n\n[A] 1\n[B] 2\n[C] 0",
    foundational: "Let's go back to basics! What do we do when we need to combine two groups?\n\n[A] Add them together\n[B] Multiply them\n[C] Subtract one from the other",
    celebration: "Great work! Can you explain why this approach works?",
    default: "Let's try this one step at a time!\n\n[A] Show me the first step\n[B] Can I try a simpler version?\n[C] Let me start over"
  },
  HI: {
    socratic: "दिलचस्प approach है! क्या आप मुझे step by step बता सकते हैं?",
    hint_with_question: "एक आसान सवाल! अगर हमारे पास 2 चीज़ें हैं और हम 1 और जोड़ें तो कितनी होंगी?\n\n[A] 3\n[B] 2\n[C] 4",
    foundational: "चलो आसान शुरुआत करें! जब हम दो groups को मिलाते हैं तो क्या करते हैं?\n\n[A] जोड़ते हैं\n[B] गुणा करते हैं\n[C] घटाते हैं",
    celebration: "बहुत बढ़िया! क्या आप बता सकते हैं कि यह तरीका क्यों काम करता है?",
    default: "मुझे और बताइए कि आप इस problem के बारे में कैसे सोच रहे हैं।"
  },
  KN: {
    socratic: "ಆಸಕ್ತಿದಾಯಕ approach! ನಿಮ್ಮ reasoning step by step ಹೇಳಬಹುದೇ?",
    hint_with_question: "ಒಂದು ಸರಳ ಪ್ರಶ್ನೆ! 2 ವಸ್ತುಗಳಿಗೆ 1 ಸೇರಿಸಿದರೆ ಎಷ್ಟಾಗುತ್ತದೆ?\n\n[A] 3\n[B] 2\n[C] 4",
    celebration: "ಅತ್ಯುತ್ತಮ! ಈ approach ಏಕೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂದು ವಿವರಿಸಬಹುದೇ?",
    foundational: "ಸ್ವಲ್ಪ ಹಿಂದೆ ಹೋಗೋಣ. ಇಲ್ಲಿ main concept ಏನು?",
    default: "ಈ problem ಬಗ್ಗೆ ನೀವು ಹೇಗೆ ಯೋಚಿಸುತ್ತಿದ್ದೀರಿ ಎಂದು ಇನ್ನೂ ಹೇಳಿ."
  },
  FR: {
    socratic: "Approche intéressante ! Pouvez-vous me guider pas à pas dans votre raisonnement ?",
    celebration: "Excellent travail ! Pouvez-vous expliquer pourquoi cette approche fonctionne ?",
    foundational: "Revenons en arrière. Quel est le concept clé ici ?",
    default: "Dites-moi en plus sur votre réflexion."
  },
  DE: {
    socratic: "Interessanter Ansatz! Können Sie mir Schritt für Schritt durch Ihre Überlegung führen?",
    celebration: "Großartige Arbeit! Können Sie erklären, warum dieser Ansatz funktioniert?",
    foundational: "Gehen wir einen Schritt zurück. Was ist das Kernkonzept hier?",
    default: "Erzählen Sie mir mehr über Ihre Überlegungen."
  },
  ES: {
    socratic: "¡Enfoque interesante! ¿Puedes guiarme paso a paso por tu razonamiento?",
    celebration: "¡Gran trabajo! ¿Puedes explicar por qué funciona este enfoque?",
    foundational: "Vamos un paso atrás. ¿Cuál es el concepto clave aquí?",
    default: "Cuéntame más sobre cómo estás pensando en este problema."
  },
  ZH: {
    socratic: "有趣的方法！能一步一步地跟我讲讲你的推理吗？",
    celebration: "做得好！能解释一下为什么这个方法有效吗？",
    foundational: "我们退一步想想。这里的核心概念是什么？",
    default: "告诉我更多关于你如何思考这个问题的。"
  }
};

// ============================================
// ATTEMPT PROMPTS (trilingual)
// ============================================

const ATTEMPT_PROMPTS: Record<string, string> = {
  EN: `Before I help, I'd love to see your thinking! 🤔

What have you tried so far? Even a rough idea or a guess is a great starting point.

You could share:
• What concepts you think apply here
• Any formulas that might be relevant  
• Where you got stuck

Remember: Making attempts (even wrong ones!) is how we learn best.`,

  HI: `मदद करने से पहले, मैं आपकी सोच देखना चाहूंगा! 🤔

आपने अब तक क्या कोशिश की है? एक अनुमान भी अच्छी शुरुआत है।

आप बता सकते हैं:
• आपको कौन से concepts लागू होते दिख रहे हैं
• कोई relevant formula
• कहाँ अटक गए

याद रखें: कोशिश करना (गलत भी!) सीखने का सबसे अच्छा तरीका है।`,

  KN: `ಸಹಾಯ ಮಾಡುವ ಮೊದಲು, ನಿಮ್ಮ ಯೋಚನೆ ನೋಡಲು ಬಯಸುತ್ತೇನೆ! 🤔

ನೀವು ಇದುವರೆಗೆ ಏನು ಪ್ರಯತ್ನಿಸಿದ್ದೀರಿ? ಒಂದು ಅಂದಾಜು ಕೂಡ ಒಳ್ಳೆಯ ಆರಂಭ.

ನೀವು ಹಂಚಿಕೊಳ್ಳಬಹುದು:
• ಯಾವ concepts ಅನ್ವಯಿಸುತ್ತವೆ ಎಂದು ನೀವು ಯೋಚಿಸುತ್ತೀರಿ
• ಯಾವುದಾದರೂ relevant formula
• ಎಲ್ಲಿ stuck ಆದಿರಿ

ನೆನಪಿಡಿ: ಪ್ರಯತ್ನಿಸುವುದು (ತಪ್ಪಾದರೂ!) ಕಲಿಯಲು ಉತ್ತಮ ಮಾರ್ಗ.`,

  FR: `Avant de vous aider, j'aimerais voir votre réflexion ! 🤔

Qu'avez-vous essayé jusqu'ici ? Même une idée approximative est un excellent point de départ.

Vous pouvez partager :
• Les concepts que vous pensez appliquer
• Les formules qui pourraient être pertinentes
• Où vous êtes bloqué`,

  DE: `Bevor ich helfe, würde ich gerne Ihre Überlegungen sehen! 🤔

Was haben Sie bisher versucht? Auch eine grobe Idee ist ein guter Anfang.

Sie können teilen:
• Welche Konzepte Ihrer Meinung nach hier zutreffen
• Relevante Formeln
• Wo Sie nicht weiterkommen`,

  ES: `Antes de ayudarte, ¡me gustaría ver tu razonamiento! 🤔

¿Qué has intentado hasta ahora? Incluso una idea aproximada es un gran punto de partida.

Puedes compartir:
• Qué conceptos crees que aplican
• Fórmulas que podrían ser relevantes
• Dónde te quedaste atascado`,

  ZH: `在我帮助你之前，我想先看看你的思路！🤔

你到目前为止尝试了什么？即使是大致想法也是很好的起点。

你可以分享：
• 你认为哪些概念适用
• 可能相关的公式
• 你在哪里卡住了`
};

// ============================================
// LIGHTWEIGHT ATTEMPT ANALYSIS PROMPT
// ============================================

export const ATTEMPT_ANALYSIS_PROMPT = `You are analyzing whether a student has shown work in their attempt.

Return ONLY a JSON object with this schema:
{
  "attemptShown": <boolean>,
  "attemptQuality": "none" | "minimal" | "partial" | "substantial",
  "conceptsUsed": [<strings>],
  "misconceptions": [<strings>]
}

Signals to detect:
- Mathematical expressions or equations
- Step-by-step reasoning
- Partial solutions or intermediate values
- Diagrams described in words
- Concepts explicitly mentioned

Guidelines:
- If the student gives no work, set attemptShown=false and attemptQuality="none".
- If they provide a single formula or vague statement, use "minimal".
- If they outline some steps or partial reasoning, use "partial".
- If they show multiple steps with clear reasoning, use "substantial".
`;

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
  const isKidMode = metadata?.grade != null && metadata.grade <= 5;
  const effectiveGrade = metadata?.effectiveGrade ?? metadata?.grade;
  const a = analysis as AnalysisResult;

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
    attempt_prompt: 'Ask the student to show their work.',
    clarifying: 'Ask a clarifying question about their approach.',
    socratic: `Ask ONE Socratic question that guides them toward understanding: "${a.conceptGaps?.[0] || 'the core concept'}". Do NOT give the answer.`,
    hint_with_question: `Give ONE small hint about "${a.suggestedFocus}", then ask a CONCRETE multiple-choice question with a specific numeric or factual answer. The question MUST have exactly one correct answer. Do NOT ask open-ended questions like "What do you think?" or "Tell me more about your thinking." ALWAYS end with [A] [B] [C] choices where one is correct and the others are plausible wrong answers.`,
    foundational: `The student seems lost. Ask ONE simple concrete question about a foundational concept they need: "${a.conceptGaps?.[0] || 'the basics'}". Be encouraging. ALWAYS end with [A] [B] [C] choices where one is correct and the others are plausible wrong answers.`,
    celebration: 'Celebrate their success! Then ask them to explain WHY their approach works (deepens understanding).',
    celebrate_then_explain_back: "Celebrate immediately (e.g. 'Awesome, you got it!'). Then ask: 'Vidya's robot friend is confused — can you teach him WHY that works?' Use pretend-play framing.",
    encouragement: 'The student is struggling. Acknowledge their effort, then simplify with an easier guiding question.',
  };

  if (metadata?.isQuestIntro) {
    const contextBlock = metadata?.context
      ? `\nCONTEXT (the student has already seen this material — base your question and choices ONLY on these details):\n"""\n${metadata.context}\n"""\n`
      : '';
    return `
PROBLEM (use this EXACT question — do NOT rephrase or invent a new question):
"${metadata?.problemText || '(not provided)'}"
${contextBlock}
TASK: You are starting a new quest with a young student. This is the VERY FIRST message.
The student has NOT attempted anything yet — they just picked this quest.
Your ONLY job: add 1 fun sentence of context, then ask the EXACT question from the PROBLEM above (you may simplify wording for a kid but keep the same meaning and answer).

Do NOT say "good start", "nice", "great job", or anything that implies they already worked on it.
Do NOT reference any previous work or attempts.
Do NOT invent a different question. Do NOT change what is being asked.
${metadata?.context ? 'Do NOT invent details outside the CONTEXT above. All choices MUST reference details from the CONTEXT.' : ''}

${languageInstruction[language] || languageInstruction.EN}

CRITICAL RULES:
1. Ask the SAME question as the PROBLEM above. Do NOT substitute a different question.
2. Maximum 1 short sentence + the question. Think NPC speech bubble.
3. NEVER give the answer or solve the problem
4. The choices you provide (per the system instructions) MUST directly answer the question. One must be correct. Others must be plausible wrong answers.

Generate the response:
    `.trim();
  }

  const difficultyNote = isKidMode && effectiveGrade != null && effectiveGrade > (metadata?.grade ?? 3)
    ? `\nDIFFICULTY NOTE: This student is enrolled in grade ${metadata?.grade} but is performing at grade ${effectiveGrade} level. Generate the question at grade ${effectiveGrade} difficulty. Use grade ${effectiveGrade} vocabulary and number complexity.`
    : '';

  return `
CONVERSATION HISTORY:
${historyText}

ANALYSIS:
- Error type: ${a.errorType}
- Error: ${a.errorDescription || 'none'}

TASK: ${typeInstructions[questionType] || typeInstructions.socratic}

${languageInstruction[language] || languageInstruction.EN}
${difficultyNote}

CRITICAL RULES:
1. ONE question only (don't overwhelm)
2. ${isKidMode ? 'MAX 1 short sentence + 1 question. NPC speech bubble style, never more.' : 'Maximum 3-4 sentences'}
3. NEVER give the answer or solve the problem
4. Be warm and encouraging
5. Use the student's language style
${isKidMode ? `6. NEVER ask an open-ended or multi-part question. Ask ONE question with ONE clear answer.
7. The [A]/[B]/[C] choices MUST directly answer the ONE question you asked.
8. One choice MUST be correct. Others must be plausible wrong answers.
9. Each choice MUST be under 8 words.` : ''}
${isKidMode && metadata?.problemText ? `
QUEST ANCHOR (CRITICAL - do not drift):
The student is playing: "${metadata.problemText}"
Stay in this EXACT scenario. Use the same theme throughout (Minecraft/cooking/playground/etc).
Do not introduce new scenarios, abstract notation, or drift to other topics.` : ''}

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
SUBJECT: ${params.subject}
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

function mapAnalysisToStrategy(
  analysis: any,
  currentHintLevel: number
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
// MODULE DEFINITION
// ============================================

export const stemModule: TutorModule = {
  id: 'stem',
  subjects: ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  systemPrompt: SOCRATIC_SYSTEM_PROMPT,
  analysisPrompt: ANALYSIS_PROMPT,
  hintLevelPrompts: HINT_LEVEL_PROMPTS,
  attemptPrompts: ATTEMPT_PROMPTS,

  containsAttempt,
  leakPatterns: [...ANSWER_LEAK_PATTERNS, ...STEM_ANSWER_PATTERNS],
  validateResponse,
  getFallbackResponse: (questionType: string, language?: string) => {
    const lang = language || 'EN';
    const langFallbacks = FALLBACKS[lang] || FALLBACKS.EN;
    return langFallbacks[questionType] || langFallbacks.default;
  },
  getLanguageContext,

  // STEM does not need pre-processing
  // preProcessAnalysis: undefined,

  maxResponseTokens: 400,

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as AnalysisResult;
    let addendum = '';

    // Elementary overlay: prepend when grade <= 5
    const grade = metadata?.grade as number | undefined;
    if (grade != null && grade <= 7) {
      const effectiveGrade = (metadata?.effectiveGrade ?? grade) as number;
      const masteryContext = metadata?.masteryContext as
        | { masteredConcepts: Array<{ name: string; mastery: number }>; gapConcepts: Array<{ name: string; mastery: number }> }
        | undefined;
      const fewShotExamples = metadata?.fewShotExamples as string[] | undefined;
      const rsmTrack = metadata?.rsmTrack as boolean | string | undefined;
      addendum = buildElementaryOverlay(grade, effectiveGrade, masteryContext, fewShotExamples, rsmTrack) + '\n\n';
    }

    const subjectKey = (metadata?.subject || 'PHYSICS') as keyof typeof SUBJECT_QUESTIONS;
    const subjectQuestions = SUBJECT_QUESTIONS[subjectKey];
    const sqAny = subjectQuestions as Record<string, string[]> | undefined;
    const topicKeys = STEM_TOPIC_KEYS[subjectKey] as readonly string[] | undefined;
    const candidateTopic = typeof metadata?.topic === 'string' ? metadata.topic : undefined;
    const topicKey = candidateTopic && topicKeys?.includes(candidateTopic)
      ? candidateTopic
      : (topicKeys ? topicKeys[0] : (sqAny ? Object.keys(sqAny)[0] : undefined));
    const questions: string[] = topicKey ? sqAny?.[topicKey] || [] : [];
    const questionBankSection = questions.length
      ? `\nEXAMPLE SOCRATIC QUESTIONS (adapt, don't copy verbatim):\n${questions.map(q => `- ${q}`).join('\n')}`
      : '';

    const primers = STEM_TOPIC_PRIMERS[subjectKey as keyof typeof STEM_TOPIC_PRIMERS];
    const primerLines = topicKey && primers ? (primers[topicKey] || []) : [];
    const primerSection = primerLines.length
      ? `\nTOPIC PRIMER (short):\n${primerLines.map(p => `- ${p}`).join('\n')}`
      : '';

    let physicsDepthSection = '';
    if (subjectKey === 'PHYSICS') {
      const physicsTopic = (metadata?.topic as string) || classifyPhysicsTopic(
        a.conceptGaps?.join(' ') + ' ' + a.suggestedFocus + ' ' + (a.conceptsIdentified?.join(' ') || ''),
      );
      physicsDepthSection = buildPhysicsDepthAddendum(physicsTopic, metadata?.hintLevel || 0);
    }

    addendum += `
CURRENT CONTEXT:
- Subject: ${metadata?.subject || 'Unknown'}
- Student's Distance from Solution: ${a.distanceFromSolution}%
- Concepts Student is Using: ${a.conceptsIdentified?.join(', ') || 'unclear'}
- Concepts Student is Missing: ${a.conceptGaps?.join(', ') || 'none identified'}
- Student's Strengths: ${a.studentStrengths?.join(', ') || 'attempting the problem'}
${questionBankSection}${primerSection}${physicsDepthSection}

RESPONSE TYPE GUIDE:
- celebration: Acknowledge success, then ask them to explain WHY it works
- celebrate_then_explain_back: Celebrate first, then "Vidya's robot is confused — can you teach him why?"
- socratic: Ask a probing question that leads toward the gap
- hint_with_question: Give a small hint, then ask a question
- foundational: Ask about basic concepts they may have forgotten
- encouragement: Validate their effort, simplify the path forward`;
    return addendum.trim();
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
