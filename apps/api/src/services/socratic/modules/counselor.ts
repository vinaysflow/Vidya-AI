/**
 * Counselor Tutor Module
 *
 * Handles: COUNSELING
 *
 * Provides multi-variant support for:
 *   - COLLEGE_US (PathWiz): US college application counseling
 *   - CAREER_INDIA (ODEE): India K-12 career exploration counseling
 *
 * Stateless: All student context is received per-request via clientContext.
 * Vidya never queries external DBs or stores PII.
 */

import type { TutorModule } from '../module';
import type { Language, QuestionType, CounselorAnalysisResult } from '../types';
import {
  COUNSELOR_SYSTEM_PROMPT,
  COLLEGE_US_OVERLAY,
  CAREER_INDIA_OVERLAY,
  COUNSELOR_HINT_LEVEL_PROMPTS,
  COUNSELOR_ATTEMPT_PROMPTS,
  getCounselorLanguageContext,
  getCounselorSystemPrompt,
  getVariantOverlay_versioned,
} from '../prompts/counselor-system';
import { COUNSELOR_ANALYSIS_PROMPT } from '../prompts/counselor-analysis';
import { getCounselorAnalysisPrompt } from '../prompts/counselor-analysis';

// ============================================
// PROMPT VERSION (read once at module load)
// ============================================

const promptVersion = (process.env.VID_PROMPT_VERSION || 'v1') as 'v1' | 'v2';

// ============================================
// INTERACTION SIGNALS (V2 only)
// ============================================

interface InteractionSignals {
  engagementQuality: 'high' | 'medium' | 'low';
  topicsCovered: string[];
  behavioralObservations: string[];
  messageCount: number;
}

// ============================================
// ATTEMPT DETECTION
// ============================================

/**
 * For counselor mode, any substantive message counts as an "attempt".
 * We don't gate on "show your work" — counseling is conversational.
 * Returns true if the message has at least a few words.
 */
function containsCounselorAttempt(message: string): boolean {
  // Any message with 2+ words is a valid counselor input
  const wordCount = message.trim().split(/\s+/).length;
  return wordCount >= 2;
}

// ============================================
// LEAK DETECTION
// ============================================

const COUNSELOR_LEAK_PATTERNS: RegExp[] = [
  // Fabricated statistics
  /acceptance rate (?:is|of|at) \d+/i,
  /\d+% (?:acceptance|admit|admission) rate/i,
  // Medical/legal advice
  /(?:you should|I recommend) (?:see|consult) a (?:doctor|psychiatrist|therapist|lawyer)/i,
  /(?:you (?:have|might have|probably have)) (?:ADHD|anxiety|depression|autism|dyslexia)/i,
  // Guarantees
  /(?:you will|you'll) (?:definitely|certainly|surely) (?:get in|be accepted|be admitted)/i,
  /(?:guaranteed|guarantee) (?:admission|acceptance|spot)/i,
  // Essay writing (should not bleed from essay module)
  /here'?s a revised/i,
  /here'?s a rewritten/i,
  /you could write:/i,
  // V2 Universal medical guardrails
  /(?:you (?:should|need to)) (?:take|use) (?:medication|prescription)/i,
  /(?:you (?:have|are|seem)) (?:bipolar|schizophreni|borderline)/i,
];

// V2 Variant-specific guardrails (checked via validateResponseWithVariant)
export const COLLEGE_US_GUARDRAILS: RegExp[] = [
  /ranked #\d+ (?:in|for|by)/i,                                          // Ranking fabrication
  /(?:you should|I recommend) (?:apply|go) (?:ED|early decision) to/i,   // ED prescriptions
  /(?:average|median|starting) salary (?:is|of) \$[\d,]+/i,             // Salary fabrication
];

export const CAREER_INDIA_GUARDRAILS: RegExp[] = [
  /(?:join|enroll in) (?:coaching|institute|academy)/i,                   // Coaching recommendations
  /(?:science|commerce|arts) (?:is|are) (?:better|best|superior)/i,      // Stream bias
  /(?:cutoff|cut-off) (?:is|will be|was) \d+/i,                         // Entrance exam cutoff fabrication
];

function validateResponse(response: string): { isClean: boolean; fallbackMessage?: string } {
  const defaultFallback = "That's a great question. Let me help you think through this — what's your biggest priority right now?";

  for (const pattern of COUNSELOR_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      console.warn(`Counselor leak pattern matched: ${pattern.source}`);
      return { isClean: false, fallbackMessage: defaultFallback };
    }
  }

  return { isClean: true };
}

