# Release Criteria (Public Launch)

## Quality Gates

- `pnpm build` passes for API and Web.
- `pnpm typecheck` passes.
- `pnpm test` passes (all required suites).
- CI workflows green on the release commit.

## Product Gates

- Onboarding completion rate >= 70% in the last 7 days.
- Session completion rate (>= 4 turns) >= 55%.
- Core subjects show mastery lift in session reports.

## Reliability Gates

- p95 latency within SLOs (see `docs/LAUNCH-KPIS.md`).
- 5xx error rate < 1% in the last 7 days.
- Load test meets p50/p95 targets for `/health`, `/api/tutor/session/start`, `/api/tutor/message`.

## Trust & Safety Gates

- Unsafe response rate < 0.5%.
- Overly-direct answers in Socratic mode < 5%.
- Sentry alerts configured and tested.

## Operational Gates

- Secrets rotated and verified (see `docs/SECURITY-RUNBOOK.md`).
- Rollback procedure rehearsed and documented.
- Go/No-Go checklist completed (`docs/GO-NO-GO-CHECKLIST.md`).
