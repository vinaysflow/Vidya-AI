# Launch Runbook

## Context

Vidya deploys as two services:
- **API** (Express + Prisma + PostgreSQL) — Railway, auto-deploys from `main`
- **Web** (Vite + React) — static build, served via Railway or separate host

Repository: `https://github.com/vinaysflow/Vidya-AI.git` (branch: `main`)

## Pre-Launch (T-24h)

- [ ] Complete `docs/GO-NO-GO-CHECKLIST.md` — all boxes checked.
- [ ] Verify Railway env vars match `docs/SECURITY-RUNBOOK.md` checklist.
- [ ] Run `npx tsc --noEmit` in both `apps/api` and `apps/web` — zero errors.
- [ ] Run all 20 Playwright E2E tests — all green.
- [ ] Seed the production database:
  ```bash
  cd apps/api && npx prisma db push && npx tsx prisma/seed.ts
  ```
- [ ] Verify content loaded: 95 quests, 400+ templates, 126+ concepts.
- [ ] Test the full kid mode flow on production URL:
  1. Fresh visit → RoleSelectorScreen
  2. "Set up Kid Mode" → ParentSetupScreen with compliance
  3. Select grade 3 + RSM → "Let's go!"
  4. Quest picker with accordion + RSM badges
  5. Start a quest → [A]/[B]/[C] choices appear
  6. Complete quest → victory screen → "Next Adventure!"
- [ ] Test the adult flow: "Start Learning" → onboarding → subject picker → conversation.
- [ ] Test Reset All Data in Settings → back to RoleSelectorScreen.

## Launch (T-0)

- [ ] Push to `main` — Railway auto-deploys.
- [ ] Monitor Railway build logs for success.
- [ ] Hit the API health endpoint and verify response.
- [ ] Open the production web URL — RoleSelectorScreen should render.
- [ ] Run a smoke session through kid mode (quest start → 2 messages → end).
- [ ] Run a smoke session through adult mode (start → 2 messages).
- [ ] Check Railway logs for any errors or LLM failures.

## Share with Dogfood Families

- [ ] Send production URL to dogfood families.
- [ ] Include quick-start instructions:
  > 1. Open the link on your child's tablet/computer.
  > 2. Tap "Set up Kid Mode".
  > 3. Pick your child's grade and check RSM if applicable.
  > 4. Tap "Let's go!" — hand the device to your child.
  > 5. They pick a quest and start playing!
- [ ] Ask parents to note: minutes used, voluntary vs prompted, any frustration.

## Monitor (T+0 to T+7)

- [ ] Check Railway logs daily for errors.
- [ ] Review LLM provider dashboards for unexpected cost spikes.
- [ ] Collect parent feedback after 2-3 days (quick text/call).
- [ ] Check if kids are returning voluntarily (the real engagement signal).
- [ ] Watch for choice-format failures in logs (LLM omitting [A]/[B]/[C]).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API not responding | Check Railway logs; redeploy last good commit |
| LLM timeout/failure | Check OpenAI status page; API has fallback provider support |
| Kid sees adult onboarding | localStorage corrupted; use Reset All Data in Settings |
| Choices not appearing | LLM drift; retry logic handles this, but check logs for frequency |
| Database connection error | Verify `DATABASE_URL` in Railway; check Supabase dashboard |
| CORS error on frontend | Verify `ALLOWED_ORIGINS` includes production frontend URL |

## Rollback

- Railway Dashboard → Deployments → Redeploy previous working commit.
- If database migration was destructive: restore from Supabase snapshot.
- If LLM key is compromised: rotate immediately (see `docs/SECURITY-RUNBOOK.md`).

## Post-Launch (T+7)

- [ ] Compile dogfood results (see `docs/TRACKING-PLAN.md` observation protocol).
- [ ] Identify top 3 issues / feature requests from families.
- [ ] Plan next iteration based on engagement data and parent feedback.
- [ ] Consider adding Microsoft Clarity for session recordings (`VITE_CLARITY_ID`).
