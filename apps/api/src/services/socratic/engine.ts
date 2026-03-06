/**
 * Socratic Engine - Core Tutoring Logic
 * 
 * This is the heart of Vidya. It ensures:
 * 1. Students attempt problems before getting help
 * 2. Never gives direct answers
 * 3. Uses Socratic questioning to guide discovery
 * 4. Supports multiple tutoring domains via the module system
 * 5. Adapts hint level based on student progress
 * 
 * The engine is domain-agnostic — all subject-specific logic lives in
 * TutorModule implementations (see modules/stem.ts, modules/essay.ts).
 * The engine handles shared infrastructure: LLM client abstraction, prompt caching,
 * model routing, session summarization, and context management.
 */

import type { Language, Subject } from '@prisma/client';
import { getModule, registerModule } from './registry';
import type { TutorModule } from './module';
import { cache, CACHE_TTL } from '../cache';
import { LlmClient, BudgetExceededError } from '../llm/client';
import { resolveModelPolicy } from './routingPolicy';
import {
  getOrCreateSessionSummary,
  buildHistoryText,
  generateSessionReport as _generateSessionReport,
  type SessionReport,
} from './summarizer';
import {
  generateSessionQuiz as _generateSessionQuiz,
  type SessionQuiz,
} from './quiz';
import { generateVisualContent } from './visualGenerator';
import { getConceptBankAddendum } from './conceptBank';
import { getExampleQuestions } from '../learning/templateLookup';

// Import and register modules
import { stemModule } from './modules/stem';
import { essayModule } from './modules/essay';
import { counselorModule } from './modules/counselor';
import { codingModule } from './modules/coding';
import { englishLitModule } from './modules/english-lit';
import { economicsModule } from './modules/economics';
import { aiLearningModule } from './modules/ai-learning';

// Re-export types for backward compatibility
export type {
  TutorInput,
  TutorResponse,
  EssayAnalysisResult,
  QuestionType,
  AnalysisResult,
  Message,
  AttemptQuality,
  AttemptAnalysis,
  SocraticContext,
  ResponseStrategy,
  KnowledgeState,
} from './types';

export type { SessionReport };
export type { SessionQuiz };

import type {
  TutorInput,
  TutorResponse,
  QuestionType,
  Message,
  AttemptAnalysis,
  SocraticContext,
  ResponseStrategy,
  KnowledgeState,
  AnalysisResult,
} from './types';

// Register all built-in modules at import time
registerModule(stemModule);
registerModule(essayModule);
registerModule(counselorModule);
registerModule(codingModule);
registerModule(englishLitModule);
registerModule(economicsModule);
registerModule(aiLearningModule);

// ============================================
// LIGHTWEIGHT ATTEMPT ANALYSIS PROMPT (for overload 2)
// ============================================

