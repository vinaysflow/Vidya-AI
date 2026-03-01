# Security Runbook

## Secret Management

### Where secrets live

| Environment | Storage | Access |
|------------|---------|--------|
| Local dev | `apps/api/.env.local` (git-ignored) | Developer only |
| CI (GitHub Actions) | Repository Secrets | Org admins |
| Production (Railway) | Service Variables | Project admins |

### Files that must NEVER be committed

- `.env.local` (any directory)
- `.env` with real values
- Any file containing raw API keys, tokens, or passwords

The root `.gitignore` blocks `.env` and `.env.*` (except `.env.example` and `.env.local.example`).

### Setting up secrets locally

```bash
cd apps/api
cp .env.local.example .env.local
# Fill real values in .env.local
```

### Setting up secrets in Railway

1. Go to your Railway project dashboard.
2. Select the `api` service.
3. Open the **Variables** tab.
4. Add each required variable (see `.env.example` for the full list).
5. Railway auto-restarts the service on variable changes.

### Setting up secrets in GitHub Actions

1. Go to **Settings > Secrets and variables > Actions**.
2. Add repository secrets:
   - `RAILWAY_TOKEN` — Railway deploy token (project-scoped)

CI does not need LLM keys — tests run without live LLM calls.

---

## Key Rotation Procedure

### When to rotate

- A secret was committed to version control (even if force-pushed away).
- A team member with access leaves.
- Periodic rotation schedule (recommended: every 90 days).

### Step-by-step rotation

#### 1. OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Create a new API key with the same permissions.
3. Update the key in Railway variables (`OPENAI_API_KEY`).
4. Update your local `.env.local`.
5. Verify the API responds correctly (hit `/health` and send a test message).
6. Delete the old key in the OpenAI dashboard.

#### 2. Anthropic API Key

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Create a new API key.
3. Update in Railway (`ANTHROPIC_API_KEY`) and local `.env.local`.
4. Verify with a test message.
5. Delete the old key.

#### 3. Admin Secret

1. Generate a new secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update in Railway (`ADMIN_SECRET`) and local `.env.local`.
3. Existing admin sessions will be invalidated (expected).

#### 4. Database URL

1. If using Supabase: reset the database password in the dashboard.
2. Update `DATABASE_URL` in Railway and local `.env.local`.
3. Verify with `npx prisma db push --accept-data-loss` (staging only) or check `/health`.

#### 5. Stripe Secret Key

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
2. Roll the secret key.
3. Update in Railway (`STRIPE_SECRET_KEY`) and local `.env.local`.

---

## Leak Response Checklist

If a secret is confirmed leaked (e.g., committed, logged, exposed in error response):

- [ ] **Rotate immediately** — do not wait. Follow the rotation steps above.
- [ ] **Revoke the old key** in the provider dashboard.
- [ ] **Audit usage** — check provider dashboards (OpenAI, Anthropic, Stripe) for unexpected usage since the leak time.
- [ ] **Check git history** — if committed, use `git filter-branch` or BFG Repo Cleaner to remove from history, then force-push.
- [ ] **Notify the team** — post in the team channel with the scope and remediation status.
- [ ] **Update this runbook** if the leak revealed a gap in process.

---

## Railway Production Variables Checklist

All of the following must be set in Railway before deploy:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LLM_PROVIDER` | Yes | `anthropic` or `openai` |
| `LLM_FALLBACK_PROVIDER` | No | Optional secondary provider |
| `ANTHROPIC_API_KEY` | If using Anthropic | |
| `OPENAI_API_KEY` | If using OpenAI | |
| `ANTHROPIC_ANALYSIS_MODEL` | No | Defaults to `claude-3-haiku-20240307` |
| `ANTHROPIC_RESPONSE_MODEL` | No | Defaults to `claude-3-haiku-20240307` |
| `OPENAI_ANALYSIS_MODEL` | No | Defaults to `gpt-4.1-nano` |
| `OPENAI_RESPONSE_MODEL` | No | Defaults to `gpt-4.1-nano` |
| `REDIS_URL` | Yes | Redis/Upstash connection string |
| `ADMIN_SECRET` | Yes | For admin API endpoints |
| `PORT` | No | Defaults to 4000; Railway sets `PORT` automatically |
| `NODE_ENV` | Yes | Set to `production` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed CORS origins |
| `STRIPE_SECRET_KEY` | If billing enabled | |
| `STRIPE_METER_EVENT_NAME` | If billing enabled | |
| `SENTRY_DSN` | Recommended | For error monitoring |
