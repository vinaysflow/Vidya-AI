# Go / No-Go Checklist

Use before every production deploy or sharing with dogfood families.

## Quality Gate

- [ ] `pnpm build` succeeds with zero errors for both API and Web.
- [ ] `npx tsc --noEmit` passes with zero errors in both apps.
- [ ] All 20 Playwright E2E tests pass (`npx playwright test e2e/kid-mode.spec.ts`).
- [ ] No new lint errors in changed files.

## Product Gate (Kid Mode)

- [ ] RoleSelectorScreen renders on fresh visit (no localStorage).
- [ ] "Set up Kid Mode" leads to ParentSetupScreen with compliance disclosure.
- [ ] "Start Learning" leads to adult onboarding wizard.
- [ ] ParentSetupScreen: grade highlight-select + RSM toggle + "Let's go!" CTA works.
- [ ] Quest picker: accordion chapters, RSM quests float to top when RSM mode on.
- [ ] Clicking a quest starts a session with [A]/[B]/[C] choices on every turn.
- [ ] Explain-back phase fires after correct answer (grade <= 5).
- [ ] Victory screen shows on quest completion with "Next Adventure!" button.
- [ ] XP bar updates after each message; no fly-up animation on page refresh.
- [ ] Level-up modal does NOT reappear on page refresh.
- [ ] Streak banner shows persistent count (not animated on refresh).
- [ ] "Parent Settings" button on quest picker returns to ParentSetupScreen.
- [ ] "Reset All Data" in Settings wipes everything and returns to RoleSelectorScreen.

## Product Gate (General Mode)

- [ ] 4-step onboarding wizard shows for adult path (subject, language, goal, difficulty).
- [ ] Subject picker and starter prompts render correctly.
- [ ] Socratic conversation works — hints, scaffolding, never gives answer.
- [ ] Session end report generates with concepts, strengths, next steps.

## Security

- [ ] `apps/api/.env` is NOT in git (`git status` clean).
- [ ] Railway production variables set (see `docs/SECURITY-RUNBOOK.md`).
- [ ] `OPENAI_API_KEY` rotated if previously exposed.
- [ ] `ADMIN_SECRET` is unique per environment.
- [ ] `ALLOWED_ORIGINS` in Railway includes the production frontend URL.
- [ ] No hardcoded secrets in any tracked file (`git diff` reviewed).

## Deployment

- [ ] Push to `main` triggers Railway auto-deploy.
- [ ] API service starts and responds on production URL.
- [ ] Database migrations applied (Prisma schema matches production).
- [ ] Seed data loaded (95 quests, 400+ templates, 126+ concepts).
- [ ] Web app served and loads correctly on production URL.

## Observability

- [ ] `SENTRY_DSN` set in Railway (if available).
- [ ] Error logging visible in Railway logs.
- [ ] LLM provider health check passing on startup.

## Performance

| Endpoint | p50 Target | p95 Target |
|----------|-----------|-----------|
| `/api/tutor/session/start` | < 3s | < 8s |
| `/api/tutor/message` | < 5s | < 15s |

- [ ] Manual smoke test: start session, send 3 messages, end session.
- [ ] Kid mode smoke test: select quest, answer 2 questions, verify choices appear.

## Rollback Plan

- [ ] Previous working Railway deployment bookmarked.
- [ ] Database snapshot available (Supabase dashboard).

## Final Sign-off

- [ ] All checkboxes above completed.
- [ ] Decision: **GO** / **NO-GO**

Date: ___________
Signed: ___________