const ATTEMPT_ANALYSIS_PROMPT = `You are analyzing whether a student has shown work in their attempt.

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
// MAIN ENGINE CLASS
// ============================================

export class SocraticEngine {
  private client: LlmClient;

  constructor(apiKey?: string) {
    this.client = new LlmClient({
      anthropicApiKey: apiKey,
    });
  }

  /**
   * Main entry point - process a student message.
   * 
   * Overload 1 (TutorInput): Primary API used by route handlers.
   *   Uses the module-based pipeline: attempt gate → analysis → response → validate.
   * 
   * Overload 2 (string, SocraticContext): Alternative entry point.
   *   Uses the legacy overload-2 pipeline with module dispatch for strategy/prompts.
   */
  async processMessage(input: TutorInput): Promise<TutorResponse>;
  async processMessage(
    userMessage: string,
    context: SocraticContext
  ): Promise<{ response: string; updatedContext: SocraticContext }>;
  async processMessage(
    arg1: TutorInput | string,
    arg2?: SocraticContext
  ): Promise<TutorResponse | { response: string; updatedContext: SocraticContext }> {
    if (typeof arg1 === 'string' && arg2) {
      return this.processMessageOverload2(arg1, arg2);
    }

    const input = arg1 as TutorInput;
    return this.processMessageOverload1(input);
  }

  // ============================================
  // OVERLOAD 1: TutorInput → TutorResponse (module-based pipeline)
  // ============================================

  private async processMessageOverload1(input: TutorInput): Promise<TutorResponse> {
    const {
      sessionId,
      userMessage,
      language,
      conversationHistory,
      subject,
      currentHintLevel,
    } = input;

    // Get the module for this subject
    const mod = getModule(subject);

    // Step 1: Check if we need the student to show work first
    // Counselor mode skips the attempt gate — it's conversational
    const isCounseling = subject === 'COUNSELING';
    if (!isCounseling && this.needsAttemptFirst(conversationHistory, userMessage, mod, language, { grade: input.grade })) {
      return this.promptForAttempt(language, mod, input.grade);
    }

    // Kid quest intro: first turn skips analysis entirely — the user message is just the problem statement
    const isFirstTurn = conversationHistory.filter(m => m.role === 'USER').length <= 1;
    if (input.grade != null && input.grade <= 5 && isFirstTurn) {
      return this.generateKidQuestIntro(input, mod);
    }

    // Step 2: Run analysis
    const analysis = await this.runAnalysis({
      mod,
      sessionId,
      problem: this.extractProblem(conversationHistory),
      studentMessage: userMessage,
      conversationHistory,
      subject,
      language,
      metadata: {
        topic: input.topic,
        essayPromptText: input.essayPromptText,
        schoolName: input.schoolName,
        essayType: input.essayType,
        essayCategory: input.essayCategory,
        wordLimit: input.wordLimit,
        grade: input.grade,
        userId: input.userId,
        masteryContext: input.masteryContext,
        rsmTrack: input.rsmTrack,
        // Counselor metadata
        clientContext: input.clientContext,
        variant: input.variant,
      }
    });

    // Extract auto-detected topic from analysis (new modules return this)
    const detectedTopic: string | undefined = analysis.topic || input.topic;

    // Step 3: Map analysis to strategy (question type + hint level)
    let questionType: QuestionType;
    let newHintLevel: number;

    if (mod.mapAnalysisToStrategy) {
      ({ questionType, newHintLevel } = mod.mapAnalysisToStrategy(analysis, currentHintLevel));
    } else {
      // Default fallback — shouldn't happen if modules implement it
      questionType = 'socratic';
      newHintLevel = currentHintLevel;
    }

    // Elementary celebrate_then_explain_back: after correct answer, ask kid to explain why it works
    const grade = input.grade;
    const STEM_SUBJECTS: Subject[] = ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY'];
    const isStemSubject = STEM_SUBJECTS.includes(subject);

    if (grade != null && grade <= 5 && questionType === 'celebration' && isStemSubject) {
      const a = analysis as { distanceFromSolution?: number };
      if ((a.distanceFromSolution ?? 100) < 15) {
        const lastAssistant = conversationHistory.filter((m) => m.role === 'ASSISTANT').pop();
        const content = (lastAssistant as { content?: string } | undefined)?.content ?? '';
        const alreadyAskedExplainBack =
          /robot|teach|explain|why.*work/i.test(content);
        if (!alreadyAskedExplainBack) {
          questionType = 'celebrate_then_explain_back';
        }
      }
    }

    // Adaptive anti-loop: if the assistant is repeating itself, increase help level.
    if (analysis.distanceFromSolution >= 70 && this.isStalled(conversationHistory)) {
      if (questionType === 'socratic' || questionType === 'foundational') {
        questionType = 'hint_with_question';
      }
      newHintLevel = Math.min(currentHintLevel + 1, 5);
    }

    // Adaptive engagement: attempt-quality-based escalation
    let scaffoldMode = false;
    let adaptiveEscalation = false;
    let stuckDetected = false;

    if (!isCounseling && questionType !== 'celebration') {
      const turnNumber = conversationHistory.filter(m => m.role === 'USER').length;
      const flatTurns = this.countFlatTurns(conversationHistory);

      if (flatTurns >= 3) {
        newHintLevel = Math.min(newHintLevel + 1, 5);
        adaptiveEscalation = true;
      }

      stuckDetected = this.detectStuck(
        conversationHistory,
        newHintLevel,
        userMessage,
        analysis,
        turnNumber
      );

      if (stuckDetected) {
        scaffoldMode = true;
        adaptiveEscalation = true;
        newHintLevel = Math.max(newHintLevel, 3);
      }
    }

    const bankTopic =
      input.essayCategory ||
      (analysis?.suggestedFocus as string | undefined) ||
      detectedTopic;

    // Step 4: Generate response
    const response = await this.runResponseGeneration({
      mod,
      sessionId,
      questionType,
      analysis,
      language,
      conversationHistory,
      hintLevel: newHintLevel,
      scaffoldMode,
      metadata: {
        subject,
        topic: detectedTopic,
        bankTopic,
        essayCategory: input.essayCategory,
        wordLimit: input.wordLimit,
        schoolName: input.schoolName,
        hintLevel: newHintLevel,
        noFinalAnswer: input.noFinalAnswer,
        grade: input.grade,
        effectiveGrade: input.effectiveGrade,
        masteryContext: input.masteryContext,
        problemText: this.extractProblem(conversationHistory),
        // Counselor metadata
        clientContext: input.clientContext,
        variant: input.variant,
      }
    });

    // Step 4b: Retry if kid mode response is missing [A]/[B]/[C] choices
    if (grade != null && grade <= 7) {
      const hasChoices = /\[A\]/i.test(response.text) && /\[B\]/i.test(response.text);
      if (!hasChoices) {
        try {
          const retryHistory = [
            ...conversationHistory,
            { role: 'ASSISTANT' as const, content: response.text },
            {
              role: 'USER' as const,
              content: 'You forgot to include [A] [B] [C] choices at the end. Please add exactly 3 answer choices now.',
            },
          ];
          const retryResponse = await this.runResponseGeneration({
            mod,
            sessionId,
            questionType,
            analysis,
            language,
            conversationHistory: retryHistory,
            hintLevel: newHintLevel,
            scaffoldMode,
            metadata: {
              subject,
              topic: detectedTopic,
              bankTopic,
              essayCategory: input.essayCategory,
              wordLimit: input.wordLimit,
              schoolName: input.schoolName,
              hintLevel: newHintLevel,
              noFinalAnswer: input.noFinalAnswer,
              grade: input.grade,
              effectiveGrade: input.effectiveGrade,
              masteryContext: input.masteryContext,
              problemText: this.extractProblem(conversationHistory),
              clientContext: input.clientContext,
              variant: input.variant,
            },
          });
          if (/\[A\]/i.test(retryResponse.text) && /\[B\]/i.test(retryResponse.text)) {
            Object.assign(response, retryResponse);
          }
        } catch (_) { /* retry is best-effort */ }
      }
    }

    // Step 5: Generate optional visual content (infographic)
    // For kids, skip all visuals — the game scene IS the visual. Equation steps / diagrams are confusing for 3rd graders.
    let visualContent: import('./types').VisualContent | null = null;
    const skipVisual = grade != null && grade <= 5;
    if (!skipVisual) {
      try {
        visualContent = await generateVisualContent({
          subject,
          tutorMessage: response.text,
          analysis,
          language,
          client: this.client,
          modelPolicy: mod.modelPolicy?.analysis,
          grade: input.grade,
        });
      } catch (_) { /* visual generation is best-effort */ }
    }

    // Step 6: Build TutorResponse with metadata
    return this.buildTutorResponse({
      mod,
      message: response.text,
      safetyEvents: response.safetyEvents,
      language,
      questionType,
      analysis,
      newHintLevel,
      input,
      detectedTopic,
      modelUsed: response.modelUsed,
      visualContent,
      adaptiveEscalation,
      stuckDetected,
    });
  }

  // ============================================
  // OVERLOAD 2: Legacy SocraticContext pipeline
  // ============================================

  private async processMessageOverload2(
    userMessage: string,
    context: SocraticContext
  ): Promise<{ response: string; updatedContext: SocraticContext }> {
    const mod = getModule(context.subject);

    const attemptAnalysis = await this.analyzeAttempt(userMessage, context);
    const strategy = this.determineStrategy(attemptAnalysis, context, mod);
    const dynamicPrompt = this.buildDynamicPrompt(strategy, context, mod);
    const response = await this.generateResponse(userMessage, dynamicPrompt, context);
    const validatedResponse = await this.validateResponseWithModule(response, mod, context.conversationHistory);
    const updatedContext = this.updateContext(
      context,
      userMessage,
      validatedResponse.text,
      attemptAnalysis,
      strategy
    );

    return { response: validatedResponse.text, updatedContext };
  }

  // ============================================
  // GENERIC ANALYSIS PIPELINE
  // ============================================

  /**
   * Run analysis for any module using the module's analysis prompt,
   * optional pre-processing hook, and Haiku.
   */
  private async runAnalysis(params: {
    mod: TutorModule;
    sessionId: string;
    problem: string;
    studentMessage: string;
    conversationHistory: Message[];
    subject: Subject;
    language: Language;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const { mod, sessionId, problem, studentMessage, conversationHistory, subject, language, metadata } = params;

    // Run pre-processing hook if defined
    let additionalContext = '';
    let cacheKey: string | undefined;

    if (mod.preProcessAnalysis) {
      const preResult = mod.preProcessAnalysis({
        studentMessage,
        conversationHistory,
        metadata,
      });
      additionalContext = preResult.additionalContext || '';
      cacheKey = preResult.cacheKey;
    }

    // Check cache if a cache key was provided
    if (cacheKey) {
      const cached = await cache.getJSON<any>(cacheKey);
      if (cached) {
        console.log(`[Cache] Analysis cache hit for module '${mod.id}'`);
        return cached;
      }
    }

    // Build history context
    const { summary, recentMessages } = await getOrCreateSessionSummary(
      sessionId, conversationHistory, this.client
    );
    const historyText = buildHistoryText(summary, recentMessages);

    try {
      // Build user prompt
      let userPrompt: string;
      if (mod.buildAnalysisUserPrompt) {
        userPrompt = mod.buildAnalysisUserPrompt({
          problem,
          studentMessage,
          historyText,
          subject,
          language,
          metadata,
        });
      } else {
        userPrompt = `