/**
 * Variant-aware response validation.
 * Checks universal patterns (via validateResponse) then variant-specific patterns.
 * Use when the caller has access to the variant string.
 */
export function validateResponseWithVariant(
  response: string,
  variant?: string,
): { isClean: boolean; fallbackMessage?: string } {
  const base = validateResponse(response);
  if (!base.isClean) return base;

  const variantPatterns =
    variant === 'COLLEGE_US' ? COLLEGE_US_GUARDRAILS :
    variant === 'CAREER_INDIA' ? CAREER_INDIA_GUARDRAILS : [];

  const fallback = "That's a great question. Let me help you think through this — what's your biggest priority right now?";
  for (const pattern of variantPatterns) {
    if (pattern.test(response)) {
      console.warn(`Counselor variant guardrail matched: ${pattern.source}`);
      return { isClean: false, fallbackMessage: fallback };
    }
  }
  return { isClean: true };
}

// ============================================
// FALLBACK RESPONSES
// ============================================

const COUNSELOR_FALLBACKS: Record<string, string> = {
  clarifying: "I want to make sure I understand you correctly. Could you tell me a bit more about what you're thinking?",
  socratic: "That's an interesting point. What do you think would be the most important factor to consider here?",
  celebration: "It sounds like you've made great progress! What's the next step you're most excited about?",
  foundational: "Let's start from the beginning. What matters most to you as you think about your future?",
  hint_with_question: "I have some thoughts on this. But first — what options have you already considered?",
  encouragement: "This process can feel overwhelming, but you're doing the right thing by thinking through it carefully. What feels most manageable to tackle first?",
  attempt_prompt: COUNSELOR_ATTEMPT_PROMPTS.EN,
  default: "I'm here to help you think through this. What's on your mind?",
};

// ============================================
// CONTEXT FORMATTERS (variant-specific)
// ============================================

/**
 * Format PathWiz (COLLEGE_US) clientContext for injection into prompts.
 */
