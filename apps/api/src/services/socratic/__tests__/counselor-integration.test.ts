/**
 * Counselor Integration Test
 *
 * Tests the full pipeline: TutorInput → SocraticEngine → TutorResponse
 * for COUNSELING sessions with both COLLEGE_US and CAREER_INDIA variants.
 *
 * Mocks: Anthropic API (returns fixture analysis/response JSON).
 * Does NOT mock: engine, module registry, prompt construction, validation.
 *
 * This verifies that the entire data flow works end-to-end:
 *   clientContext → preProcessAnalysis → analysis prompt → strategy mapping
 *   → response prompt (with variant overlay) → validate → TutorResponse
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ============================================
// MOCK ANTHROPIC (hoisted so it's available in vi.mock factory)
// ============================================

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {}
      messages = { create: mockCreate };
    },
  };
});

// Mock cache to avoid Redis dependency
vi.mock('../../cache', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getJSON: vi.fn().mockResolvedValue(null),
    setJSON: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  },
  CACHE_TTL: { ESSAY_ANALYSIS: 300, SESSION_SUMMARY: 600 },
  contentHash: vi.fn(() => 'test-hash'),
}));

// ============================================
// IMPORTS (after mocks)
// ============================================

import { SocraticEngine } from '../engine';
import type { TutorInput, TutorResponse, Message } from '../types';

// ============================================
// FIXTURES
// ============================================

const COLLEGE_US_CONTEXT = {
  studentContext: {
    grade: 11,
    gradeLevel: 'junior',
    gpaRange: [3.7, 3.9],
    testScoreRange: { sat: [1380, 1420] },
    testType: 'SAT',
    state: 'California',
    residencyCountry: 'US',
    majorInterests: ['Computer Science', 'Mathematics'],
    budget: 45000,
    firstGeneration: true,
    internationalStatus: false,
    educationSystem: 'US',
    disabilityStatus: false,
    iepActive: false,
    accommodations: null,
  },
  applicationState: {
    totalApplications: 10,
    submittedCount: 0,
    reachCount: 4,
    matchCount: 4,
    safetyCount: 2,
    portfolioBalanceScore: 68,
    upcomingDeadlines: [
      { school: 'MIT', date: '2026-01-01', type: 'Regular Decision' },
      { school: 'Stanford', date: '2026-01-02', type: 'Regular Decision' },
    ],
    essaysInProgress: [
      { school: 'Common App', prompt: 'Personal Statement', wordCount: 450 },
    ],
  },
  behavioralSignals: {
    lastActiveAt: '2026-02-08T12:00:00Z',
    engagementLevel: 'high',
    daysSinceLastEssayEdit: 2,
  },
};

const CAREER_INDIA_CONTEXT = {
  bucket: 'EXPLORATION',
  careerGoal: 'Software Engineering',
  riasecProfile: { Investigative: 9, Conventional: 7, Realistic: 5, Artistic: 4, Social: 3, Enterprising: 2 },
  streamHint: 'Science',
  gapAnalysis: {
    strengths: ['mathematics', 'logical reasoning', 'problem solving'],
    gaps: ['communication skills', 'teamwork experience'],
    recommendations: ['Join coding club', 'Practice presentations'],
  },
  evidenceSummary: 'Strong performance in math olympiad, participated in hackathon',
  activeModeEvents: ['Completed RIASEC assessment', 'Explored 3 career profiles'],
  careersExploredCount: 5,
  familyContext: {
    expectation: 'engineering or medicine',
    income_bracket: 'middle',
    first_generation_graduate: false,
  },
};

/** Fixture: counselor analysis JSON returned by Haiku */
const MOCK_ANALYSIS_RESULT = {
  intent: 'question',
  urgency: 'medium',
  relevantContextAreas: ['applications', 'deadlines'],
  suggestedFocus: 'helping the student evaluate their school list balance',
  sentimentTone: 'neutral',
  actionability: 65,
};

/** Fixture: counselor response text returned by Sonnet */
const MOCK_RESPONSE_TEXT = "It sounds like you're thoughtfully building your school list! With 4 reach and 4 match schools, you have a solid foundation. What criteria are you using to decide which schools are the best fit for your interests in computer science?";