SUBJECT: ${subject}
LANGUAGE: ${language}

ORIGINAL PROBLEM:
${problem || 'Not explicitly stated'}

CONVERSATION HISTORY:
${historyText}

LATEST STUDENT MESSAGE:
${studentMessage}

Analyze this and respond with JSON only.
        `.trim();
      }

      // Inject additional context from pre-processing (e.g., NLP metrics)
      if (additionalContext) {
        userPrompt = `${additionalContext}\n\n${userPrompt}`;
      }

      const analysisPolicy = resolveModelPolicy(mod.modelPolicy?.analysis);
      const content = await this.client.generateText({
        modelType: 'analysis',
        maxTokens: 1000,
        systemPrompt: mod.analysisPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        usePromptCache: true,
        providerOverride: analysisPolicy.provider,
        modelOverride: analysisPolicy.model,
      });

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Cache the result if a cache key was provided
      if (cacheKey) {
        await cache.setJSON(cacheKey, result, CACHE_TTL.ESSAY_ANALYSIS);
      }

      return result;

    } catch (error) {
      console.error(`[${mod.id}] Analysis error:`, error);

      // Return module-appropriate default analysis on error
      if (mod.id === 'essay') {
        return {
          readiness: 50,
          strengths: [],
          gaps: [],
          suggestedFocus: 'sharing more of your story',
          hasDraft: mod.containsAttempt(studentMessage)
        };
      }

      if (mod.id === 'counselor') {
        return {
          intent: 'question',
          urgency: 'medium',
          relevantContextAreas: [],
          suggestedFocus: 'understanding the student\'s situation',
          sentimentTone: 'neutral',
          actionability: 50
        };
      }

      // STEM default
      return {
        distanceFromSolution: 50,
        conceptsIdentified: [],
        conceptGaps: [],
        errorType: 'approach',
        errorDescription: null,
        studentStrengths: [],
        suggestedFocus: 'problem understanding',
        isAttemptShown: mod.containsAttempt(studentMessage)
      };
    }
  }

  // ============================================
  // GENERIC RESPONSE GENERATION
  // ============================================

  /**
   * Generate a response for any module using the module's system prompt,
   * language context, optional addendum, and Sonnet.
   */
  private async runResponseGeneration(params: {
    mod: TutorModule;
    sessionId: string;
    questionType: QuestionType;
    analysis: any;
    language: Language;
    conversationHistory: Message[];
    hintLevel: number;
    scaffoldMode?: boolean;
    metadata?: Record<string, any>;
  }): Promise<{ text: string; safetyEvents: string[]; modelUsed?: { provider: string; model: string; fallbackUsed: boolean } }> {
    const { mod, sessionId, questionType, analysis, language, conversationHistory, hintLevel, scaffoldMode, metadata } = params;
    const safetyEvents: string[] = [];

    const { summary, recentMessages } = await getOrCreateSessionSummary(
      sessionId, conversationHistory, this.client
    );
    const historyText = buildHistoryText(summary, recentMessages);

    const languageContext = mod.getLanguageContext(language);

    // Pre-fetch few-shot examples for elementary overlay grade calibration
    let fewShotExamples: string[] | undefined;
    const kidGradeForExamples = metadata?.grade as number | undefined;
    const effectiveGradeForExamples = (metadata?.effectiveGrade ?? kidGradeForExamples) as number | undefined;
    if (kidGradeForExamples != null && kidGradeForExamples <= 7 && effectiveGradeForExamples != null) {
      const exResult = await getExampleQuestions(
        (metadata?.problemText ? 'unknown' : metadata?.bankTopic) || 'unknown',
        effectiveGradeForExamples,
        2
      ).catch(() => ({ texts: [], ids: [] }));
      fewShotExamples = exResult.texts;
    }

    // Build system prompt
    let systemPrompt = `${mod.systemPrompt}\n\n${languageContext}`;

    if (metadata?.noFinalAnswer) {
      systemPrompt += `\n\nNO-FINAL-ANSWER MODE:\n- Never provide final answers, numeric results, or completed solutions.\n- Always stop at a guiding question or partial hint.\n- If the student asks for the answer, redirect them to explain their reasoning.`;
      safetyEvents.push('no_final_answer_mode');
    }

    // Add module-specific addendum (analysis context, category coaching, etc.)
    if (mod.buildResponseSystemAddendum) {
      const addendum = mod.buildResponseSystemAddendum(analysis, {
        ...metadata,
        questionType,
        hintLevel,
        fewShotExamples,
      });
      systemPrompt += `\n\n${addendum}`;
    }

    // Add hint level text
    if (hintLevel > 0) {
      const hintText = mod.hintLevelPrompts[hintLevel] || mod.hintLevelPrompts[1];
      if (!systemPrompt.includes('HINT LEVEL:')) {
        systemPrompt += `\n\nHINT LEVEL: ${hintLevel}/5\n${hintText}`;
      }
    }

    const bankTopic = metadata?.bankTopic || metadata?.topic || (analysis?.suggestedFocus as string | undefined);
    const bankAddendum = await getConceptBankAddendum({
      subject: metadata?.subject as Subject | undefined,
      topic: typeof bankTopic === 'string' ? bankTopic : undefined,
      hintLevel,
      grade: metadata?.grade as number | undefined,
    });
    if (bankAddendum) {
      systemPrompt += `\n\n${bankAddendum}`;
    }

    if (scaffoldMode) {
      systemPrompt += [
        '',
        '',
        'SCAFFOLD MODE - NARROW THE QUESTION:',
        'The student appears stuck. Instead of asking a broad question:',
        '1) Identify the single smallest sub-step the student needs next.',
        '2) Ask only about that sub-step, not the whole problem.',
        '3) If possible, give a concrete starting point: "What is [specific value]?"',
        '4) Keep your response short (2-3 sentences max before the question).',
        'Do NOT provide worked examples, solutions, or multi-step explanations.',
      ].join('\n');
    }

    // Build user prompt
    let userPrompt: string;
    if (mod.buildResponseUserPrompt) {
      userPrompt = mod.buildResponseUserPrompt({
        questionType,
        analysis,
        language,
        historyText,
        metadata,
      });
    } else {
      userPrompt = `
