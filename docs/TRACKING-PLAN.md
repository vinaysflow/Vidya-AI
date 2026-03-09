# Tracking Plan

## Measurement Philosophy

- Dogfood v1 uses local observation + manual session review, not a full analytics pipeline.
- All data stays on-device (localStorage). No server-side user tracking.
- Track what you can act on in the next 2 weeks.
- No PII in any event or log.

## What We Track Today (Built-In)

### Client-Side State (localStorage via Zustand)

| Data Point | Location | Purpose |
|-----------|----------|---------|
| `kidModeEnabled` | chatStore | Kid vs adult mode selection |
| `grade` | chatStore | Child's grade level |
| `effectiveGrade` | chatStore | Adaptive difficulty level |
| `rsmTrack` | chatStore | RSM curriculum alignment flag |
| `gamification.xp` | chatStore | Total XP earned |
| `gamification.level` | chatStore | Current level |
| `gamification.currentStreak` | chatStore | Active daily streak |
| `gamification.longestStreak` | chatStore | Best streak ever |
| `gamification.badges` | chatStore | Earned badges list |
| `sessionHistory` | chatStore | Last 50 session previews |
| `learnerState` | chatStore | Concepts engaged, strengths, areas for improvement |
| `masteryMap` | chatStore | Per-concept mastery scores (BKT) |

### Server-Side (Database)

| Data Point | Table | Purpose |
|-----------|-------|---------|
| Session count and duration | Session | Engagement measurement |
| Message count per session | Message | Depth of interaction |
| Hint level per response | Message.metadata | Scaffolding effectiveness |
| Question type per response | Message.metadata | Learning path analysis |
| Safety events | Message.metadata.safetyEvents | Trust & safety monitoring |
| Mastery per concept | Progress | Learning efficacy |
| XP events | XPEvent | Gamification health |
| Adaptive state | User.adaptiveState | Difficulty progression |
| Quest performance | Session metadata | Quest completion tracking |

### LLM Metadata (Per Response)

| Field | Purpose |
|-------|---------|
| `metadata.questionType` | What type of question the tutor asked |
| `metadata.hintLevel` | Current position on hint ladder (0-5) |
| `metadata.distanceFromSolution` | How close the student is to the answer |
| `metadata.conceptsIdentified` | Concepts being practiced |
| `metadata.grounding` | Whether response used bank, reasoning, or retrieval |
| `metadata.confidence` | LLM confidence in its pedagogical approach |
| `metadata.safetyEvents` | Any safety triggers (answer_leak, budget_exceeded, etc.) |

## Dogfood Observation Protocol (Manual)

Since we don't have a full analytics pipeline yet, track these manually during dogfood:

### Daily (During Active Dogfood)

- [ ] How many minutes did the child use Vidya today?
- [ ] How many quests were completed?
- [ ] Did the child ask to use Vidya (voluntary) or was it prompted?
- [ ] Any frustration points observed? (couldn't read text, wrong answer, confusing UI)
- [ ] Did the streak mechanic motivate return usage?

### Weekly

- [ ] What is the child's current streak?
- [ ] Current level and total XP?
- [ ] How many unique concepts have been engaged? (check masteryMap in localStorage)
- [ ] Has effectiveGrade increased? (adaptive difficulty working?)
- [ ] Any patterns in which quests are chosen vs skipped?
- [ ] Parent feedback: "Would you pay for this?"

### Post-Dogfood (After 2-3 Weeks)

- [ ] Total sessions across all dogfood families
- [ ] Median session length
- [ ] Quest completion rate
- [ ] Mastery improvement (compare initial vs final masteryMap)
- [ ] NPS score from parents (1-10 survey)
- [ ] "Would pay" rate and suggested price point
- [ ] Top 3 complaints / feature requests

## Future Events (When Analytics Pipeline is Added)

### Web Events

- `role_selected` — `{role: 'kid' | 'learner'}`
- `parent_setup_completed` — `{grade, rsmTrack}`
- `quest_started` — `{questId, chapter, conceptKey, gradeLevel}`
- `quest_completed` — `{questId, turns, durationMinutes, correct, explainBackCorrect}`
- `choice_selected` — `{choiceLabel, correct, turnIndex}`
- `xp_earned` — `{amount, source, level}`
- `level_up` — `{newLevel}`
- `streak_updated` — `{currentStreak, longestStreak}`
- `session_started` — `{subject, language, kidMode}`
- `session_ended` — `{messageCount, durationMinutes, masteryDelta}`
- `reset_all_triggered` — `{}`

### API Events

- `llm_request` — `{provider, model, tokensIn, tokensOut, durationMs, status}`
- `safety_event` — `{type, sessionId, details}`
- `adaptive_grade_change` — `{userId, oldGrade, newGrade, direction}`

## Privacy Constraints

- No raw user text in analytics.
- No names, emails, or identifiable information.
- All client data is localStorage-only (no server-side user profiles for kid mode).
- COPPA-compliant: parent setup required, no data leaves device.

---

## Server-Side Analytics Policy

### Current State (Dogfood Phase)

All analytics during the dogfood phase are built exclusively on top of data that is **already stored for product functionality** — no additional event collection:

| Source | Already stored for | Used for analytics |
|---|---|---|
| `Session` (messageCount, hintLevel, maxHintLevel, resolved, masteryGain) | Session end report generation | Learning KPIs |
| `Progress` (mastery, topic, nextReview) | Spaced repetition scheduling | Mastery summaries |
| `XPEvent`, `UserGamification`, `UserBadge` | Gamification features | Engagement KPIs |
| `Message` (role, metadata) | Chat history, tutor context | Safety flagging |

This data is queried server-side only for:
1. The `GET /api/admin/kpis` endpoint (admin-only, protected by `X-Admin-Secret`)
2. The `GET /api/progress/summary` endpoint (per-user, no cross-user aggregation)

### Future Analytics (Post-Dogfood)

Any **additional** event collection beyond existing functional data — e.g., the `quest_started`, `choice_selected`, and `session_ended` events listed above — requires the following before implementation:

- [ ] Explicit parent opt-in via a consent toggle in `ParentSetupScreen`
- [ ] Privacy policy update disclosing server-side data retention
- [ ] Data retention policy (default: 90-day rolling window for raw events)
- [ ] Review for COPPA compliance if users under 13 are involved

**Decision checkpoint:** Revisit after dogfood when user volume justifies the infrastructure cost. Until then, the existing functional data provides sufficient signal for product iteration.

### What Is Never Collected

Regardless of the above, the following is never collected server-side:

- Raw message text from kid mode sessions
- Names, photos, or school information without explicit consent
- Device identifiers, IP addresses for tracking purposes
- Behavioral data sold to or shared with third parties