function formatCollegeUsContext(ctx: Record<string, any>): string {
  const lines: string[] = ['## STUDENT CONTEXT (COLLEGE_US)'];

  const s = ctx.studentContext;
  const grade = s?.grade || 12;
  const isUnderclassman = grade <= 10;

  if (s) {
    lines.push('### Student Profile');
    if (s.grade) lines.push(`- Grade: ${s.grade} (${s.gradeLevel || 'unknown'})`);
    if (s.gpaRange) lines.push(`- GPA Range: ${s.gpaRange[0]}–${s.gpaRange[1]}`);
    if (s.testScoreRange) {
      if (s.testScoreRange.sat) lines.push(`- SAT Range: ${s.testScoreRange.sat[0]}–${s.testScoreRange.sat[1]}`);
      if (s.testScoreRange.act) lines.push(`- ACT Range: ${s.testScoreRange.act[0]}–${s.testScoreRange.act[1]}`);
    }
    if (s.testType) lines.push(`- Test Type: ${s.testType}`);
    if (s.state) lines.push(`- State: ${s.state}`);
    if (s.residencyCountry) lines.push(`- Residency: ${s.residencyCountry}`);
    if (s.majorInterests?.length) lines.push(`- Major Interests: ${s.majorInterests.join(', ')}`);
    if (s.budget) lines.push(`- Budget: $${s.budget.toLocaleString()}`);
    if (s.firstGeneration) lines.push(`- First-Generation Student: Yes`);
    if (s.internationalStatus) lines.push(`- International Student: Yes`);
    if (s.disabilityStatus) lines.push(`- Disability/IEP: Yes${s.iepActive ? ' (IEP active)' : ''}`);
    if (s.accommodations?.length) lines.push(`- Accommodations: ${s.accommodations.join(', ')}`);
  }

  // V3: Underclassman-specific context (grades 9-10)
  const uc = ctx.underclassmanContext;
  if (uc && isUnderclassman) {
    lines.push('### Underclassman Profile');
    if (uc.courseRigor) {
      lines.push(`- Current Honors/AP Courses: ${uc.courseRigor.currentHonorsAP}`);
      if (uc.courseRigor.availableNext?.length) {
        lines.push(`- Available Next Year: ${uc.courseRigor.availableNext.join(', ')}`);
      }
    }
    if (uc.activityBreadth) {
      lines.push(`- Activities Count: ${uc.activityBreadth.count}`);
      if (uc.activityBreadth.categories?.length) {
        lines.push(`- Activity Categories: ${uc.activityBreadth.categories.join(', ')}`);
      }
    }
    if (uc.psatStatus) lines.push(`- PSAT Status: ${uc.psatStatus}`);
    if (uc.psatScore) lines.push(`- PSAT Score: ${uc.psatScore}`);
    if (uc.activityDepth) {
      if (uc.activityDepth.activities?.length) {
        lines.push(`- Key Activities: ${uc.activityDepth.activities.join(', ')}`);
      }
      lines.push(`- Leadership Roles: ${uc.activityDepth.leadershipRoles}`);
    }
    if (uc.collegePreferences) {
      const prefs = [
        uc.collegePreferences.size && `Size: ${uc.collegePreferences.size}`,
        uc.collegePreferences.location && `Location: ${uc.collegePreferences.location}`,
        uc.collegePreferences.vibe && `Vibe: ${uc.collegePreferences.vibe}`,
      ].filter(Boolean);
      if (prefs.length) lines.push(`- College Preferences: ${prefs.join(', ')}`);
    }
  }

  // Application state: omit entirely for grades 9-10 (irrelevant, avoids LLM confusion)
  const a = ctx.applicationState;
  if (a && !isUnderclassman) {
    lines.push('### Application State');
    lines.push(`- Total Applications: ${a.totalApplications}`);
    lines.push(`- Submitted: ${a.submittedCount}`);
    lines.push(`- Reach: ${a.reachCount} | Match: ${a.matchCount} | Safety: ${a.safetyCount}`);
    if (a.portfolioBalanceScore != null) lines.push(`- Portfolio Balance: ${a.portfolioBalanceScore}/100`);
    if (a.upcomingDeadlines?.length) {
      lines.push('- Upcoming Deadlines:');
      for (const d of a.upcomingDeadlines.slice(0, 5)) {
        lines.push(`  - ${d.school}: ${d.date} (${d.type})`);
      }
    }
    if (a.essaysInProgress?.length) {
      lines.push(`- Essays In Progress: ${a.essaysInProgress.length}`);
    }
  }

  const b = ctx.behavioralSignals;
  if (b) {
    lines.push('### Behavioral Signals');
    if (b.engagementLevel) lines.push(`- Engagement: ${b.engagementLevel}`);
    // Only show essay edit signal for grade 11+ (underclassmen don't write essays)
    if (b.daysSinceLastEssayEdit != null && !isUnderclassman) {
      lines.push(`- Days Since Last Essay Edit: ${b.daysSinceLastEssayEdit}`);
    }
  }

  // V2 Enriched Context (only rendered if present)
  const ex = ctx.explorationContext;
  if (ex) {
    lines.push('### Exploration Context');
    if (ex.assessmentCompleted) lines.push('- Assessment: Completed');
    if (ex.topInterests?.length) lines.push(`- Top Interests: ${ex.topInterests.join(', ')}`);
    if (ex.riasecScores) lines.push(`- RIASEC: ${JSON.stringify(ex.riasecScores)}`);
  }

  // Matching intelligence: omit for grade 9 (not relevant yet)
  const mi = ctx.matchingIntelligence;
  if (mi && grade > 9) {
    lines.push('### Matching Intelligence');
    lines.push(`- Portfolio Grade: ${mi.portfolioGrade} (${mi.portfolioBalanceScore}/100)`);
    for (const school of (mi.topSchools || []).slice(0, 5)) {
      lines.push(`- ${school.schoolName}: ${school.classification} (fit: ${school.fitScore})${school.dealBreakers?.length ? ' ⚠️ ' + school.dealBreakers.join(', ') : ''}`);
    }
  }

  const gp = ctx.goalProgress;
  if (gp) {
    lines.push('### Goal Progress');
    lines.push(`- Active: ${gp.activeGoals?.length || 0} | Completed: ${gp.completedGoalCount || 0}`);
    if (gp.stalledGoals?.length) lines.push(`- ⚠️ Stalled: ${gp.stalledGoals.join(', ')}`);
  }

  // Scholarship context: omit for grades 9-10 (not relevant yet)
  const sc = ctx.scholarshipContext;
  if (sc && !isUnderclassman) {
    lines.push('### Scholarship Context');
    lines.push(`- Matches: ${sc.matchedCount} | Potential Aid: $${(sc.totalPotentialAid || 0).toLocaleString()}`);
    if (sc.nearestDeadline) lines.push(`- Next Deadline: ${sc.nearestDeadline}`);
  }

  const nc = ctx.narrativeContext;
  if (nc?.positioningStatement) {
    lines.push('### Narrative');
    lines.push(`- Statement: ${nc.positioningStatement}`);
    if (nc.themes?.length) lines.push(`- Themes: ${nc.themes.join(', ')}`);
  }

  // V3: Counseling preferences (tone calibration from gradeMessaging)
  const cp = ctx.counselingPreferences;
  if (cp) {
    lines.push('### Counseling Calibration');
    lines.push(`- Tone: ${cp.tone}`);
    lines.push(`- Show Alternatives: ${cp.showAlternatives}`);
    lines.push(`- Emphasize Timeline: ${cp.emphasizeTimeline}`);
    lines.push(`- Years Remaining: ${cp.yearsRemaining}`);
  }

  return lines.join('\n');
}

