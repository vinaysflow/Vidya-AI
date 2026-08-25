# Learner Model — Deployment & Operations

The learner model adds five tables (`LearnerEvent`, `Misconception`,
`MisconceptionState`, `LearnerTraits`, `BuddyState`) plus the `LearnerEventKind`
and `MisconceptionStatus` enums. This project is **`prisma db push`-driven**
(there is no `prisma/migrations` directory), so deploying schema = running
`prisma db push` against the target database.

## 1. Which database is production?

Railway's API service reads `DATABASE_URL` from its own service variables. There
are two options:

| Option | What it means | Provisioning needed |
| --- | --- | --- |
| **Supabase `siikqmrnxisjxotraqwh`** (recommended) | Point Railway's `DATABASE_URL` at the Supabase Session Pooler URI we already migrated to. | **None** — schema is already pushed, the 453-row misconception catalog is synced, and historical sessions are backfilled. |
| Railway Postgres plugin | Use Railway's own managed Postgres. | Full: `db push` + `db:seed` (concepts/templates) + `learner:release`. |

Recommended: set Railway `DATABASE_URL` to the Supabase Session Pooler URI
(`postgresql://postgres.siikqmrnxisjxotraqwh:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
password URL-encoded). Prod then uses the exact DB we've been seeding and testing.

> The `Dockerfile.api` build runs `prisma generate` + `tsc` only. It does **not**
> push schema or seed. Schema/catalog steps below are run explicitly (one-off),
> never silently on boot, so a deploy can't drop data.

## 2. Apply the learner schema to prod (one-off)

Run against the prod `DATABASE_URL` — locally with the prod URL exported, or as a
Railway one-off command on the API service:

```bash
# from apps/api
DATABASE_URL="<prod-url>" npm run learner:release
```

`learner:release` is idempotent and does two things:
1. `prisma db push` — creates the five tables + enums (no-op if they exist).
2. `learner-maintenance sync-catalog` — upserts the misconception catalog from
   `Concept.misconceptionsData` (+ any `QuestionTemplate.misconceptions`).

> Note: in this dataset **0 of 1675 templates carry `misconceptions`**, so the
> 453 catalog rows come entirely from `Concept.misconceptionsData`. Misconception
> inference therefore runs via the free-response keyword path, not the
> choice-card distractor path. Populating `QuestionTemplate.misconceptions` later
> will light up the (more precise) distractor path automatically.

## 3. Warm the model from history (optional, one-off)

If the prod DB has prior tutoring sessions but no learner events yet:

```bash
DATABASE_URL="<prod-url>" npm run learner:maintenance backfill
```

This replays `Message.metadata` into `LearnerEvent` rows (idempotent per
session), infers misconceptions, then rolls up traits + buddy state so the model
is demo-full instead of cold-start empty. If you point prod at the already-migrated
Supabase project, this has already been done.

## 4. Verify

```bash
DATABASE_URL="<prod-url>" npm run learner:smoke
```

Exercises the full chain (telemetry → misconception lifecycle → trait rollup →
buddy projection → tutor-director plan) against the live DB using a throwaway
user that cleans itself up. Exits non-zero on any failure.

## 5. Routine operations

```bash
# recompute traits + buddy for every user with events (e.g. after model tweaks)
DATABASE_URL="<prod-url>" npm run learner:maintenance rollup-all

# re-sync the catalog after editing concept/template content
DATABASE_URL="<prod-url>" npm run learner:maintenance sync-catalog
```

Per-turn writes (the telemetry spine) and per-session rollups happen
automatically inside the tutor routes; the commands above are only for schema
changes, content edits, and backfills.
