# Launch Runbook

Use this runbook on public launch day to minimize risk and ensure fast rollback if needed.

## Pre-launch (T-24h to T-1h)

- Confirm `docs/GO-NO-GO-CHECKLIST.md` is fully checked and signed.
- Set `VITE_FEATURE_FREEZE=true` in production to prevent last-minute UI changes.
- Verify `SENTRY_DSN` is present and alert rules are active.
- Ensure API keys are rotated and `ADMIN_SECRET` is unique per environment.
- Run the load test against staging or production and save the results.

## Launch (T-0)

- Deploy via `deploy-railway.yml`.
- Hit `/health` and verify status, timestamp, and version.
- Start a smoke session: `/api/tutor/session/start` → `/api/tutor/message`.
- Check Sentry for new issues/regressions.

## Monitor (T+0 to T+24h)

- Watch error rate and latency SLOs in Sentry and Railway logs.
- Monitor API usage, overage counts, and token spend dashboards.
- Watch for safety events in response metadata (e.g., `answer_leak`, `budget_exceeded`).

## Rollback

- Use Railway Deployments to redeploy the last known good release.
- If migrations were applied, confirm rollback safety or restore from snapshot.

## Post-launch (T+24h)

- Turn off `VITE_FEATURE_FREEZE` if stability is confirmed.
- Document issues and follow-up fixes in the next sprint.