CONVERSATION HISTORY:
${historyText}

Generate a ${questionType} response.

CRITICAL RULES:
1. ONE question only
2. Maximum 3-4 sentences
3. NEVER give direct answers
4. Be warm and encouraging

Generate the response:
      `.trim();
    }

    try {
      const responsePolicy = resolveModelPolicy(mod.modelPolicy?.response);
      const baseMax = mod.maxResponseTokens || 400;
      const maxTokens =
        metadata?.grade != null && metadata.grade <= 5 ? Math.min(baseMax, 200) : baseMax;
      const result = await this.client.generateTextWithMeta({
        modelType: 'response',
        maxTokens,
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        usePromptCache: true,
        providerOverride: responsePolicy.provider,
        modelOverride: responsePolicy.model,
      });

      const modelUsed = { provider: result.provider, model: result.model, fallbackUsed: result.fallbackUsed };
      if (result.fallbackUsed) {
        safetyEvents.push('llm_fallback');
      }

      // Validate the response doesn't leak answers/content
      const validation = await this.validateResponseWithModule(result.text.trim(), mod, conversationHistory);
      safetyEvents.push(...validation.safetyEvents);

      // Ensure response contains a question
      if (!validation.text.includes('?')) {
        const questionAppend = mod.id === 'essay'
          ? '\n\nWhat comes to mind when you think about that?'
          : '\n\nWhat do you think about this?';
        return { text: validation.text + questionAppend, safetyEvents, modelUsed };
      }

      return { text: validation.text, safetyEvents, modelUsed };

    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return { text: mod.getFallbackResponse(questionType, language), safetyEvents: ['budget_exceeded'] };
      }
      console.error(`[${mod.id}] Response generation error:`, error);
      return { text: mod.getFallbackResponse(questionType, language), safetyEvents: ['generation_error'] };
    }
  }

  // ============================================
  // RESPONSE VALIDATION
  // ============================================

  /**
   * Validate a response using the module's leak detection.
   * If a leak is detected, returns the module's fallback message.
   * For STEM, also attempts to regenerate without the answer.
   */
  private async validateResponseWithModule(response: string, mod: TutorModule, history?: Message[]): Promise<{ text: string; safetyEvents: string[] }> {
    const safetyEvents: string[] = [];
    const validation = mod.validateResponse(response);

    if (!validation.isClean) {
      console.warn(`[${mod.id}] Leak detected; using safe fallback.`);
      safetyEvents.push('answer_leak');

      // For STEM, try to regenerate without the answer
      if (mod.id === 'stem') {
        try {
          const rewritten = await this.regenerateWithoutAnswer(response, mod);
          safetyEvents.push('rewrite_attempt');
          return { text: rewritten, safetyEvents };
        } catch {
          // Fall through to fallback
        }
      }

      const fallback = mod.id === 'stem'
        ? (validation.fallbackMessage || mod.getFallbackResponse('socratic'))
        : mod.getFallbackResponse('foundational');
      const lastAssistant = history?.slice().reverse().find(m => m.role === 'ASSISTANT')?.content;
      if (lastAssistant && lastAssistant.trim() === fallback.trim()) {
        safetyEvents.push('repeat_fallback_avoided');
        return { text: mod.getFallbackResponse('foundational'), safetyEvents };
      }
      return { text: fallback, safetyEvents };
    }

    return { text: response, safetyEvents };
  }

  /**
   * Detect simple stall patterns to avoid repeating the same assistant message.
   */
  private isStalled(history: Message[]): boolean {
    const assistants = history.filter(m => m.role === 'ASSISTANT');
    if (assistants.length < 2) return false;
    const last = assistants[assistants.length - 1].content.trim().toLowerCase();
    const prev = assistants[assistants.length - 2].content.trim().toLowerCase();
    return last.length > 0 && last === prev;
  }

  /**
   * Count consecutive recent assistant turns already in high-help mode.
   */
  private countFlatTurns(history: Message[]): number {
    const assistants = history
      .filter(m => m.role === 'ASSISTANT' && m.metadata)
      .slice(-5);

    let count = 0;
    for (let i = assistants.length - 1; i >= 0; i--) {
      const qt = assistants[i].metadata?.questionType;
      if (qt === 'hint_with_question' || qt === 'foundational') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Detect behavioral signals that the student is stuck.
   */
  private detectStuck(
    history: Message[],
    currentHintLevel: number,
    userMessage: string,
    analysis: any,
    turnNumber: number
  ): boolean {
    const helpPhrases = /\b(just tell me|give up|i don'?t know|no idea|help me|i'?m stuck|show me|what'?s the answer)\b/i;

    if (helpPhrases.test(userMessage)) return true;
    if (currentHintLevel >= 4) return true;

    if (turnNumber > 2 && typeof analysis?.isAttemptShown === 'boolean' && analysis.isAttemptShown === false) {
      return true;
    }

    const recentAssistant = history
      .filter(m => m.role === 'ASSISTANT' && m.metadata)
      .slice(-2);

    if (recentAssistant.length >= 2) {
      return recentAssistant.every(m => {
        const qt = m.metadata?.questionType;
        return qt === 'hint_with_question' || qt === 'foundational';
      });
    }

    return false;
  }

  /**
   * Rewrite a leaked response into a Socratic question without giving the answer.
   * Uses Haiku for cost efficiency.
   */
  private async regenerateWithoutAnswer(originalResponse: string, mod: TutorModule): Promise<string> {
    try {
      const rewritten = await this.client.generateText({
        modelType: 'analysis',
        maxTokens: 400,
        systemPrompt: mod.systemPrompt,
        usePromptCache: true,
        messages: [{
          role: 'user',
          content: [
            'The following response accidentally gave away the answer.',
            'Rewrite it to guide the student to discover the answer themselves through questioning, without revealing the final answer:',
            '',
            originalResponse
          ].join('\n')
        }]
      });
      return rewritten.trim();
    } catch (error) {
      console.error('Regenerate without answer failed:', error);
      return mod.getFallbackResponse('socratic');
    }
  }

  // ============================================
  // KID QUEST INTRO (FIRST TURN)
  // ============================================

  /**
   * Dedicated first-turn path for kid mode quests.
   * Skips analysis entirely — the user message is the problem statement, not a student attempt.
   * Generates a "present the problem" response with [A]/[B]/[C] choices.
   */
  private async generateKidQuestIntro(input: TutorInput, mod: TutorModule): Promise<TutorResponse> {
    const { sessionId, language, conversationHistory, subject } = input;
    const problemText = this.extractProblem(conversationHistory);

    const response = await this.runResponseGeneration({
      mod,
      sessionId,
      questionType: 'attempt_prompt',
      analysis: {},
      language,
      conversationHistory,
      hintLevel: 0,
      metadata: {
        subject,
        grade: input.grade,
        problemText,
        masteryContext: input.masteryContext,
        isQuestIntro: true,
      },
    });

    const responseLanguage = mod.supportedLanguages.includes(language) ? language : mod.supportedLanguages[0];

    return {
      message: response.text,
      language: responseLanguage,
      metadata: {
        questionType: 'attempt_prompt',
        hintLevel: 0,
        conceptsIdentified: [],
        distanceFromSolution: 100,
        topic: input.topic,
        grounding: 'bank',
        confidence: 0.9,
        safetyEvents: response.safetyEvents,
        modelUsed: response.modelUsed,
      }
    };
  }

  // ============================================
  // ATTEMPT GATE LOGIC
  // ============================================

  /**
   * Determines if we should ask the student to show their work first.
   * Delegates attempt detection to the module.
   */
  private needsAttemptFirst(
    history: Message[],
    currentMessage: string,
    mod: TutorModule,
    language?: Language,
    metadata?: { grade?: number },
  ): boolean {
    const userMessages = history.filter((m) => m.role === 'USER');

    if (userMessages.length === 0) return false;
    if (userMessages.length !== 1) return false;

    // Elementary relaxation: grade <= 5 gets more leeway (shorter messages count as attempt)
    if (metadata?.grade != null && metadata.grade <= 5 && currentMessage.length >= 8) {
      return false;
    }
    return !mod.containsAttempt(currentMessage, language);
  }

  /**
   * Generate a prompt asking student to show their work.
   * Uses the module's attempt prompts.
   */
  private promptForAttempt(language: Language, mod: TutorModule, grade?: number | null): TutorResponse {
    // Use the module's attempt prompt for the given language (fallback to EN)
    let promptText = mod.attemptPrompts[language] || mod.attemptPrompts.EN || mod.attemptPrompts[Object.keys(mod.attemptPrompts)[0]];
    // Elementary kids need [A]/[B]/[C] choices so QuestScene can render them
    if (grade != null && grade <= 5) {
      promptText += '\n\n[A] I think I know!\n[B] Give me a hint\n[C] Show me how to start';
    }
    const responseLanguage = mod.supportedLanguages.includes(language) ? language : mod.supportedLanguages[0];

    return {
      message: promptText,
      language: responseLanguage,
      metadata: {
        questionType: 'attempt_prompt',
        hintLevel: 0,
        conceptsIdentified: [],
        distanceFromSolution: 100
      }
    };
  }

  // ============================================
  // BUILD TUTOR RESPONSE
  // ============================================

  /**
   * Build a TutorResponse with appropriate metadata for the module.
   */
  private buildTutorResponse(params: {
    mod: TutorModule;
    message: string;
    safetyEvents?: string[];
    language: Language;
    questionType: QuestionType;
    analysis: any;
    newHintLevel: number;
    input: TutorInput;
    detectedTopic?: string;
    modelUsed?: { provider: string; model: string; fallbackUsed: boolean };
    visualContent?: import('./types').VisualContent | null;
    adaptiveEscalation?: boolean;
    stuckDetected?: boolean;
  }): TutorResponse {
    const {
      mod,
      message,
      safetyEvents,
      language,
      questionType,
      analysis,
      newHintLevel,
      input,
      detectedTopic,
      modelUsed,
      visualContent,
      adaptiveEscalation,
      stuckDetected,
    } = params;
    const responseLanguage = mod.supportedLanguages.includes(language) ? language : mod.supportedLanguages[0];
    const grounding = detectedTopic ? 'bank' : 'reasoned';
    const confidence = this.deriveConfidence(mod.id, analysis);
    const mergedSafetyEvents = [
      ...(safetyEvents || []),
      ...(input.noFinalAnswer ? ['no_final_answer_mode'] : []),
    ];

    if (mod.id === 'essay') {
      return {
        message,
        language: responseLanguage,
        metadata: {
          questionType,
          topic: detectedTopic,
          grounding,
          confidence,
          safetyEvents: mergedSafetyEvents.length > 0 ? mergedSafetyEvents : undefined,
          essayAnalysisResult: analysis,
          hintLevel: newHintLevel,
          conceptsIdentified: [],
          distanceFromSolution: 100 - (analysis.readiness || 0),
          readiness: analysis.readiness,
          essayStrengths: analysis.strengths,
          essayGaps: analysis.gaps,
          essaySuggestedFocus: analysis.suggestedFocus,
          modelUsed,
          visualContent: visualContent || undefined,
          adaptiveEscalation,
          stuckDetected,
        }
      };
    }

    if (mod.id === 'counselor') {
      return {
        message,
        language: responseLanguage,
        metadata: {
          questionType,
          topic: detectedTopic,
          grounding,
          confidence,
          safetyEvents: mergedSafetyEvents.length > 0 ? mergedSafetyEvents : undefined,
          counselorAnalysisResult: analysis,
          hintLevel: newHintLevel,
          conceptsIdentified: [],
          distanceFromSolution: 100 - (analysis.actionability || 50),
          counselorIntent: analysis.intent,
          counselorUrgency: analysis.urgency,
          counselorSuggestedFocus: analysis.suggestedFocus,
          modelUsed,
          visualContent: visualContent || undefined,
          adaptiveEscalation,
          stuckDetected,
        }
      };
    }

    return {
      message,
      language: responseLanguage,
      metadata: {
        questionType,
        topic: detectedTopic,
        grounding,
        confidence,
        safetyEvents: mergedSafetyEvents.length > 0 ? mergedSafetyEvents : undefined,
        analysisResult: analysis,
        hintLevel: newHintLevel,
        conceptsIdentified: analysis.conceptsIdentified || [],
        distanceFromSolution: analysis.distanceFromSolution || 50,
        modelUsed,
        visualContent: visualContent || undefined,
        adaptiveEscalation,
        stuckDetected,
      }
    };
  }

  /**
   * Derive a lightweight confidence score (0-100).
   */
  private deriveConfidence(modId: string, analysis: any): number {
    if (modId === 'essay' && typeof analysis.readiness === 'number') {
      return Math.max(5, Math.min(95, analysis.readiness));
    }
    if (modId === 'counselor' && typeof analysis.actionability === 'number') {
      return Math.max(5, Math.min(95, analysis.actionability));
    }
    if (typeof analysis.distanceFromSolution === 'number') {
      return Math.max(5, Math.min(95, 100 - analysis.distanceFromSolution));
    }
    return 50;
  }

  // ============================================
  // OVERLOAD 2 HELPERS (legacy SocraticContext path)
  // ============================================

  /**
   * Lightweight attempt analysis (overload 2 path)
   */
  private async analyzeAttempt(
    userMessage: string,
    context: SocraticContext,
    sessionId?: string
  ): Promise<AttemptAnalysis> {
    const { conversationHistory, subject, language, topic } = context;
    const mod = getModule(subject);

    const { summary, recentMessages } = await getOrCreateSessionSummary(
      sessionId || 'unknown', conversationHistory, this.client
    );
    const historyText = buildHistoryText(summary, recentMessages);

    try {
      const text = await this.client.generateText({
        modelType: 'analysis',
        maxTokens: 500,
        systemPrompt: ATTEMPT_ANALYSIS_PROMPT,
        usePromptCache: true,
        messages: [{
          role: 'user',
          content: `
