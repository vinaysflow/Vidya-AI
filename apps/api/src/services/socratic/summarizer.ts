/**
 * Session Summarizer
 * 
 * Provides two key capabilities:
 * 
 * 1. Rolling History Summarization (3A):
 *    After 8+ messages, older messages are compressed into a 3-5 sentence
 *    summary using Haiku (cheap). The summary + last 6 messages are used
 *    instead of the full history, saving ~60% of input tokens on long sessions.
 * 
 * 2. Session End Report (3B):
 *    When a session ends, generates a structured coaching report summarizing
 *    what happened, what the student learned, and next steps.
 * 
 * Cache key patterns:
 *   summary:{sessionId}:{count}  - Rolling conversation summaries (1 hour TTL)
 *   report:{sessionId}           - Session end reports (1 hour TTL)
 */

import type { Subject } from '@prisma/client';
import { cache, CACHE_TTL } from '../cache';
import { LlmClient } from '../llm/client';

// ============================================
// TYPES
// ============================================

export interface Message {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
}

export interface SessionReport {
  /** 2-3 sentence overview of the session */
  summary: string;
  /** Topics/concepts the student worked on */
  conceptsEngaged: string[];
  /** What the student did well */
  strengths: string[];
  /** Where the student needs more work */
  areasForImprovement: string[];
  /** Actionable recommendations for next session */
  nextSteps: string[];
  /** Total messages exchanged */
  messagesExchanged: number;
  /** Approximate session duration in minutes */
  durationMinutes: number;
  // Essay-specific fields (only populated when subject is ESSAY_WRITING)
  /** Readiness score at first analysis (essay only) */
  readinessStart?: number;
  /** Readiness score at last analysis (essay only) */
  readinessEnd?: number;
  /** Key essay feedback areas addressed (essay only) */
  essayFeedbackAreas?: string[];
}

/** Threshold: only summarize when message count exceeds this */
const SUMMARY_THRESHOLD = 8;

/** Number of recent messages to keep verbatim alongside the summary */
const RECENT_MESSAGE_COUNT = 6;

// ============================================
// ROLLING HISTORY SUMMARIZER (3A)
// ============================================

/**
 * Get or create a rolling summary of older messages in a session.
 * 
 * - If messages.length <= SUMMARY_THRESHOLD, returns all messages (no summary needed).
 * - If a cached summary exists for this session+count, returns it + last 6 messages.
 * - Otherwise, generates a new summary with Haiku and caches it.
 * 
 * This replaces the naive `.slice(-10)` / `.slice(-6)` patterns in the engine,
 * preserving context from the entire session while reducing token usage.
 */
