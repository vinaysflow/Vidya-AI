# Release Criteria

## Current Release: Dogfood v1 (March 2026)

Target audience: 5-10 RSM families with kids in grades 3-7.

## Quality Gates

- `pnpm build` passes for API and Web (zero errors).
- `npx tsc --noEmit` passes in both apps.
- All 20 Playwright E2E tests green.
- No regressions in visual regression screenshots.

## Product Gates — Kid Mode (Must-Have)

- Parent-first entry flow: RoleSelectorScreen -> ParentSetupScreen -> Quest Picker.
- Compliance disclosure visible on ParentSetupScreen (no data collection, local-only).
- 95 quests across 6 chapters with prerequisite-gated ordering.
- RSM curriculum track: 120+ templates, prompt overlay, quest float-to-top.
- [A]/[B]/[C] choices on every kid mode turn; retry logic if LLM omits them.
- Explain-back phase after correct answers (grade <= 5).
- Gamification: XP, levels, streaks, streak freezes, 11 badge types.
- Adaptive difficulty: effectiveGrade adjusts based on performance.
- Victory screen with confetti and "Next Adventure!" on quest completion.
- Reset All Data button in Settings.
- No stale animations on page refresh (XP fly-up, level-up modal cleared on mount).

## Product Gates — General Mode (Must-Have)

- 4-step onboarding wizard (subject, language, goal, difficulty).
- 11 subjects with module-specific Socratic engines.
- 7 languages in UI and tutoring prompts.
- Session reports with concepts, strengths, areas for improvement.
- Answer-leak detection and never-give-the-answer enforcement.

## Content Gates

| Content Type | Minimum Count | Current Count |
|-------------|--------------|---------------|
| Quests | 50 | 95 |
| Question templates | 200 | 400+ |
| Concepts | 80 | 126+ |
| RSM-aligned templates | 80 | 120+ |
| Chapters | 5 | 6 |

## Reliability Gates

- p95 latency within SLOs (session start < 8s, message < 15s).
- 5xx error rate < 2% over 24h.
- LLM failover works (primary provider down -> fallback provider).
- Offline fallback message displays when API unreachable.

## Trust & Safety Gates

- Answer leak rate < 2% (safety event logging).
- Choice format compliance >= 95% in kid mode.
- No PII collected — sessions stored in localStorage only (client-side).
- COPPA-ready: parent gate, no accounts, no tracking, compliance disclosure.

## Operational Gates

- Secrets not in git (verified).
- Railway env vars configured.
- Database seeded with full content.
- Rollback procedure tested.

## What's NOT Required for Dogfood v1

- Sentry monitoring (nice-to-have, not blocking).
- Stripe billing integration.
- Redis caching (can use in-memory for dogfood scale).
- Leaderboard / multiplayer features.
- Mobile app (PWA via browser is sufficient).
- Analytics pipeline (manual observation during dogfood).
- Teacher/classroom features.