/**
 * Format ODEE (CAREER_INDIA) clientContext for injection into prompts.
 */
function formatCareerIndiaContext(ctx: Record<string, any>): string {
  const lines: string[] = ['## STUDENT CONTEXT (CAREER_INDIA)'];

  if (ctx.bucket) lines.push(`- Career Exploration Stage: ${ctx.bucket}`);
  if (ctx.careerGoal) lines.push(`- Career Goal: ${ctx.careerGoal}`);

  if (ctx.riasecProfile) {
    lines.push('### RIASEC Profile');
    if (typeof ctx.riasecProfile === 'object') {
      for (const [key, value] of Object.entries(ctx.riasecProfile)) {
        lines.push(`- ${key}: ${value}`);
      }
    } else {
      lines.push(`- Profile: ${ctx.riasecProfile}`);
    }
  }

  if (ctx.streamHint) lines.push(`- Stream Hint: ${ctx.streamHint}`);

  if (ctx.gapAnalysis) {
    lines.push('### Gap Analysis');
    if (typeof ctx.gapAnalysis === 'object') {
      if (ctx.gapAnalysis.strengths) lines.push(`- Strengths: ${JSON.stringify(ctx.gapAnalysis.strengths)}`);
      if (ctx.gapAnalysis.gaps) lines.push(`- Gaps: ${JSON.stringify(ctx.gapAnalysis.gaps)}`);
      if (ctx.gapAnalysis.recommendations) lines.push(`- Recommendations: ${JSON.stringify(ctx.gapAnalysis.recommendations)}`);
    } else {
      lines.push(`- ${ctx.gapAnalysis}`);
    }
  }

  if (ctx.evidenceSummary) lines.push(`- Evidence Summary: ${typeof ctx.evidenceSummary === 'object' ? JSON.stringify(ctx.evidenceSummary) : ctx.evidenceSummary}`);
  if (ctx.careersExploredCount != null) lines.push(`- Careers Explored: ${ctx.careersExploredCount}`);

  if (ctx.activeModeEvents?.length) {
    lines.push('### Recent Activity');
    for (const event of ctx.activeModeEvents.slice(0, 5)) {
      lines.push(`- ${typeof event === 'object' ? JSON.stringify(event) : event}`);
    }
  }

  if (ctx.familyContext) {
    lines.push('### Family Context');
    if (typeof ctx.familyContext === 'object') {
      for (const [key, value] of Object.entries(ctx.familyContext)) {
        lines.push(`- ${key}: ${value}`);
      }
    } else {
      lines.push(`- ${ctx.familyContext}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format clientContext based on variant.
 */
function formatClientContext(clientContext: Record<string, any> | undefined, variant: string | undefined): string {
  if (!clientContext) return '';

  let formatted: string;

  if (variant === 'COLLEGE_US') {
    formatted = formatCollegeUsContext(clientContext);
  } else if (variant === 'CAREER_INDIA') {
    formatted = formatCareerIndiaContext(clientContext);
  } else {
    // Unknown variant — dump as JSON for safety
    formatted = `## STUDENT CONTEXT (${variant || 'UNKNOWN'})\n${JSON.stringify(clientContext, null, 2)}`;
  }

  // Graph summary (available for ALL variants)
  const gs = clientContext.graphSummary;
  if (gs) {
    formatted += '\n### Behavioral Profile (Identity Graph)';
    formatted += `\n- Engagement: ${gs.engagementScore}/100`;
    formatted += `\n- Interactions: ${gs.interactionCount}`;
    if (gs.topicsDiscussed?.length) formatted += `\n- Topics: ${gs.topicsDiscussed.slice(-5).join(', ')}`;
    if (gs.procrastinationSignals?.length) formatted += `\n- ⚠️ Procrastination: ${gs.procrastinationSignals.join(', ')}`;
    formatted += `\n- Nudge Preference: ${gs.nudgePreference || 'unknown'}`;
  }

  return formatted;
}

/**
 * Get the variant-specific system prompt overlay.
 */
function getVariantOverlay(variant: string | undefined): string {
  return getVariantOverlay_versioned(variant, promptVersion);
}

// ============================================
// COUNSELING STAGE DERIVATION
// ============================================

/**
 * Derive the counseling stage from context and variant.
 * Returns undefined for unknown variants (safe: all downstream skips stage logic).
 *
 * COLLEGE_US stages: discoverer (9), builder (10), strategist (11),
 *   executor (12 pre-submit), navigator (12 post-submit, >=50% apps submitted)
 * CAREER_INDIA stages: foundation_builder (FORMATIVE / gr 5-7),
 *   path_explorer (TRANSITIONAL / gr 8-9), exam_strategist (EXECUTIONAL / gr 10-12)
 */
export function deriveCounselingStage(
  context: Record<string, any> | undefined,
  variant: string | undefined,
): string | undefined {
  if (!context || !variant) return undefined;

  if (variant === 'COLLEGE_US') {
    const grade = context.studentContext?.grade;
    if (!grade) return undefined;
    if (grade === 9) return 'discoverer';
    if (grade === 10) return 'builder';
    if (grade === 11) return 'strategist';
    // Grade 12: check if applications submitted
    const submitted = context.applicationState?.submittedCount || 0;
    const total = context.applicationState?.totalApplications || 0;
    if (submitted > 0 && submitted >= total * 0.5) return 'navigator';
    return 'executor';
  }

  if (variant === 'CAREER_INDIA') {
    const bucket = context.bucket;
    const grade = context.grade || context.studentContext?.grade;
    if (bucket === 'FORMATIVE' || (grade && grade >= 5 && grade <= 7)) return 'foundation_builder';
    if (bucket === 'TRANSITIONAL' || (grade && grade >= 8 && grade <= 9)) return 'path_explorer';
    if (bucket === 'EXECUTIONAL' || (grade && grade >= 10 && grade <= 12)) return 'exam_strategist';
    return undefined;
  }

  return undefined;
}

// ============================================
// PRE-PROCESS HOOK
// ============================================

function preProcessAnalysis(params: {
  studentMessage: string;
  conversationHistory: any[];
  metadata?: Record<string, any>;
}): { additionalContext?: string; cacheKey?: string } {
  const { metadata } = params;
  const clientContext = metadata?.clientContext;
  const variant = metadata?.variant;

  if (!clientContext) return {};

  // Inject a summary of the client context into the analysis prompt
  const contextSummary = formatClientContext(clientContext, variant);

  // Derive counseling stage — prefer client-side stage (more granular) over server-derived
  const clientStage = clientContext.counselingStage;
  const serverStage = deriveCounselingStage(clientContext, variant);
  const stage = clientStage || serverStage;
  const stageContext = stage ? `\nCOUNSELING STAGE: ${stage}` : '';

  return {
    additionalContext: `${contextSummary}${stageContext}\n\nUse this context to determine relevantContextAreas and suggestedFocus.`,
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
  const { studentMessage, historyText, metadata } = params;
  const variant = metadata?.variant || 'UNKNOWN';

  return `
VARIANT: ${variant}

CONVERSATION HISTORY:
${historyText}

LATEST STUDENT MESSAGE:
${studentMessage}

Analyze this counseling message and respond with JSON only.
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
  const a = analysis as CounselorAnalysisResult;

  const counselorInstructions: Record<string, string> = {
    attempt_prompt: 'Welcome the student and ask what they would like to explore or discuss today.',
    clarifying: `Ask a clarifying question to better understand their situation. Focus on: "${a.suggestedFocus}".`,
    socratic: `Ask ONE Socratic question that helps the student think critically about: "${a.suggestedFocus}". Guide, don't prescribe.`,
    hint_with_question: `Gently point them toward thinking about "${a.suggestedFocus}" and ask a guiding question. Don't give the answer directly.`,
    foundational: `The student seems early in their thinking. Help them articulate: "${a.suggestedFocus}". Be warm and encouraging.`,
    celebration: 'Acknowledge their progress and ask what they want to focus on next.',
    encouragement: `The student seems ${a.sentimentTone || 'anxious'}. Validate their feelings, then ask a simpler, more manageable question about their situation.`,
  };

  return `
CONVERSATION HISTORY:
${historyText}

TASK: ${counselorInstructions[questionType] || counselorInstructions.socratic}

CRITICAL RULES:
1. ONE question only (do not overwhelm)
2. Maximum 3-4 sentences
3. NEVER fabricate statistics, acceptance rates, or deadlines
4. Be warm, professional, and encouraging
5. Use counseling language — not STEM or essay-coaching language
6. Drive toward ACTION when appropriate

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
  const a = analysis as CounselorAnalysisResult;
  const { intent, urgency, actionability } = a;

  let questionType: QuestionType;
  let newHintLevel = currentHintLevel;

  // High urgency → be more direct
  if (urgency === 'high') {
    questionType = 'hint_with_question';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  }
  // Greeting → welcome
  else if (intent === 'greeting') {
    questionType = 'clarifying';
  }
  // Concern/anxious → encouragement
  else if (intent === 'concern' || a.sentimentTone === 'anxious' || a.sentimentTone === 'frustrated') {
    questionType = 'encouragement';
  }
  // Update with high actionability → celebration/socratic
  else if (intent === 'update' && actionability >= 70) {
    questionType = 'celebration';
  }
  // Exploration → foundational or socratic
  else if (intent === 'exploration') {
    questionType = actionability >= 50 ? 'socratic' : 'foundational';
  }
  // Reflection → socratic
  else if (intent === 'reflection') {
    questionType = 'socratic';
  }
  // Default: question → socratic
  else {
    questionType = 'socratic';
  }

  // Stage-aware adjustments (V2 — skip if no stage)
  if (a.counselingStage === 'discoverer') {
    // Grade 9: bias strongly toward foundational, exploratory questions
    if (questionType === 'hint_with_question') questionType = 'socratic';
  }
  if (a.counselingStage === 'builder') {
    // Grade 10: similar to discoverer but allow slightly more structure
    if (questionType === 'hint_with_question') questionType = 'socratic';
  }
  if (a.counselingStage === 'explorer') {
    // Legacy: treat as discoverer for backward compatibility
    if (questionType === 'hint_with_question') questionType = 'socratic';
  }
  if (a.counselingStage === 'executor') {
    // Bias toward direct guidance and accountability
    if (questionType === 'foundational') questionType = 'hint_with_question';
    newHintLevel = Math.min(currentHintLevel + 1, 5);
  }

  return { questionType, newHintLevel };
}

// ============================================
// INTERACTION SIGNALS COMPUTATION (V2 only)
// ============================================

/**
 * Compute interaction signals from a counselor analysis result.
 * Only active when VID_PROMPT_VERSION=v2. Returns undefined for V1.
 * These signals are returned in TutorResponse.metadata for the client
 * to feed back into the Identity Graph.
 */
export function computeInteractionSignals(
  analysis: CounselorAnalysisResult,
  messageCount: number,
): InteractionSignals | undefined {
  const version = process.env.VID_PROMPT_VERSION || 'v1';
  if (version !== 'v2') return undefined;

  return {
    engagementQuality:
      analysis.actionability >= 70 ? 'high' :
      analysis.actionability >= 40 ? 'medium' : 'low',
    topicsCovered: analysis.relevantContextAreas || [],
    behavioralObservations: [
      `intent:${analysis.intent}`,
      `sentiment:${analysis.sentimentTone}`,
      `urgency:${analysis.urgency}`,
    ],
    messageCount,
  };
}

// ============================================
// MODULE DEFINITION
// ============================================

export const counselorModule: TutorModule = {
  id: 'counselor',
  subjects: ['COUNSELING'],
  supportedLanguages: ['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH'],

  systemPrompt: getCounselorSystemPrompt(promptVersion),
  analysisPrompt: getCounselorAnalysisPrompt(promptVersion),
  hintLevelPrompts: COUNSELOR_HINT_LEVEL_PROMPTS,
  attemptPrompts: COUNSELOR_ATTEMPT_PROMPTS,

  containsAttempt: containsCounselorAttempt,
  leakPatterns: COUNSELOR_LEAK_PATTERNS,
  validateResponse,
  getFallbackResponse: (questionType: string) => {
    return COUNSELOR_FALLBACKS[questionType] || COUNSELOR_FALLBACKS.default;
  },
  getLanguageContext: (language) => getCounselorLanguageContext(language),

  preProcessAnalysis,
  maxResponseTokens: 400,

  buildResponseSystemAddendum: (analysis: any, metadata?: Record<string, any>) => {
    const a = analysis as CounselorAnalysisResult;
    const variant = metadata?.variant;
    const clientContext = metadata?.clientContext;
    const hintLevel = metadata?.hintLevel || 0;

    // Build variant overlay
    const variantOverlay = getVariantOverlay(variant);

    // Build client context section
    const contextSection = formatClientContext(clientContext, variant);

    // Build hint text
    const hintText = hintLevel > 0
      ? `\nHINT LEVEL: ${hintLevel}/5\n${COUNSELOR_HINT_LEVEL_PROMPTS[hintLevel] || COUNSELOR_HINT_LEVEL_PROMPTS[1]}`
      : '';

    // V2: profileUpdateSuggestion reengineering rules
    let reengineeringSection = '';
    if (promptVersion === 'v2' && (a as any).profileUpdateSuggestion) {
      const s = (a as any).profileUpdateSuggestion;
      reengineeringSection = `

### PROFILE UPDATE DETECTED
The student appears to have shared new information about ${s.fieldKey}.
Current: ${s.currentValue ?? 'unknown'} → Suggested: ${s.suggestedValue}
Confidence: ${s.confidence}

YOUR TASK: Acknowledge this new information naturally. Then explain what impact
this change would have on their situation (e.g., how it affects school matching,
essay strategy, or timeline). Ask the student to confirm before any changes
are applied. Use probability language, not guarantees.`;
    }

    return `
${variantOverlay}

${contextSection}

### Analysis Results
- Student Intent: ${a.intent || 'unknown'}
- Urgency: ${a.urgency || 'medium'}
- Sentiment: ${a.sentimentTone || 'neutral'}
- Actionability: ${a.actionability ?? 50}/100
- Suggested Focus: ${a.suggestedFocus || 'general guidance'}
- Relevant Context Areas: ${a.relevantContextAreas?.join(', ') || 'none identified'}
${hintText}

RESPONSE TYPE GUIDE:
- clarifying: Ask a question to understand their situation better
- socratic: Ask ONE probing question that helps them think critically
- hint_with_question: Point to a specific area and ask a guiding question
- foundational: Help them articulate their basic priorities or goals
- celebration: Acknowledge progress, then ask about next steps
- encouragement: Validate their feelings, then ask a manageable question${reengineeringSection}`;
  },

  buildResponseUserPrompt,
  buildAnalysisUserPrompt,
  mapAnalysisToStrategy,
};