SUBJECT: ${subject}
LANGUAGE: ${language}

PROBLEM:
${topic || 'Not explicitly stated'}

CONVERSATION HISTORY:
${historyText}

LATEST STUDENT MESSAGE:
${userMessage}

Respond with JSON only.
          `.trim()
        }]
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in lightweight analysis response');
      }

      return JSON.parse(jsonMatch[0]) as AttemptAnalysis;
    } catch (error) {
      console.error('Lightweight analysis error:', error);
      const attemptShown = mod.containsAttempt(userMessage);
      return {
        attemptShown,
        attemptQuality: attemptShown ? 'minimal' : 'none',
        conceptsUsed: [],
        misconceptions: []
      };
    }
  }

  /**
   * Determine response strategy (overload 2 path).
   * Uses module's hint ladder for progressive hints.
   */
  private determineStrategy(
    analysis: AttemptAnalysis,
    context: SocraticContext,
    mod: TutorModule
  ): ResponseStrategy {
    if (!analysis.attemptShown) {
      return {
        type: 'request_attempt',
        promptAddition: 'Ask the student to share their first step or what they already know.'
      };
    }

    if (analysis.misconceptions.length > 0) {
      return {
        type: 'address_misconception',
        promptAddition: 'Acknowledge their effort, then ask a question targeting the misconception.',
        targetMisconception: analysis.misconceptions[0]
      };
    }

    if (analysis.attemptQuality === 'substantial') {
      return {
        type: 'guide_completion',
        promptAddition: 'Guide them to finish the final steps without giving the answer.'
      };
    }

    if (context.hintLevel > 0) {
      const hintPrompt = mod.hintLevelPrompts[context.hintLevel] || mod.hintLevelPrompts[1];
      return {
        type: 'progressive_hint',
        promptAddition: hintPrompt,
        hintLevel: context.hintLevel
      };
    }

    return {
      type: 'socratic_dialogue',
      promptAddition: 'Use a targeted Socratic question to advance their reasoning.'
    };
  }

  /**
   * Build a dynamic system prompt (overload 2 path).
   * Uses module's system prompt and language context.
   */
  private buildDynamicPrompt(
    strategy: ResponseStrategy,
    context: SocraticContext,
    mod: TutorModule
  ): string {
    const basePrompt = mod.systemPrompt;
    const langInstruction = mod.getLanguageContext(context.language);

    const strengthsText = context.knowledgeState.strengths.length > 0
      ? context.knowledgeState.strengths.join(', ')
      : 'None listed';
    const strugglesText = context.knowledgeState.struggles.length > 0
      ? context.knowledgeState.struggles.join(', ')
      : 'None listed';

    return [
      'BASE SYSTEM PROMPT',
      basePrompt,
      '',
      'SESSION CONTEXT',
      `Language: ${context.language}`,
      `Subject: ${context.subject}`,
      `Topic: ${context.topic || 'Not specified'}`,
      `Hint Level: ${context.hintLevel}`,
      '',
      'KNOWLEDGE STATE',
      `Strengths: ${strengthsText}`,
      `Struggles: ${strugglesText}`,
      '',
      'LANGUAGE INSTRUCTION',
      langInstruction,
      '',
      'STRATEGY ADDITION',
      strategy.promptAddition
    ].join('\n');
  }

  /**
   * Generate response using dynamic system prompt (overload 2 path).
   */
  private async generateResponse(
    userMessage: string,
    systemPrompt: string,
    context: SocraticContext
  ): Promise<string> {
    const historyMessages = context.conversationHistory
      .map((message) => {
        if (message.role === 'USER') {
          return { role: 'user' as const, content: message.content };
        }
        if (message.role === 'ASSISTANT') {
          return { role: 'assistant' as const, content: message.content };
        }
        return null;
      })
      .filter((message): message is { role: 'user' | 'assistant'; content: string } => message !== null);

    const messages = [
      ...historyMessages,
      { role: 'user' as const, content: userMessage }
    ];

    const generatedText = await this.client.generateText({
      modelType: 'response',
      maxTokens: 1500,
      systemPrompt,
      messages,
      usePromptCache: true,
    });
    return generatedText.trim();
  }

  /**
   * Update conversation context (overload 2 path).
   */
  private updateContext(
    context: SocraticContext,
    userMessage: string,
    response: string,
    attemptAnalysis: AttemptAnalysis,
    strategy: ResponseStrategy
  ): SocraticContext {
    let updatedContext: SocraticContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        { role: 'USER', content: userMessage, language: context.language },
        { role: 'ASSISTANT', content: response, language: context.language }
      ]
    };

    if (strategy.type === 'request_attempt') {
      updatedContext = { ...updatedContext, hintLevel: 0 };
    } else if (strategy.type === 'progressive_hint') {
      updatedContext = { ...updatedContext, hintLevel: Math.min(context.hintLevel + 1, 5) };
    }

    if (!attemptAnalysis.attemptShown && updatedContext.hintLevel > 0) {
      updatedContext = { ...updatedContext, hintLevel: 0 };
    }

    return updatedContext;
  }

  // ============================================
  // SESSION REPORT
  // ============================================

  /**
   * Generate a structured session report when a session ends.
   * Delegates to the summarizer module.
   */
  async generateSessionReport(params: {
    sessionId: string;
    messages: Message[];
    subject: Subject;
    startedAt: Date;
    essayType?: string;
    schoolName?: string;
    wordLimit?: number;
  }): Promise<SessionReport> {
    return _generateSessionReport(params, this.client);
  }

  /**
   * Generate a short quiz based on a session report.
   */
  async generateSessionQuiz(params: {
    sessionId: string;
    subject: Subject;
    language: string;
    report: SessionReport;
    count?: number;
  }): Promise<SessionQuiz> {
    return _generateSessionQuiz(params, this.client);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Extract the original problem from conversation history
   */
  private extractProblem(history: Message[]): string {
    const firstUserMessage = history.find(m => m.role === 'USER');
    return firstUserMessage?.content || '';
  }
}

// Export singleton instance
export const socraticEngine = new SocraticEngine();