// ============================================
// HELPER
// ============================================

function setupMockLLM() {
  let callIndex = 0;
  mockCreate.mockImplementation(async () => {
    callIndex++;
    if (callIndex === 1) {
      // First call = analysis (Haiku)
      return {
        content: [{ type: 'text', text: JSON.stringify(MOCK_ANALYSIS_RESULT) }],
      };
    }
    // Second call = response (Sonnet)
    return {
      content: [{ type: 'text', text: MOCK_RESPONSE_TEXT }],
    };
  });
}

// ============================================
// TESTS
// ============================================

describe('Counselor Integration: COLLEGE_US (PathWiz)', () => {
  let engine: SocraticEngine;

  beforeAll(() => {
    engine = new SocraticEngine('test-api-key');
  });

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('processes a counselor message end-to-end with COLLEGE_US context', async () => {
    setupMockLLM();

    const input: TutorInput = {
      sessionId: 'test-session-1',
      userMessage: 'Should I add more safety schools to my list?',
      language: 'EN' as any,
      conversationHistory: [
        { role: 'USER', content: 'Hi, I need help with my college list' } as Message,
        { role: 'ASSISTANT', content: "Welcome! I'm here to help. What's on your mind?" } as Message,
      ],
      subject: 'COUNSELING' as any,
      currentHintLevel: 0,
      clientContext: COLLEGE_US_CONTEXT,
      variant: 'COLLEGE_US',
      clientUserId: 'pathwiz-user-123',
    };

    const response: TutorResponse = await engine.processMessage(input);

    // ---- Verify response structure ----
    expect(response).toBeDefined();
    expect(response.message).toBe(MOCK_RESPONSE_TEXT);
    expect(response.language).toBe('EN');

    // ---- Verify metadata ----
    expect(response.metadata.questionType).toBeDefined();
    expect(response.metadata.hintLevel).toBeDefined();
    expect(response.metadata.conceptsIdentified).toEqual([]);
    // Counselor-specific metadata
    expect(response.metadata.counselorAnalysisResult).toBeDefined();
    expect(response.metadata.counselorIntent).toBe('question');
    expect(response.metadata.counselorUrgency).toBe('medium');
    expect(response.metadata.counselorSuggestedFocus).toBe('helping the student evaluate their school list balance');

    // ---- Verify LLM was called twice (analysis + response) ----
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // ---- Verify analysis call included client context ----
    const analysisCall = mockCreate.mock.calls[0][0];
    const analysisUserPrompt = analysisCall.messages[0].content;
    expect(analysisUserPrompt).toContain('COLLEGE_US');
    expect(analysisUserPrompt).toContain('safety schools');

    // ---- Verify response call included variant overlay ----
    const responseCall = mockCreate.mock.calls[1][0];
    const responseSystemPrompt = responseCall.system[0].text;
    expect(responseSystemPrompt).toContain('Vidya'); // Base prompt
    expect(responseSystemPrompt).toContain('US College Application Counselor'); // Variant overlay
    expect(responseSystemPrompt).toContain('STUDENT CONTEXT (COLLEGE_US)'); // Client context
    expect(responseSystemPrompt).toContain('First-Generation Student: Yes'); // Context detail
    expect(responseSystemPrompt).toContain('Computer Science'); // Major interests
    expect(responseSystemPrompt).toContain('Total Applications: 10'); // Application state
  });

  it('skips the attempt gate for counselor sessions', async () => {
    setupMockLLM();

    // Even with just 2 messages in history and a simple message, should NOT prompt for attempt
    const input: TutorInput = {
      sessionId: 'test-session-2',
      userMessage: 'Tell me about safety schools',
      language: 'EN' as any,
      conversationHistory: [
        { role: 'USER', content: 'Hi' } as Message,
      ],
      subject: 'COUNSELING' as any,
      currentHintLevel: 0,
      clientContext: COLLEGE_US_CONTEXT,
      variant: 'COLLEGE_US',
    };

    const response = await engine.processMessage(input);

    // Should get a real response, NOT an attempt_prompt
    expect(response.metadata.questionType).not.toBe('attempt_prompt');
    expect(response.message).toBe(MOCK_RESPONSE_TEXT);
  });
});

