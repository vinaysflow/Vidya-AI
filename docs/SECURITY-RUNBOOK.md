# Security Runbook

## Architecture Overview

Vidya has two attack surfaces:
- **API** (Express server on Railway) — handles LLM calls, database access, session management.
- **Web** (Static React app) — no secrets, no server-side rendering. All config is public `VITE_*` env vars.

Kid mode stores everything in `localStorage` — no user accounts, no server-side profiles for children. This is a deliberate COPPA-compliance choice.

## Secret Inventory

| Secret | Where Used | Exposure Risk |
|--------|-----------|--------------|
| `OPENAI_API_KEY` | API server only | High — direct cost if leaked |
| `ANTHROPIC_API_KEY` | API server only | High — direct cost if leaked |
| `DATABASE_URL` | API server only | Critical — full DB access |
| `ADMIN_SECRET` | API admin routes | Medium — admin endpoint access |
| `STRIPE_SECRET_KEY` | API billing (if enabled) | High — financial |
| `REDIS_URL` | API caching | Low — cache data only |
| `SENTRY_DSN` | API error reporting | Low — read-only error submission |

## Where Secrets Live

| Environment | Storage | Access |
|------------|---------|--------|
| Local dev | `apps/api/.env` (git-ignored) | Developer only |
| CI (GitHub Actions) | Repository Secrets | Org admins |
| Production (Railway) | Service Variables | Project admins |

## Files That Must NEVER Be Committed

- `apps/api/.env` (contains real keys)
- `apps/api/.env.local`
- Any file with raw API keys, tokens, or database passwords

The root `.gitignore` blocks `.env` and `.env.*` (except `.env.example` and `.env.local.example`).

**Verification command:**
```bash
git ls-files | grep -i env
# Should only show .env.example and .env.local.example files
```

## Current Security Status

- [x] `.env` files git-ignored and never committed (verified in git history).
- [x] `.env.example` files contain only placeholder values.
- [x] Frontend has zero secrets — only `VITE_API_URL` and feature flags.
- [x] `README.md` examples use placeholder patterns (`sk-ant-your-key-here`).
- [x] Kid mode: no accounts, no PII, localStorage-only.
- [ ] OPENAI_API_KEY should be rotated (recommended before sharing with families).
- [ ] ADMIN_SECRET should be set to a strong random value in production.

## Railway Production Variables Checklist

All of the following must be set in Railway before deploy:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase) |
| `LLM_PROVIDER` | Yes | `openai` or `anthropic` |
| `LLM_FALLBACK_PROVIDER` | No | Optional secondary provider |
| `OPENAI_API_KEY` | If using OpenAI | |
| `ANTHROPIC_API_KEY` | If using Anthropic | |
| `OPENAI_ANALYSIS_MODEL` | No | Defaults to `gpt-4.1-nano` |
| `OPENAI_RESPONSE_MODEL` | No | Defaults to `gpt-4.1-nano` |
| `REDIS_URL` | Recommended | Redis/Upstash connection string |
| `ADMIN_SECRET` | Yes | For admin API endpoints |
| `PORT` | No | Railway sets `PORT` automatically |
| `NODE_ENV` | Yes | Set to `production` |
| `ALLOWED_ORIGINS` | Yes | Production frontend URL(s), comma-separated |
| `SENTRY_DSN` | Recommended | For error monitoring |

## Key Rotation Procedure

### When to Rotate

- A secret was committed to version control (even if force-pushed away).
- A team member with access leaves.
- Before sharing the product with external users (dogfood families).
- Periodic rotation (recommended: every 90 days).

### OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Create a new key with the same permissions.
3. Update in Railway variables (`OPENAI_API_KEY`).
4. Update local `apps/api/.env`.
5. Verify: start a tutoring session on production.
6. Delete the old key in OpenAI dashboard.

### Anthropic API Key

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Create a new key.
3. Update in Railway (`ANTHROPIC_API_KEY`) and local `.env`.
4. Verify with a test session.
5. Delete the old key.

### Admin Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Update in Railway (`ADMIN_SECRET`) and local `.env`.

### Database Password

1. Reset password in Supabase dashboard.
2. Update `DATABASE_URL` in Railway and local `.env`.
3. Verify API starts and can query the database.

## Leak Response Checklist

If a secret is confirmed leaked:

- [ ] **Rotate immediately** — do not wait.
- [ ] **Revoke the old key** in the provider dashboard.
- [ ] **Audit usage** — check provider dashboards for unexpected charges.
- [ ] **Check git history** — if committed, use BFG Repo Cleaner to remove.
- [ ] **Force-push** cleaned history.
- [ ] **Notify stakeholders** with scope and remediation status.
- [ ] **Update this runbook** if the leak revealed a process gap.

## COPPA Compliance Posture

Vidya's kid mode is designed for COPPA compliance:

| Requirement | How Vidya Addresses It |
|------------|----------------------|
| Parental consent | Parent-first entry flow; parent must set up kid mode |
| No data collection from children | All kid data in localStorage; no server-side child profiles |
| No accounts for children | No sign-up, no email, no identifiers |
| No third-party data sharing | LLM API calls contain session context only, no child identity |
| Transparency | Compliance disclosure on ParentSetupScreen |
| Data deletion | "Reset All Data" button wipes everything instantly |

**Note:** LLM API calls do send conversation content to OpenAI/Anthropic. This content contains no PII (no names, no identifiers). Review provider data retention policies before public launch beyond dogfood.
