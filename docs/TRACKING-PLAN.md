# Tracking Plan

## Event Principles

- Track only what you can act on in the next 2 weeks.
- Make all events subject- and language-aware.
- Avoid PII in event payloads.

## Core Events (Web)

### Onboarding

- `onboarding_started`
  - `subject`, `language`
- `onboarding_completed`
  - `subject`, `language`, `difficulty`, `goal_length`

### Session

- `session_started`
  - `sessionId`, `subject`, `language`, `source` (starter/manual)
- `message_sent`
  - `sessionId`, `turnIndex`, `subject`, `language`, `charCount`
- `assistant_response`
  - `sessionId`, `turnIndex`, `questionType`, `hintLevel`, `topic`, `distance`
- `session_ended`
  - `sessionId`, `messageCount`, `durationMinutes`, `masteryGain`

### Engagement

- `quick_action_clicked`
  - `label`, `sessionId`
- `settings_opened`
  - `source`
- `sidebar_opened`
  - `sessionCount`

## Core Events (API)

- `api_request`
  - `route`, `status`, `durationMs`, `apiKeyId`
- `rate_limit_hit`
  - `route`, `tier`, `overage`
- `llm_request`
  - `provider`, `model`, `tokensIn`, `tokensOut`, `durationMs`, `status`

## KPI-Focused Aggregations

- Activation: onboarding completion rate, first response success rate.
- Engagement: D1/D7 return, sessions per user.
- Learning: mastery gain per 3 sessions, hint loop rate.
- Reliability: p95 latency, 5xx error rate.

## Privacy Notes

- No raw user text should be logged in analytics.
- Use session IDs and event aggregates only.
