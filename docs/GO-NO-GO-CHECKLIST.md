# Go / No-Go Launch Checklist

Use this checklist before every production deploy or public-facing release.

## Quality Gate

- [ ] `pnpm build` succeeds with zero errors for both API and Web.
- [ ] `pnpm typecheck` passes with zero errors.
- [ ] `pnpm test` passes — all required suites green.
- [ ] CI workflow (`ci.yml`) passes on the deploy commit.

## Security

- [ ] All API keys rotated since last known exposure (see `docs/SECURITY-RUNBOOK.md`).
- [ ] Old/exposed keys revoked in provider dashboards (OpenAI, Anthropic, Stripe).
- [ ] `.env.local` files are NOT committed (verify with `git status`).
- [ ] Railway production variables match the checklist in `docs/SECURITY-RUNBOOK.md`.
- [ ] `ADMIN_SECRET` is unique per environment (not shared between dev/staging/prod).

## Deployment

- [ ] Railway deploy workflow (`deploy-railway.yml`) completed successfully.
- [ ] `/health` endpoint returns 200 on the production URL.
- [ ] Database migrations applied (`prisma db push` or migrate deploy).
- [ ] Redis connection verified (cache connected log in Railway).
- [ ] Feature freeze flag set for release candidate (`VITE_FEATURE_FREEZE=true`).

## Observability

- [ ] `SENTRY_DSN` is set in Railway production variables.
- [ ] Sentry receives a test event (trigger a 500 error or use Sentry test route).
- [ ] Alert rules configured in Sentry:
  - Error rate spike (>5 errors/minute).
  - New issue regression alert.
- [ ] On-call notification channel (email or Slack) connected to Sentry.

## Performance (SLO Targets)

| Endpoint | p50 Target | p95 Target | Error Rate |
|----------|-----------|-----------|------------|
| `/health` | < 50ms | < 100ms | 0% |
| `/api/tutor/session/start` | < 3s | < 8s | < 2% |
| `/api/tutor/message` | < 5s | < 15s | < 5% |

- [ ] Load test run against staging/production (`npx tsx scripts/load-test.ts <url>`).
- [ ] All endpoints meet SLO targets above under expected load.
- [ ] Estimated token cost per session is acceptable (check OpenAI/Anthropic dashboards).

## Rollback Plan

- [ ] Previous working Railway deployment is bookmarked for instant rollback.
- [ ] Rollback procedure documented: Railway Dashboard > Deployments > Redeploy previous.
- [ ] Database rollback strategy defined (if migration was destructive, have a snapshot).

## Final Sign-off

- [ ] Product owner reviewed and approved.
- [ ] Load test results attached or linked.
- [ ] Decision: **GO** / **NO-GO**

Date: ___________  
Signed: ___________
