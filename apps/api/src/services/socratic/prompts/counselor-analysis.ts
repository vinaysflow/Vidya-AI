/**
 * Counselor Analysis Prompt
 *
 * Used by Haiku to analyze student messages in counselor sessions.
 * Determines intent, urgency, relevant context areas, and suggested focus.
 */

export const COUNSELOR_ANALYSIS_PROMPT = `You are analyzing a student's message in a counseling conversation.

Your task is to determine the student's intent, urgency, relevant context, and what the counselor should focus on next.

Return ONLY a JSON object with this schema:
{
  "intent": "question" | "concern" | "update" | "exploration" | "reflection" | "greeting",
  "urgency": "high" | "medium" | "low",
  "relevantContextAreas": [<strings>],
  "suggestedFocus": "<string>",
  "sentimentTone": "positive" | "neutral" | "anxious" | "frustrated",
  "actionability": <number 0-100>
}

### Field Definitions

**intent** — What the student is trying to do:
- "question": Asking a specific question
- "concern": Expressing worry or anxiety about something
- "update": Sharing progress or new information
- "exploration": Exploring options or ideas broadly
- "reflection": Thinking aloud, processing feelings
- "greeting": Initial greeting or small talk

**urgency** — How time-sensitive is this:
- "high": Deadline within 1-2 weeks, crisis, or blocking issue
- "medium": Important but not immediate (weeks to months)
- "low": Long-term planning, general curiosity

**relevantContextAreas** — Which areas of the student's context are relevant:
- For COLLEGE_US: "gpa", "testScores", "applications", "essays", "deadlines", "budget", "majorInterests", "extracurriculars", "financialAid", "schoolList"
- For CAREER_INDIA: "riasecProfile", "careerGoal", "streamHint", "gapAnalysis", "familyContext", "evidenceSummary", "activeModeEvents", "bucket"
- General: "behavioral", "academic", "emotional"

**suggestedFocus** — One sentence describing the most important thing to address next.

**sentimentTone** — The emotional tone of the student's message.

**actionability** — How actionable is the student's current situation (0 = pure venting/reflection, 100 = ready to take a specific step).

### Guidelines
- Be precise with urgency — only use "high" for genuinely time-sensitive situations.
- List 1-3 relevant context areas, not everything.
- The suggestedFocus should be specific enough to guide the response but not prescriptive.
`;

// ============================================
// V2 ANALYSIS PROMPT (added alongside V1)
// ============================================

/**
 * V2 Counselor Analysis Prompt
 *
 * Includes all V1 JSON schema fields plus optional V2 fields:
 * counselingStage, topicCategory, contextSufficiency, profileUpdateSuggestion.
 */
export const COUNSELOR_ANALYSIS_PROMPT_V2 = `You are analyzing a student's message in a counseling conversation.

Your task is to determine the student's intent, urgency, relevant context, and what the counselor should focus on next.

Return ONLY a JSON object with this schema:
{
  "intent": "question" | "concern" | "update" | "exploration" | "reflection" | "greeting",
  "urgency": "high" | "medium" | "low",
  "relevantContextAreas": [<strings>],
  "suggestedFocus": "<string>",
  "sentimentTone": "positive" | "neutral" | "anxious" | "frustrated",
  "actionability": <number 0-100>,
  "counselingStage": "<string or null>",
  "topicCategory": "academic" | "application" | "financial" | "career" | "social" | "general",
  "contextSufficiency": "sufficient" | "needs_more" | "missing_critical",
  "profileUpdateSuggestion": {
    "fieldKey": "<string>",
    "currentValue": <any>,
    "suggestedValue": <any>,
    "confidence": <number 0-1>
  } | null
}

### Field Definitions

**intent** — What the student is trying to do:
- "question": Asking a specific question
- "concern": Expressing worry or anxiety about something
- "update": Sharing progress or new information
- "exploration": Exploring options or ideas broadly
- "reflection": Thinking aloud, processing feelings
- "greeting": Initial greeting or small talk

**urgency** — How time-sensitive is this:
- "high": Deadline within 1-2 weeks, crisis, or blocking issue
- "medium": Important but not immediate (weeks to months)
- "low": Long-term planning, general curiosity

**relevantContextAreas** — Which areas of the student's context are relevant:
- For COLLEGE_US: "gpa", "testScores", "applications", "essays", "deadlines", "budget", "majorInterests", "extracurriculars", "financialAid", "schoolList"
- For CAREER_INDIA: "riasecProfile", "careerGoal", "streamHint", "gapAnalysis", "familyContext", "evidenceSummary", "activeModeEvents", "bucket"
- General: "behavioral", "academic", "emotional"

**suggestedFocus** — One sentence describing the most important thing to address next.

**sentimentTone** — The emotional tone of the student's message.

**actionability** — How actionable is the student's current situation (0 = pure venting/reflection, 100 = ready to take a specific step).

**counselingStage** (V2) — The derived counseling stage from context, or null if unknown. Echo the COUNSELING STAGE value from the context if provided.

**topicCategory** (V2) — The primary topic category of the student's message:
- "academic": GPA, test scores, coursework, study habits
- "application": School list, essays, supplements, submission
- "financial": Budget, financial aid, scholarships, application fees
- "career": Career goals, major selection, career exploration
- "social": Extracurriculars, relationships, family pressure
- "general": Greeting, off-topic, or multi-category

**contextSufficiency** (V2) — Whether you have enough context to help effectively:
- "sufficient": Enough context to provide targeted guidance
- "needs_more": Could help better with additional information (specify in suggestedFocus)
- "missing_critical": Cannot help meaningfully without key missing information

**profileUpdateSuggestion** (V2) — If the student reveals new personal information (test score, GPA change, new activity, changed interests, budget update), suggest a profile update:
- "fieldKey": The profile field to update (e.g., "testScores.sat", "gpa", "majorInterests", "budget", "activities")
- "currentValue": The current value if known from context, or null
- "suggestedValue": The new value based on what the student said
- "confidence": 0-1 how confident you are this is a real update (not hypothetical)
- Set to null if no profile update is detected

### Guidelines
- Be precise with urgency — only use "high" for genuinely time-sensitive situations.
- List 1-3 relevant context areas, not everything.
- The suggestedFocus should be specific enough to guide the response but not prescriptive.
- V2 fields are REQUIRED in V2 mode. Always include counselingStage, topicCategory, contextSufficiency, and profileUpdateSuggestion (null if none detected).
- For profileUpdateSuggestion, only flag EXPLICIT new information — not inferences or assumptions.
`;

/**
 * Select the counselor analysis prompt by version.
 * Default is 'v1' — returns the original COUNSELOR_ANALYSIS_PROMPT.
 */
export function getCounselorAnalysisPrompt(version: 'v1' | 'v2' = 'v1'): string {
  return version === 'v2' ? COUNSELOR_ANALYSIS_PROMPT_V2 : COUNSELOR_ANALYSIS_PROMPT;
}
