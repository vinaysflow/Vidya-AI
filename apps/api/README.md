# Vidya API

Socratic AI tutoring API for JEE/NEET, essay coaching, and counseling.

## Quick start

```bash
# Install dependencies
pnpm install

# Set up environment (safe local-secrets pattern)
cp .env.example .env
cp .env.local.example .env.local

# Push schema to database
npx prisma db push

# Seed a dev API key
pnpm db:seed

# Start dev server (port 4000)
pnpm dev
```

## Architecture

```
src/
├── index.ts                  # Express server entry point
├── middleware/
│   ├── auth.ts               # API key authentication
│   ├── rateLimit.ts          # Per-key rate limiting (soft + hard)
│   └── usageTracker.ts       # Buffered per-key/day/endpoint usage recording
├── routes/
│   ├── tutor.ts              # Tutoring session endpoints
│   ├── developer.ts          # Self-service usage & status for key owners
│   ├── admin.ts              # API key CRUD + Stripe billing management
│   └── prompts.ts            # Essay prompt knowledge base
├── services/
│   ├── stripe.ts             # Stripe Billing Meters integration
│   ├── cache/                # Redis / in-memory cache
│   ├── nlp/                  # Essay NLP analysis
│   └── socratic/             # Socratic engine (STEM, essay, counselor)
├── jobs/
│   └── reportOverageToStripe.ts  # Daily cron: report overage to Stripe
└── prisma/
    └── schema.prisma         # Database schema
```

## API surface

All endpoints require `Authorization: Bearer vk_live_xxx` in production.

| Group | Endpoint | Description |
|-------|----------|-------------|
| System | `GET /health` | Health check (no auth) |
| Tutoring | `POST /api/tutor/session/start` | Start a session |
| | `POST /api/tutor/message` | Send a message, get Socratic response |
| | `GET /api/tutor/session/:id` | Get session details |
| | `POST /api/tutor/session/:id/end` | End session, get coaching report |
| | `GET /api/tutor/session/:id/summary` | Get session report |
| | `GET /api/tutor/sessions` | List sessions |
| Developer | `GET /api/developer/status` | Key config, tier, billing status |
| | `GET /api/developer/usage` | Daily usage breakdown with overage |
| | `GET /api/developer/usage/summary` | Quick usage summary (today/week/month) |
| Admin | `POST /api/admin/keys` | Create API key |
| | `GET /api/admin/keys` | List all keys |
| | `PATCH /api/admin/keys/:id` | Update key settings |
| | `DELETE /api/admin/keys/:id` | Deactivate key |
| | `POST /api/admin/keys/:id/stripe-attach` | Link Stripe billing |
| | `POST /api/admin/keys/:id/stripe-detach` | Remove Stripe billing |
| Prompts | `GET /api/prompts/schools` | List schools |
| | `GET /api/prompts/schools/:slug/prompts` | Get essay prompts for a school |
| | `POST /api/prompts/contribute` | Submit a user-discovered prompt |

Full contract: [`openapi.yaml`](openapi.yaml)

## Rate limiting and overage billing

### How it works

| Tier | Limit | Over limit behavior |
|------|-------|---------------------|
| FREE | 100 req/min | Hard block: returns `429` |
| STANDARD | 500 req/min | Soft limit: request allowed, counted as overage, billed |
| PREMIUM | 1000 req/min | Soft limit: request allowed, counted as overage, billed |

Every response includes `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers. When a STANDARD/PREMIUM request goes over the limit, the response also includes `X-RateLimit-Overage: true`.

### Data flow

1. **Rate limiter** (`rateLimit.ts`) counts requests per key per 60-second window in Redis (in-memory fallback). Over-limit requests from paid tiers are flagged with `req.isOverage = true` and allowed through.
2. **Usage tracker** (`usageTracker.ts`) buffers all request counts in memory and flushes to `UsageRecord` every 30 seconds. Overage requests increment `overageCount` alongside `requestCount`.
3. **Daily cron job** (`jobs/reportOverageToStripe.ts`) aggregates `overageCount` per key for the previous day and reports it to Stripe via the Billing Meters API. A `StripeUsageReport` row prevents double-reporting.

### Stripe setup

1. **Create a Billing Meter** in Stripe Dashboard:
   - Event name: `vidya_api_overage` (or your `STRIPE_METER_EVENT_NAME`)
   - Aggregation: Sum
2. **Create a Product + Price** using that meter (usage-based, e.g. $0.001/request)
3. **Create Subscriptions** for each paying customer using that price
4. **Link keys to customers** via admin API:
   ```bash
   curl -X POST http://localhost:4000/api/admin/keys/KEY_ID/stripe-attach \
     -H "Content-Type: application/json" \
     -H "X-Admin-Secret: $ADMIN_SECRET" \
     -d '{"stripeCustomerId": "cus_xxx"}'
   ```
5. **Schedule the daily job** (e.g. crontab, Railway cron, or similar):
   ```bash
   # At 00:05 UTC every day
   5 0 * * * cd /path/to/vidya/apps/api && npx tsx src/jobs/reportOverageToStripe.ts
   ```

### Environment variables

```bash
# Keep committed `.env` non-sensitive.
# Put all real API keys/secrets in `.env.local`.

# Required
DATABASE_URL="postgresql://..."
ADMIN_SECRET="..."

# LLM provider routing
LLM_PROVIDER="anthropic"            # anthropic | openai
LLM_FALLBACK_PROVIDER="openai"      # optional

# Provider API keys (configure at least the primary)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-proj-..."

# Optional model overrides
ANTHROPIC_ANALYSIS_MODEL="claude-3-haiku-20240307"
ANTHROPIC_RESPONSE_MODEL="claude-3-haiku-20240307"
OPENAI_ANALYSIS_MODEL="gpt-4.1-nano"
OPENAI_RESPONSE_MODEL="gpt-4.1-nano"

# Optional cost controls
LLM_TOKEN_CHARS=4                 # tokens ≈ chars/4
LLM_MAX_TOKENS_PER_MINUTE=0       # 0 = disabled
LLM_MAX_TOKENS_PER_DAY=0          # 0 = disabled

# Optional (Redis — falls back to in-memory)
REDIS_URL="redis://localhost:6379"

# Optional (Stripe — billing is no-op without these)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_METER_EVENT_NAME="vidya_api_overage"
```

## Database

PostgreSQL via Prisma. Key models:

- **ApiKey** -- Per-client authentication with tier, rate limit, Stripe linkage
- **UsageRecord** -- Per-key/day/endpoint counts (requests, errors, overage)
- **StripeUsageReport** -- Deduplication log for daily Stripe reporting
- **Session / Message** -- Tutoring session state
- **School / EssayPrompt** -- Essay prompt knowledge base

```bash
npx prisma db push     # Apply schema (dev)
npx prisma migrate dev # Create migration (production)
npx prisma studio      # Visual DB browser
```

## Load testing

Run a lightweight load test against a running API server:

```
pnpm --filter @vidya/api load-test
```

This script reports p50/p95 latency and error rate for `/health`, `/api/tutor/session/start`, and `/api/tutor/message`.

## Scripts

```bash
pnpm dev               # Dev server with hot reload
pnpm build             # TypeScript compilation
pnpm start             # Production server
pnpm test              # Run tests (vitest)
pnpm db:push           # Apply schema changes
pnpm db:seed           # Seed dev API key
pnpm db:studio         # Open Prisma Studio

# Manual overage report
npx tsx src/jobs/reportOverageToStripe.ts           # yesterday
npx tsx src/jobs/reportOverageToStripe.ts 2026-02-27  # specific date
```
