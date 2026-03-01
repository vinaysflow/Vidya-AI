/**
 * Counselor Module Unit Tests
 *
 * Tests the counselor TutorModule implementation in isolation.
 * No LLM calls, no database, no network — pure logic.
 *
 * Coverage:
 * - Module registration and identity
 * - Attempt detection (always true for 2+ word messages)
 * - Leak detection (fabricated stats, guarantees, medical advice)
 * - Response validation
 * - Strategy mapping (intent/urgency → question type)
 * - Context formatting (COLLEGE_US + CAREER_INDIA)
 * - buildResponseSystemAddendum (variant overlay injection)
 * - preProcessAnalysis (context injection into analysis)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  counselorModule,
  computeInteractionSignals,
  deriveCounselingStage,
  validateResponseWithVariant,
  COLLEGE_US_GUARDRAILS,
  CAREER_INDIA_GUARDRAILS,
} from '../counselor';
import {
  COUNSELOR_SYSTEM_PROMPT,
  COLLEGE_US_OVERLAY,
  CAREER_INDIA_OVERLAY,
  getCounselorSystemPrompt,
  getVariantOverlay_versioned,
} from '../../prompts/counselor-system';
import {
  COUNSELOR_ANALYSIS_PROMPT,
  getCounselorAnalysisPrompt,
} from '../../prompts/counselor-analysis';

// ============================================
// MODULE IDENTITY
// ============================================

describe('counselorModule identity', () => {
  it('has correct id', () => {
    expect(counselorModule.id).toBe('counselor');
  });

  it('handles COUNSELING subject', () => {
    expect(counselorModule.subjects).toEqual(['COUNSELING']);
  });

  it('supports EN language', () => {
    expect(counselorModule.supportedLanguages).toContain('EN');
  });

  it('has a system prompt', () => {
    expect(counselorModule.systemPrompt.length).toBeGreaterThan(100);
    expect(counselorModule.systemPrompt).toContain('Vidya');
  });

  it('has an analysis prompt', () => {
    expect(counselorModule.analysisPrompt.length).toBeGreaterThan(100);
    expect(counselorModule.analysisPrompt).toContain('intent');
  });

  it('has hint level prompts 1-5', () => {
    for (let i = 1; i <= 5; i++) {
      expect(counselorModule.hintLevelPrompts[i]).toBeDefined();
      expect(counselorModule.hintLevelPrompts[i].length).toBeGreaterThan(10);
    }
  });

  it('sets maxResponseTokens to 400', () => {
    expect(counselorModule.maxResponseTokens).toBe(400);
  });
});

// ============================================
// ATTEMPT DETECTION
// ============================================

describe('containsAttempt', () => {
  it('returns true for normal conversational messages', () => {
    expect(counselorModule.containsAttempt('What schools should I apply to?')).toBe(true);
    expect(counselorModule.containsAttempt('I am worried about deadlines')).toBe(true);
    expect(counselorModule.containsAttempt('Hello there')).toBe(true);
  });

  it('returns false for single-word messages', () => {
    expect(counselorModule.containsAttempt('Hi')).toBe(false);
    expect(counselorModule.containsAttempt('ok')).toBe(false);
  });

  it('returns false for empty messages', () => {
    expect(counselorModule.containsAttempt('')).toBe(false);
    expect(counselorModule.containsAttempt('   ')).toBe(false);
  });
});

// ============================================
// LEAK DETECTION
// ============================================

describe('leak detection', () => {
  it('detects fabricated acceptance rates', () => {
    const result = counselorModule.validateResponse(
      'Stanford has an acceptance rate of 3.5% this year.'
    );
    expect(result.isClean).toBe(false);
  });

  it('detects percentage acceptance rates', () => {
    const result = counselorModule.validateResponse(
      'With a 15% acceptance rate, this is a reach school.'
    );
    expect(result.isClean).toBe(false);
  });

  it('detects guarantee language', () => {
    const result = counselorModule.validateResponse(
      "You will definitely get in to your safety school."
    );
    expect(result.isClean).toBe(false);
  });

  it('detects guaranteed admission', () => {
    const result = counselorModule.validateResponse(
      'I can offer you a guaranteed admission to this program.'
    );
    expect(result.isClean).toBe(false);
  });

  it('detects medical diagnoses', () => {
    const result = counselorModule.validateResponse(
      'Based on what you described, you might have ADHD.'
    );
    expect(result.isClean).toBe(false);
  });

  it('passes clean counselor responses', () => {
    const result = counselorModule.validateResponse(
      "That's a thoughtful approach! Given your interest in computer science, what specific programs have caught your attention?"
    );
    expect(result.isClean).toBe(true);
  });

  it('passes responses with probability framing', () => {
    const result = counselorModule.validateResponse(
      'Based on your profile, this school would generally be considered a reach for most applicants. What draws you to it specifically?'
    );
    expect(result.isClean).toBe(true);
  });

  it('provides fallback message on leak', () => {
    const result = counselorModule.validateResponse(
      'Stanford has an acceptance rate of 3.5%.'
    );
    expect(result.fallbackMessage).toBeDefined();
    expect(result.fallbackMessage!.length).toBeGreaterThan(0);
  });
});

// ============================================
// FALLBACK RESPONSES
// ============================================

describe('getFallbackResponse', () => {
  it('returns a response for each question type', () => {
    const types = ['clarifying', 'socratic', 'celebration', 'foundational', 'hint_with_question', 'encouragement'];
    for (const type of types) {
      const response = counselorModule.getFallbackResponse(type);
      expect(response.length).toBeGreaterThan(10);
      expect(response).toContain('?'); // Should contain a question
    }
  });

  it('returns a default for unknown types', () => {
    const response = counselorModule.getFallbackResponse('nonexistent_type');
    expect(response.length).toBeGreaterThan(0);
  });
});

// ============================================
// STRATEGY MAPPING
// ============================================

describe('mapAnalysisToStrategy', () => {
  const map = counselorModule.mapAnalysisToStrategy!;

  it('maps high urgency to hint_with_question', () => {
    const result = map(
      { intent: 'question', urgency: 'high', actionability: 50, sentimentTone: 'neutral', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('hint_with_question');
    expect(result.newHintLevel).toBe(1);
  });

  it('maps greeting to clarifying', () => {
    const result = map(
      { intent: 'greeting', urgency: 'low', actionability: 20, sentimentTone: 'neutral', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('clarifying');
  });

  it('maps concern/anxious to encouragement', () => {
    const result = map(
      { intent: 'concern', urgency: 'medium', actionability: 30, sentimentTone: 'anxious', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('encouragement');
  });

  it('maps frustrated tone to encouragement', () => {
    const result = map(
      { intent: 'question', urgency: 'low', actionability: 50, sentimentTone: 'frustrated', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('encouragement');
  });

  it('maps high-actionability update to celebration', () => {
    const result = map(
      { intent: 'update', urgency: 'low', actionability: 80, sentimentTone: 'positive', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('celebration');
  });

  it('maps exploration with low actionability to foundational', () => {
    const result = map(
      { intent: 'exploration', urgency: 'low', actionability: 30, sentimentTone: 'neutral', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('foundational');
  });

  it('maps exploration with high actionability to socratic', () => {
    const result = map(
      { intent: 'exploration', urgency: 'low', actionability: 70, sentimentTone: 'neutral', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('socratic');
  });

  it('maps reflection to socratic', () => {
    const result = map(
      { intent: 'reflection', urgency: 'low', actionability: 40, sentimentTone: 'neutral', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('socratic');
  });

  it('maps generic question to socratic', () => {
    const result = map(
      { intent: 'question', urgency: 'low', actionability: 50, sentimentTone: 'neutral', relevantContextAreas: [], suggestedFocus: '' },
      0
    );
    expect(result.questionType).toBe('socratic');
  });
});

// ============================================
// CONTEXT FORMATTING (via buildResponseSystemAddendum)
// ============================================

describe('buildResponseSystemAddendum', () => {
  const build = counselorModule.buildResponseSystemAddendum!;

  const mockAnalysis = {
    intent: 'question',
    urgency: 'medium',
    sentimentTone: 'neutral',
    actionability: 60,
    suggestedFocus: 'school list balance',
    relevantContextAreas: ['applications', 'deadlines'],
  };

  it('injects COLLEGE_US overlay for PathWiz', () => {
    const result = build(mockAnalysis, {
      variant: 'COLLEGE_US',
      clientContext: {
        studentContext: {
          grade: 11,
          gradeLevel: 'junior',
          gpaRange: [3.5, 4.0],
          majorInterests: ['Computer Science'],
          firstGeneration: true,
        },
        applicationState: {
          totalApplications: 8,
          submittedCount: 2,
          reachCount: 3,
          matchCount: 3,
          safetyCount: 2,
          portfolioBalanceScore: 75,
          upcomingDeadlines: [{ school: 'Stanford', date: '2026-01-02', type: 'RD' }],
        },
      },
    });

    expect(result).toContain('US College Application Counselor');
    expect(result).toContain('STUDENT CONTEXT (COLLEGE_US)');
    expect(result).toContain('Grade: 11');
    expect(result).toContain('GPA Range: 3.5–4');
    expect(result).toContain('Computer Science');
    expect(result).toContain('First-Generation Student: Yes');
    expect(result).toContain('Total Applications: 8');
    expect(result).toContain('Stanford');
    expect(result).toContain('school list balance');
  });

  it('injects CAREER_INDIA overlay for ODEE', () => {
    const result = build(mockAnalysis, {
      variant: 'CAREER_INDIA',
      clientContext: {
        bucket: 'EXPLORATION',
        careerGoal: 'Software Engineering',
        riasecProfile: { Investigative: 8, Artistic: 6, Realistic: 5 },
        streamHint: 'Science',
        gapAnalysis: { strengths: ['math', 'logic'], gaps: ['communication'] },
        familyContext: { expectation: 'engineering', income_bracket: 'middle' },
        careersExploredCount: 5,
      },
    });

    expect(result).toContain('India K-12 Career Exploration Counselor');
    expect(result).toContain('STUDENT CONTEXT (CAREER_INDIA)');
    expect(result).toContain('EXPLORATION');
    expect(result).toContain('Software Engineering');
    expect(result).toContain('Investigative');
    expect(result).toContain('Science');
    expect(result).toContain('Family Context');
    expect(result).toContain('engineering');
  });

  it('works without clientContext', () => {
    const result = build(mockAnalysis, { variant: 'COLLEGE_US' });
    expect(result).toContain('US College Application Counselor');
    expect(result).toContain('Analysis Results');
    expect(result).toContain('school list balance');
  });

  it('includes hint level when present', () => {
    const result = build(mockAnalysis, { variant: 'COLLEGE_US', hintLevel: 3 });
    expect(result).toContain('HINT LEVEL: 3/5');
  });

  it('does not include hint level at 0', () => {
    const result = build(mockAnalysis, { variant: 'COLLEGE_US', hintLevel: 0 });
    expect(result).not.toContain('HINT LEVEL:');
  });
});

// ============================================
// PRE-PROCESS ANALYSIS
// ============================================

describe('preProcessAnalysis', () => {
  const preProcess = counselorModule.preProcessAnalysis!;

  it('injects client context summary for COLLEGE_US', () => {
    const result = preProcess({
      studentMessage: 'Should I apply early decision?',
      conversationHistory: [],
      metadata: {
        variant: 'COLLEGE_US',
        clientContext: {
          studentContext: { grade: 12, gradeLevel: 'senior' },
          applicationState: { totalApplications: 10 },
        },
      },
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain('COLLEGE_US');
    expect(result.additionalContext).toContain('Grade: 12');
  });

  it('injects client context summary for CAREER_INDIA', () => {
    const result = preProcess({
      studentMessage: 'Which stream should I pick?',
      conversationHistory: [],
      metadata: {
        variant: 'CAREER_INDIA',
        clientContext: {
          bucket: 'NARROWING',
          streamHint: 'Commerce',
        },
      },
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain('CAREER_INDIA');
    expect(result.additionalContext).toContain('Commerce');
  });

  it('returns empty when no clientContext', () => {
    const result = preProcess({
      studentMessage: 'Hello',
      conversationHistory: [],
      metadata: {},
    });

    expect(result.additionalContext).toBeUndefined();
  });
});

// ============================================
// PROMPT BUILDERS
// ============================================

describe('buildAnalysisUserPrompt', () => {
  const buildPrompt = counselorModule.buildAnalysisUserPrompt!;

  it('includes variant and student message', () => {
    const result = buildPrompt({
      problem: '',
      studentMessage: 'I need help with my school list',
      historyText: 'Previous conversation...',
      subject: 'COUNSELING',
      language: 'EN',
      metadata: { variant: 'COLLEGE_US' },
    });

    expect(result).toContain('COLLEGE_US');
    expect(result).toContain('I need help with my school list');
    expect(result).toContain('Previous conversation');
  });
});

describe('buildResponseUserPrompt', () => {
  const buildPrompt = counselorModule.buildResponseUserPrompt!;

  it('includes counselor-specific instructions', () => {
    const result = buildPrompt({
      questionType: 'socratic',
      analysis: {
        suggestedFocus: 'school list balance',
        sentimentTone: 'neutral',
      },
      language: 'EN' as any,
      historyText: 'Student: I want to apply to 15 schools',
      metadata: {},
    });

    expect(result).toContain('school list balance');
    expect(result).toContain('NEVER fabricate');
    expect(result).toContain('ONE question only');
  });
});

// ============================================
// V2 ENRICHED CONTEXT FORMATTERS (REGRESSION)
// ============================================

describe('V2 enriched context formatters', () => {
  const build = counselorModule.buildResponseSystemAddendum!;

  const mockAnalysis = {
    intent: 'question',
    urgency: 'medium',
    sentimentTone: 'neutral',
    actionability: 60,
    suggestedFocus: 'school list balance',
    relevantContextAreas: ['applications', 'deadlines'],
  };

  const v1OnlyContext = {
    studentContext: {
      grade: 11,
      gradeLevel: 'junior',
      gpaRange: [3.5, 4.0],
      majorInterests: ['Computer Science'],
    },
    applicationState: {
      totalApplications: 8,
      submittedCount: 2,
      reachCount: 3,
      matchCount: 3,
      safetyCount: 2,
    },
    behavioralSignals: {
      engagementLevel: 'high',
      daysSinceLastEssayEdit: 3,
    },
  };

  it('V1-only context produces no V2 sections', () => {
    const result = build(mockAnalysis, {
      variant: 'COLLEGE_US',
      clientContext: v1OnlyContext,
    });

    // V1 content present
    expect(result).toContain('Grade: 11');
    expect(result).toContain('Total Applications: 8');

    // V2 sections absent
    expect(result).not.toContain('Exploration Context');
    expect(result).not.toContain('Matching Intelligence');
    expect(result).not.toContain('Goal Progress');
    expect(result).not.toContain('Scholarship Context');
    expect(result).not.toContain('Narrative');
  });

  it('explorationContext renders Exploration Context section', () => {
    const result = build(mockAnalysis, {
      variant: 'COLLEGE_US',
      clientContext: {
        ...v1OnlyContext,
        explorationContext: {
          assessmentCompleted: true,
          topInterests: ['STEM', 'Medicine'],
          riasecScores: { I: 8, A: 5 },
        },
      },
    });

    expect(result).toContain('Exploration Context');
    expect(result).toContain('Assessment: Completed');
    expect(result).toContain('Top Interests: STEM, Medicine');
    expect(result).toContain('RIASEC:');
  });

  it('matchingIntelligence renders school names and fit scores', () => {
    const result = build(mockAnalysis, {
      variant: 'COLLEGE_US',
      clientContext: {
        ...v1OnlyContext,
        matchingIntelligence: {
          portfolioGrade: 'B+',
          portfolioBalanceScore: 72,
          topSchools: [
            {
              schoolName: 'MIT',
              schoolId: 'mit-1',
              classification: 'reach',
              fitScore: 68,
              dimensions: {},
              dealBreakers: ['No financial aid for internationals'],
              explanation: 'Strong STEM fit',
            },
            {
              schoolName: 'Georgia Tech',
              schoolId: 'gt-1',
              classification: 'match',
              fitScore: 82,
              dimensions: {},
              dealBreakers: [],
              explanation: 'Good match',
            },
          ],
        },
      },
    });

    expect(result).toContain('Matching Intelligence');
    expect(result).toContain('Portfolio Grade: B+ (72/100)');
    expect(result).toContain('MIT: reach (fit: 68)');
    expect(result).toContain('No financial aid for internationals');
    expect(result).toContain('Georgia Tech: match (fit: 82)');
  });

  it('undefined V2 fields cause no crash and no extra sections', () => {
    const result = build(mockAnalysis, {
      variant: 'COLLEGE_US',
      clientContext: {
        ...v1OnlyContext,
        explorationContext: undefined,
        matchingIntelligence: undefined,
        goalProgress: undefined,
        scholarshipContext: undefined,
        narrativeContext: undefined,
      },
    });

    expect(result).toContain('Grade: 11');
    expect(result).not.toContain('Exploration Context');
    expect(result).not.toContain('Matching Intelligence');
    expect(result).not.toContain('Goal Progress');
    expect(result).not.toContain('Scholarship Context');
    expect(result).not.toContain('Narrative');
  });

  it('graphSummary renders Behavioral Profile for COLLEGE_US', () => {
    const result = build(mockAnalysis, {
      variant: 'COLLEGE_US',
      clientContext: {
        ...v1OnlyContext,
        graphSummary: {
          engagementScore: 85,
          interactionCount: 12,
          topicsDiscussed: ['school list', 'essays', 'scholarships'],
          procrastinationSignals: ['missed essay deadline'],
          nudgePreference: 'direct',
        },
      },
    });

    expect(result).toContain('Behavioral Profile (Identity Graph)');
    expect(result).toContain('Engagement: 85/100');
    expect(result).toContain('Interactions: 12');
    expect(result).toContain('Topics: school list, essays, scholarships');
    expect(result).toContain('Procrastination: missed essay deadline');
    expect(result).toContain('Nudge Preference: direct');
  });
});

// ============================================
// computeInteractionSignals
// ============================================

describe('computeInteractionSignals', () => {
  const mockAnalysis = {
    intent: 'question' as const,
    urgency: 'medium' as const,
    sentimentTone: 'neutral' as const,
    actionability: 75,
    suggestedFocus: 'school list',
    relevantContextAreas: ['applications', 'deadlines'],
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns undefined when VID_PROMPT_VERSION is v1', () => {
    vi.stubEnv('VID_PROMPT_VERSION', 'v1');
    const result = computeInteractionSignals(mockAnalysis, 5);
    expect(result).toBeUndefined();
  });

  it('returns valid signals when VID_PROMPT_VERSION is v2', () => {
    vi.stubEnv('VID_PROMPT_VERSION', 'v2');
    const result = computeInteractionSignals(mockAnalysis, 8);

    expect(result).toBeDefined();
    expect(result!.engagementQuality).toBe('high'); // actionability 75 >= 70
    expect(result!.topicsCovered).toEqual(['applications', 'deadlines']);
    expect(result!.behavioralObservations).toContain('intent:question');
    expect(result!.behavioralObservations).toContain('sentiment:neutral');
    expect(result!.behavioralObservations).toContain('urgency:medium');
    expect(result!.messageCount).toBe(8);
  });
});

// ============================================
// COUNSELING STAGE DERIVATION
// ============================================

describe('deriveCounselingStage', () => {
  it('COLLEGE_US grade 9 → discoverer', () => {
    const result = deriveCounselingStage(
      { studentContext: { grade: 9 } },
      'COLLEGE_US',
    );
    expect(result).toBe('discoverer');
  });

  it('COLLEGE_US grade 10 → builder', () => {
    const result = deriveCounselingStage(
      { studentContext: { grade: 10 } },
      'COLLEGE_US',
    );
    expect(result).toBe('builder');
  });

  it('COLLEGE_US grade 11 → strategist', () => {
    const result = deriveCounselingStage(
      { studentContext: { grade: 11 } },
      'COLLEGE_US',
    );
    expect(result).toBe('strategist');
  });

  it('COLLEGE_US grade 12: navigator when ≥50% submitted, executor otherwise', () => {
    // 8/10 submitted → navigator
    const nav8 = deriveCounselingStage(
      {
        studentContext: { grade: 12 },
        applicationState: { submittedCount: 8, totalApplications: 10 },
      },
      'COLLEGE_US',
    );
    expect(nav8).toBe('navigator');

    // 6/10 submitted → navigator
    const nav6 = deriveCounselingStage(
      {
        studentContext: { grade: 12 },
        applicationState: { submittedCount: 6, totalApplications: 10 },
      },
      'COLLEGE_US',
    );
    expect(nav6).toBe('navigator');

    // 1/10 submitted → executor (< 50%)
    const exec = deriveCounselingStage(
      {
        studentContext: { grade: 12 },
        applicationState: { submittedCount: 1, totalApplications: 10 },
      },
      'COLLEGE_US',
    );
    expect(exec).toBe('executor');

    // 0 submitted → executor
    const exec0 = deriveCounselingStage(
      {
        studentContext: { grade: 12 },
        applicationState: { submittedCount: 0, totalApplications: 10 },
      },
      'COLLEGE_US',
    );
    expect(exec0).toBe('executor');
  });

  it('CAREER_INDIA buckets map to correct stages', () => {
    expect(deriveCounselingStage({ bucket: 'FORMATIVE' }, 'CAREER_INDIA')).toBe('foundation_builder');
    expect(deriveCounselingStage({ bucket: 'TRANSITIONAL' }, 'CAREER_INDIA')).toBe('path_explorer');
    expect(deriveCounselingStage({ bucket: 'EXECUTIONAL' }, 'CAREER_INDIA')).toBe('exam_strategist');
  });

  it('returns undefined for missing context or unknown variant', () => {
    expect(deriveCounselingStage(undefined, 'COLLEGE_US')).toBeUndefined();
    expect(deriveCounselingStage({}, undefined)).toBeUndefined();
    expect(deriveCounselingStage({ studentContext: { grade: 10 } }, 'UNKNOWN_VARIANT')).toBeUndefined();
    // COLLEGE_US with no grade
    expect(deriveCounselingStage({ studentContext: {} }, 'COLLEGE_US')).toBeUndefined();
  });
});

// ============================================
// preProcessAnalysis with stage
// ============================================

describe('preProcessAnalysis with stage', () => {
  const preProcess = counselorModule.preProcessAnalysis!;

  it('injects COUNSELING STAGE for COLLEGE_US grade 10', () => {
    const result = preProcess({
      studentMessage: 'What should I explore?',
      conversationHistory: [],
      metadata: {
        variant: 'COLLEGE_US',
        clientContext: {
          studentContext: { grade: 10 },
        },
      },
    });

    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain('COUNSELING STAGE: builder');
  });
});

// ============================================
// mapAnalysisToStrategy with stage
// ============================================

describe('mapAnalysisToStrategy with stage', () => {
  const map = counselorModule.mapAnalysisToStrategy!;

  it('stage=undefined → output identical to V1 (regression)', () => {
    // Same input as existing strategy mapping tests — no counselingStage
    const result = map(
      {
        intent: 'question',
        urgency: 'high',
        actionability: 50,
        sentimentTone: 'neutral',
        relevantContextAreas: [],
        suggestedFocus: '',
      },
      0,
    );
    // Without stage, high urgency still maps to hint_with_question (V1 behavior)
    expect(result.questionType).toBe('hint_with_question');
    expect(result.newHintLevel).toBe(1);
  });

  it('explorer stage: hint_with_question downgrades to socratic', () => {
    // High urgency normally maps to hint_with_question
    const result = map(
      {
        intent: 'question',
        urgency: 'high',
        actionability: 50,
        sentimentTone: 'neutral',
        relevantContextAreas: [],
        suggestedFocus: '',
        counselingStage: 'explorer',
      },
      0,
    );
    expect(result.questionType).toBe('socratic');
  });

  it('executor stage: foundational upgrades to hint_with_question with bumped hint', () => {
    // Low-actionability exploration normally maps to foundational
    const result = map(
      {
        intent: 'exploration',
        urgency: 'low',
        actionability: 30,
        sentimentTone: 'neutral',
        relevantContextAreas: [],
        suggestedFocus: '',
        counselingStage: 'executor',
      },
      2,
    );
    expect(result.questionType).toBe('hint_with_question');
    expect(result.newHintLevel).toBe(3); // currentHintLevel 2 + 1
  });
});

// ============================================
// V2 PROMPT VERSION SELECTORS
// ============================================

describe('V1 prompt snapshot regression', () => {
  it('getCounselorSystemPrompt(v1) returns exact V1 reference', () => {
    expect(getCounselorSystemPrompt('v1')).toBe(COUNSELOR_SYSTEM_PROMPT);
  });

  it('getVariantOverlay_versioned(COLLEGE_US, v1) returns exact V1 reference', () => {
    expect(getVariantOverlay_versioned('COLLEGE_US', 'v1')).toBe(COLLEGE_US_OVERLAY);
  });

  it('getVariantOverlay_versioned(CAREER_INDIA, v1) returns exact V1 reference', () => {
    expect(getVariantOverlay_versioned('CAREER_INDIA', 'v1')).toBe(CAREER_INDIA_OVERLAY);
  });
});

describe('V2 prompt content verification', () => {
  it('V2 base prompt contains stage-aware rules and no variant name', () => {
    const prompt = getCounselorSystemPrompt('v2');

    // Stage-aware techniques
    expect(prompt).toContain('Explorer Stage');
    expect(prompt).toContain('Strategist Stage');
    expect(prompt).toContain('Executor Stage');
    expect(prompt).toContain('Navigator Stage');

    // Identity Graph awareness
    expect(prompt).toContain('IDENTITY GRAPH AWARENESS');
    expect(prompt).toContain('Nudge Preference Adaptation');
    expect(prompt).toContain('Procrastination Signals');

    // Conversational reengineering
    expect(prompt).toContain('profileUpdateSuggestion');
    expect(prompt).toContain('CONVERSATIONAL REENGINEERING');

    // No variant name in base prompt
    expect(prompt).not.toMatch(/\bVid\b/);
    expect(prompt).not.toContain('Vidya');
  });

  it('COLLEGE_US V2 overlay contains Vid, stage personas, and ED rules', () => {
    const overlay = getVariantOverlay_versioned('COLLEGE_US', 'v2');

    expect(overlay).toContain('Vid');
    expect(overlay).toContain('Discoverer (Grade 9)');
    expect(overlay).toContain('Strategist (Grade 11)');
    expect(overlay).toContain('Executor (Grade 12');
    expect(overlay).toContain('Navigator (Grade 12');
    expect(overlay).toContain('Early Decision');
    expect(overlay).toContain('Demonstrated Interest');
    expect(overlay).toContain('Financial');
  });

  it('CAREER_INDIA V2 overlay contains Vidya, ODEE bucket stages, JEE, NEET', () => {
    const overlay = getVariantOverlay_versioned('CAREER_INDIA', 'v2');

    expect(overlay).toContain('Vidya');
    expect(overlay).toContain('Foundation Builder');
    expect(overlay).toContain('Path Explorer');
    expect(overlay).toContain('Exam Strategist');
    expect(overlay).toContain('JEE');
    expect(overlay).toContain('NEET');
    expect(overlay).toContain('KCET');
    expect(overlay).toContain('study plan');
  });

  it('V2 analysis prompt contains profileUpdateSuggestion, topicCategory, contextSufficiency', () => {
    const prompt = getCounselorAnalysisPrompt('v2');

    expect(prompt).toContain('profileUpdateSuggestion');
    expect(prompt).toContain('topicCategory');
    expect(prompt).toContain('contextSufficiency');
    expect(prompt).toContain('counselingStage');
    expect(prompt).toContain('fieldKey');
    expect(prompt).toContain('confidence');
  });
});

describe('V2 analysis response robustness', () => {
  it('V2 analysis response missing new fields parses without crash', () => {
    // Simulate a V1-shaped response (missing V2 fields)
    const v1Response = JSON.parse(JSON.stringify({
      intent: 'question',
      urgency: 'medium',
      relevantContextAreas: ['applications'],
      suggestedFocus: 'school list balance',
      sentimentTone: 'neutral',
      actionability: 60,
    }));

    // V2 fields should be undefined — no crash
    expect(v1Response.counselingStage).toBeUndefined();
    expect(v1Response.topicCategory).toBeUndefined();
    expect(v1Response.contextSufficiency).toBeUndefined();
    expect(v1Response.profileUpdateSuggestion).toBeUndefined();

    // V1 fields intact
    expect(v1Response.intent).toBe('question');
    expect(v1Response.actionability).toBe(60);
  });

  it('V2 analysis response with all fields parses correctly', () => {
    const v2Response = JSON.parse(JSON.stringify({
      intent: 'update',
      urgency: 'low',
      relevantContextAreas: ['testScores'],
      suggestedFocus: 'Update SAT score and reassess school list',
      sentimentTone: 'positive',
      actionability: 80,
      counselingStage: 'strategist',
      topicCategory: 'academic',
      contextSufficiency: 'sufficient',
      profileUpdateSuggestion: {
        fieldKey: 'testScores.sat',
        currentValue: 1350,
        suggestedValue: 1480,
        confidence: 0.95,
      },
    }));

    // V1 fields
    expect(v2Response.intent).toBe('update');
    expect(v2Response.actionability).toBe(80);

    // V2 fields
    expect(v2Response.counselingStage).toBe('strategist');
    expect(v2Response.topicCategory).toBe('academic');
    expect(v2Response.contextSufficiency).toBe('sufficient');
    expect(v2Response.profileUpdateSuggestion).toBeDefined();
    expect(v2Response.profileUpdateSuggestion.fieldKey).toBe('testScores.sat');
    expect(v2Response.profileUpdateSuggestion.suggestedValue).toBe(1480);
    expect(v2Response.profileUpdateSuggestion.confidence).toBe(0.95);
  });
});

// ============================================
// VARIANT GUARDRAILS (V2)
// ============================================

describe('validateResponseWithVariant', () => {
  it('COLLEGE_US: detects ranking fabrication', () => {
    const result = validateResponseWithVariant(
      'MIT is ranked #1 in engineering by US News',
      'COLLEGE_US',
    );
    expect(result.isClean).toBe(false);
    expect(result.fallbackMessage).toBeDefined();
  });

  it('CAREER_INDIA: detects coaching recommendation', () => {
    const result = validateResponseWithVariant(
      'You should join coaching institute for JEE preparation',
      'CAREER_INDIA',
    );
    expect(result.isClean).toBe(false);
    expect(result.fallbackMessage).toBeDefined();
  });

  it('no false positives on normal counselor response', () => {
    const result = validateResponseWithVariant(
      'What subjects interest you the most? Let me help you explore some options.',
      'COLLEGE_US',
    );
    expect(result.isClean).toBe(true);
    expect(result.fallbackMessage).toBeUndefined();
  });
});

// ============================================
// PROFILE UPDATE REENGINEERING (V2)
// ============================================

describe('profileUpdateSuggestion reengineering', () => {
  const build = counselorModule.buildResponseSystemAddendum!;

  const baseAnalysis = {
    intent: 'update',
    urgency: 'medium',
    sentimentTone: 'neutral',
    actionability: 60,
    suggestedFocus: 'school list',
    relevantContextAreas: ['applications'],
  };

  it('V1 mode: no reengineering rules even with profileUpdateSuggestion', () => {
    // Default env is v1 (or unset), so profileUpdateSuggestion block is skipped
    const analysisWithSuggestion = {
      ...baseAnalysis,
      profileUpdateSuggestion: {
        fieldKey: 'testScores.sat',
        currentValue: 1350,
        suggestedValue: 1480,
        confidence: 0.95,
      },
    };

    const result = build(analysisWithSuggestion, {
      variant: 'COLLEGE_US',
      clientContext: { studentContext: { grade: 11 } },
    });

    expect(result).not.toContain('PROFILE UPDATE DETECTED');
  });

  it('V2 mode with profileUpdateSuggestion → reengineering rules in addendum', async () => {
    // We need VID_PROMPT_VERSION=v2 at module load time.
    // Use vi.stubEnv + vi.resetModules + dynamic import to reload the module.
    vi.stubEnv('VID_PROMPT_VERSION', 'v2');

    // Reset and re-import the module so promptVersion reads v2
    vi.resetModules();
    const { counselorModule: reloadedModule } = await import('../counselor');
    const buildV2 = reloadedModule.buildResponseSystemAddendum!;

    const analysisWithSuggestion = {
      ...baseAnalysis,
      profileUpdateSuggestion: {
        fieldKey: 'testScores.sat',
        currentValue: 1350,
        suggestedValue: 1480,
        confidence: 0.95,
      },
    };

    const result = buildV2(analysisWithSuggestion, {
      variant: 'COLLEGE_US',
      clientContext: { studentContext: { grade: 11 } },
    });

    expect(result).toContain('PROFILE UPDATE DETECTED');
    expect(result).toContain('testScores.sat');
    expect(result).toContain('1480');
    expect(result).toContain('0.95');

    // Cleanup
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