describe('Counselor Integration: CAREER_INDIA (ODEE)', () => {
  let engine: SocraticEngine;

  beforeAll(() => {
    engine = new SocraticEngine('test-api-key');
  });

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('processes a counselor message with CAREER_INDIA context', async () => {
    setupMockLLM();

    const input: TutorInput = {
      sessionId: 'test-session-3',
      userMessage: 'Should I take Science or Commerce stream?',
      language: 'EN' as any,
      conversationHistory: [
        { role: 'USER', content: 'I need help choosing my stream' } as Message,
        { role: 'ASSISTANT', content: "I'd love to help! What are you most interested in?" } as Message,
      ],
      subject: 'COUNSELING' as any,
      currentHintLevel: 0,
      clientContext: CAREER_INDIA_CONTEXT,
      variant: 'CAREER_INDIA',
      clientUserId: 'odee-student-456',
    };

    const response = await engine.processMessage(input);

    expect(response).toBeDefined();
    expect(response.message.length).toBeGreaterThan(0);

    // Verify the CAREER_INDIA overlay was injected
    const responseCall = mockCreate.mock.calls[1][0];
    const systemPrompt = responseCall.system[0].text;
    expect(systemPrompt).toContain('India K-12 Career Exploration Counselor');
    expect(systemPrompt).toContain('STUDENT CONTEXT (CAREER_INDIA)');
    expect(systemPrompt).toContain('EXPLORATION'); // bucket
    expect(systemPrompt).toContain('Software Engineering'); // careerGoal
    expect(systemPrompt).toContain('Investigative'); // RIASEC
    expect(systemPrompt).toContain('Science'); // streamHint
    expect(systemPrompt).toContain('Family Context'); // family
    expect(systemPrompt).toContain('engineering or medicine'); // family expectation

    // Verify analysis included CAREER_INDIA
    const analysisCall = mockCreate.mock.calls[0][0];
    const analysisPrompt = analysisCall.messages[0].content;
    expect(analysisPrompt).toContain('CAREER_INDIA');
  });
});

describe('Counselor Integration: edge cases', () => {
  let engine: SocraticEngine;

  beforeAll(() => {
    engine = new SocraticEngine('test-api-key');
  });

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('handles missing clientContext gracefully', async () => {
    setupMockLLM();

    const input: TutorInput = {
      sessionId: 'test-session-4',
      userMessage: 'I need help with college apps',
      language: 'EN' as any,
      conversationHistory: [],
      subject: 'COUNSELING' as any,
      currentHintLevel: 0,
      // No clientContext, no variant
    };

    const response = await engine.processMessage(input);

    // Should still work — base counselor prompt without variant overlay
    expect(response).toBeDefined();
    expect(response.message.length).toBeGreaterThan(0);
    expect(response.metadata.questionType).toBeDefined();
  });

  it('handles analysis error gracefully', async () => {
    // Make the analysis call fail
    mockCreate.mockRejectedValueOnce(new Error('LLM unavailable'));
    // Response call succeeds
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'What matters most to you about this decision?' }],
    });

    const input: TutorInput = {
      sessionId: 'test-session-5',
      userMessage: 'Help me decide',
      language: 'EN' as any,
      conversationHistory: [
        { role: 'USER', content: 'Hello' } as Message,
        { role: 'ASSISTANT', content: 'Hi there!' } as Message,
      ],
      subject: 'COUNSELING' as any,
      currentHintLevel: 0,
      clientContext: COLLEGE_US_CONTEXT,
      variant: 'COLLEGE_US',
    };

    const response = await engine.processMessage(input);

    // Should fall back to default analysis and still produce a response
    expect(response).toBeDefined();
    expect(response.message.length).toBeGreaterThan(0);
    expect(response.metadata.counselorAnalysisResult).toBeDefined();
    // Default analysis values
    expect(response.metadata.counselorAnalysisResult!.intent).toBe('question');
    expect(response.metadata.counselorAnalysisResult!.urgency).toBe('medium');
  });
});
