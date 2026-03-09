/**
 * eventLogger.ts
 *
 * Lightweight dogfood analytics event logger.
 * Writes to the AnalyticsEvent table in a fire-and-forget manner —
 * failures are silently swallowed so instrumentation never blocks a request.
 *
 * Events are designed to answer 8 investor-ready KPIs:
 *   - Session completion rate
 *   - Explain-back attempt rate
 *   - Hint escalation rate
 *   - D1 / D7 return rate
 *   - Weekly session frequency
 *   - Time-to-first-quest (onboarding → learning)
 *   - Subject diversity per user
 *   - Warm-up success rate
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type DogfoodEvent =
  | 'quest_started'           // { questId, chapter, subject, conceptKey, gradeLevel }
  | 'quest_completed'         // { questId, turns, durationMs, hintsUsed, explainBackAttempted }
  | 'choice_selected'         // { choiceLetter, correct, responseTimeMs, turnIndex }
  | 'hint_escalated'          // { hintLevel, conceptKey, subject }
  | 'explain_back_attempted'  // { modality: 'voice'|'drawing'|'card', conceptKey }
  | 'warm_up_completed'       // { correct, conceptKey }
  | 'diagnostic_completed'    // { score, suggestedGrade, baseGrade, results }
  | 'session_abandoned'       // { lastActivityMinutesAgo, messageCount }
  | 'calm_mode_toggled';      // { enabled: boolean }

/**
 * Fire-and-forget event logger. Never throws, never awaited externally.
 */
export async function logEvent(
  userId: string,
  event: DogfoodEvent,
  properties: Record<string, unknown>,
  sessionId?: string,
): Promise<void> {
  await prisma.analyticsEvent
    .create({ data: { userId, event, properties: properties as any, sessionId } })
    .catch(() => {}); // intentionally swallowed
}