export async function getOrCreateSessionSummary(
  sessionId: string,
  messages: Message[],
  client: LlmClient,
): Promise<{ summary: string; recentMessages: Message[] }> {
  // Below threshold: no summarization needed
  if (messages.length <= SUMMARY_THRESHOLD) {
    return { summary: '', recentMessages: messages };
  }

  // Check cache
  const cacheKey = `summary:${sessionId}:${messages.length}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return { summary: cached, recentMessages: messages.slice(-RECENT_MESSAGE_COUNT) };
  }

  // Generate summary of older messages using Haiku (cheap)
  const olderMessages = messages.slice(0, -RECENT_MESSAGE_COUNT);
  const olderText = olderMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  try {
    const summaryText = await client.generateText({
      modelType: 'analysis',
      maxTokens: 300,
      systemPrompt: 'Summarize this tutoring conversation in 3-5 sentences. Focus on: what the student is working on, what progress they have made, what areas still need improvement, and what the current coaching focus is. Be concise and factual.',
      messages: [{ role: 'user', content: olderText }],
      usePromptCache: true,
    });

    // Cache with SESSION_SUMMARY TTL (1 hour)
    await cache.set(cacheKey, summaryText, CACHE_TTL.SESSION_SUMMARY);

    return {
      summary: summaryText,
      recentMessages: messages.slice(-RECENT_MESSAGE_COUNT),
    };
  } catch (error) {
    console.error('[Summarizer] Failed to generate rolling summary:', error);
    // Fallback: return last 10 messages (old behavior) without a summary
    return { summary: '', recentMessages: messages.slice(-10) };
  }
}

/**
 * Build a history text string from summary + recent messages.
 * Used by the engine to replace raw `.slice()` patterns.
 */
export function buildHistoryText(
  summary: string,
  recentMessages: Message[],
): string {
  if (summary) {
    const recentText = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    return `SESSION CONTEXT (earlier messages):\n${summary}\n\nRECENT MESSAGES:\n${recentText}`;
  }

  return recentMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');
}

// ============================================
// SESSION END REPORT (3B)
// ============================================

/**
 * Generate a structured session report when a session ends.
 * Uses Haiku for cost-efficiency (one-time generation per session).
 * 
 * The report captures:
 * - What was discussed / worked on
 * - Student strengths and areas for improvement
 * - Actionable next steps
 * - Essay-specific metrics (readiness journey, feedback areas)
 */
export async function generateSessionReport(params: {
  sessionId: string;
  messages: Message[];
  subject: Subject;
  startedAt: Date;
  essayType?: string;
  schoolName?: string;
  wordLimit?: number;
}, client: LlmClient): Promise<SessionReport> {
  const { sessionId, messages, subject, startedAt, essayType, schoolName, wordLimit } = params;

  // Check cache first
  const cacheKey = `report:${sessionId}`;
  const cached = await cache.getJSON<SessionReport>(cacheKey);
  if (cached) {
    console.log('[Summarizer] Session report cache hit');
    return cached;
  }

  const isEssay = subject === 'ESSAY_WRITING';
  const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

  // Build conversation transcript for the LLM
  const transcript = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  // Extract readiness scores from assistant message metadata (if present)
  // We look for readiness in the raw message content since we only have text here
  const readinessInfo = isEssay ? extractReadinessFromMessages(messages) : null;

  const subjectLabel = subject === 'COUNSELING'
    ? 'College Counselling'
    : subject;

  const subjectContext = isEssay
    ? `Subject: College Essay Writing${schoolName ? `\nSchool: ${schoolName}` : ''}${essayType ? `\nEssay Type: ${essayType}` : ''}${wordLimit ? `\nWord Limit: ${wordLimit}` : ''}`
    : `Subject: ${subjectLabel}`;

  const systemPrompt = `You are generating a session summary report for a Socratic tutoring session.

Analyze the conversation and return ONLY a JSON object with this schema:
{
  "summary": "<2-3 sentence overview of what happened in this session>",
  "conceptsEngaged": ["<concept1>", "<concept2>", ...],
  "strengths": ["<what the student did well>", ...],
  "areasForImprovement": ["<areas needing work>", ...],
  "nextSteps": ["<actionable recommendation 1>", "<actionable recommendation 2>", ...]${isEssay ? `,
  "essayFeedbackAreas": ["<key feedback areas addressed>", ...]` : ''}
}

Guidelines:
- Summary should be factual and concise (2-3 sentences)
- List 2-5 items for strengths, areasForImprovement, and nextSteps
- conceptsEngaged should list specific topics/concepts discussed
- nextSteps should be actionable recommendations the student can follow${isEssay ? '\n- essayFeedbackAreas should list the main areas of essay feedback (e.g., "voice", "specificity", "structure", "prompt alignment")' : ''}
- Return ONLY valid JSON, no other text`;

  try {
    const text = await client.generateText({
      modelType: 'analysis',
      maxTokens: 800,
      systemPrompt,
      usePromptCache: true,
      messages: [{
        role: 'user',
        content: `${subjectContext}
Messages Exchanged: ${messages.length}
Duration: ~${durationMinutes} minutes

FULL CONVERSATION:
${transcript}

Generate the session report JSON.`,
      }],
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in report response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<SessionReport>;

    const report: SessionReport = {
      summary: parsed.summary || 'Session completed.',
      conceptsEngaged: parsed.conceptsEngaged || [],
      strengths: parsed.strengths || [],
      areasForImprovement: parsed.areasForImprovement || [],
      nextSteps: parsed.nextSteps || [],
      messagesExchanged: messages.length,
      durationMinutes,
      ...(isEssay && {
        readinessStart: readinessInfo?.start,
        readinessEnd: readinessInfo?.end,
        essayFeedbackAreas: parsed.essayFeedbackAreas || [],
      }),
    };

    // Cache the report
    await cache.setJSON(cacheKey, report, CACHE_TTL.SESSION_SUMMARY);

    return report;
  } catch (error) {
    console.error('[Summarizer] Failed to generate session report:', error);

    // Return a minimal report on failure
    return {
      summary: `Session with ${messages.length} messages over ~${durationMinutes} minutes.`,
      conceptsEngaged: [],
      strengths: [],
      areasForImprovement: [],
      nextSteps: ['Continue practicing in a new session.'],
      messagesExchanged: messages.length,
      durationMinutes,
    };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Attempt to extract readiness scores from assistant messages.
 * Looks for patterns like "readiness: N%" or "Readiness: N" in message content.
 * Returns the first and last readiness scores found.
 */
function extractReadinessFromMessages(
  messages: Message[],
): { start: number | undefined; end: number | undefined } | null {
  const readinessScores: number[] = [];

  for (const msg of messages) {
    if (msg.role !== 'ASSISTANT') continue;

    // Look for readiness percentages in the message text
    const match = msg.content.match(/readiness[:\s]+(\d+)/i);
    if (match) {
      readinessScores.push(parseInt(match[1], 10));
    }
  }

  if (readinessScores.length === 0) return null;

  return {
    start: readinessScores[0],
    end: readinessScores[readinessScores.length - 1],
  };
}
