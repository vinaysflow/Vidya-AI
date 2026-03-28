# Vidya Codebase Audit

**Date:** March 2025  
**Scope:** Frontend (apps/web), Backend (apps/api), and FE–BE connections.

---

## Executive Summary

| Area | Status | Critical issues |
|------|--------|-----------------|
| Frontend structure | OK | No error boundary; one debug `console.log`; env var name mismatch |
| Backend structure | OK | Game route errors not sent to Sentry; some routes lack Zod validation |
| FE–BE connections | **Broken** | GET `/api/user/:userId` missing; GET `/api/game/scene-image` not implemented |
| Auth & authorization | **Gaps** | user/dashboard/progress/gamification not scoped by API key |
| Resilience | Weak | No fetch retries/timeouts; no unhandled-rejection handler |

---

## 1. Frontend

### 1.1 Structure and entry points

- **Entry:** `index.html` → `main.tsx` → `App.tsx` (React 18, Vite 5).
- **Routing:** `react-router-dom` v6; routes: `/`, `/progress`, `/dashboard`, `/privacy`, `/parent-report`.
- **State:** Single Zustand store (`chatStore`) with `persist` (localStorage key `vidya-chat-storage-v2`); `offlineStore` for offline packs (IndexedDB).

### 1.2 API usage

- **Base URL:** `import.meta.env.VITE_API_URL || 'http://localhost:4000'`.
- **Auth:** `Authorization: Bearer <key>`; key from store, `getStoredApiKey()`, or `VITE_PUBLIC_API_KEY`.
- **No retries, no timeouts** — every call is a single `fetch()` with no `AbortController`.
- **Error handling:** Non-2xx → parse body, set store `error`, sometimes inject offline fallback message. No global toast or error boundary.

### 1.3 Environment variables

| Documented (.env.example) | Actually used in code |
|---------------------------|------------------------|
| `VITE_ENABLE_VOICE_INPUT` | **Not used** — code uses `VITE_ENABLE_VOICE` (featureFlags.ts) |
| `VITE_ENABLE_OFFLINE_MODE` | Not referenced in `src/` |
| `VITE_ENABLE_IMAGE_INPUT` | Not referenced in `src/` |
| `VITE_ENABLE_AI_SCENES` | GameScene.tsx |
| `VITE_API_URL` | lib/api.ts |
| `VITE_CLARITY_ID` | main.tsx |
| `VITE_PUBLIC_API_KEY` | lib/api.ts (fallback key) |

**Recommendation:** Align .env.example with code (e.g. rename to `VITE_ENABLE_VOICE`) or add both and document which is canonical.

### 1.4 Error boundaries and loading

- **No React error boundary** — a render error in any route unmounts the whole app.
- Loading states are present (chatStore `isLoading`, local state in dashboards, progress, kid components).
- Offline: `navigator.onLine` + OfflineBanner; on fetch failure, chat shows offline fallback message; PWA caches `https://api.vidya.app/*` (NetworkFirst).

### 1.5 Console usage (production)

- **Debug leftover:** `ParentSetupScreen.tsx` — `console.log('[Diagnostic] Score: ...')`. Should be removed or guarded.
- **Errors (intentional but visible):** `chatStore` (session/message/end/quiz/load errors), `VoiceButton`, `Message` (TTS), `offlineStore`. Consider a small logger that no-ops or sends to analytics in production.

### 1.6 TypeScript

- `strict: true`; `noUnusedLocals`/`noUnusedParameters`. Targeted `any` in API payloads, persisted state, and some component props (e.g. `visualContent.data`, BadgeGrid icons, GuardianLinkFlow).

### 1.7 Dependencies

- `@tanstack/react-query` is in package.json but **not used** (no useQuery/useMutation). Safe to remove if not planned.

### 1.8 State race risks

- **Double submit:** Two quick `sendMessage` calls can both run; second may call `startSession` again or both append assistant messages; last response wins, so message order can be wrong.
- **Stale get():** Async actions use `get()` after response; another action can mutate state in between.
- **No request cancellation:** In-flight fetches are not aborted on navigation or repeat actions; late responses can still call `set()`.

---

## 2. Backend

### 2.1 Entry and middleware

- **Entry:** `src/index.ts`; env loaded first (`env.ts`), then Sentry (`instrument.ts`), then Express.
- **Order:** helmet → cors → json/urlencoded → request logging → apiKeyAuth (skip `/health`, `/`, `/api/admin`) → rateLimiter (on `/api`) → usageTracker (on `/api`) → routes → 404 → Sentry error handler → global error handler.

### 2.2 Routes and validation

| Route | Validation | Error handling |
|-------|------------|----------------|
| tutor | Zod (StartSession, SendMessage, etc.) | try/catch → next(error) |
| admin | Zod + X-Admin-Secret | try/catch → next(error) |
| prompts | Zod on POST/admin; GET query/params often unvalidated | try/catch → next(error) |
| developer | Manual query parsing | try/catch → next(error) |
| gamification | Zod for streak-freeze; query userId unvalidated | try/catch → next(error) |
| progress | **init-from-diagnostic:** no Zod (only userId + results array) | try/catch → next(error) |
| user | No Zod; path param only | try/catch → next(error) |
| voice | Zod for synthesize; transcribe body | try/catch → next(error) |
| dashboard | Zod for link/approve/classroom/join | try/catch → next(error) |
| **game** | Zod only for scene-image (POST); others query parsing | **Local catch; does NOT call next(err)** — not Sentry |
| offline | No Zod; params as Subject | try/catch → next(error) |

**Recommendation:** Add Zod to progress `init-from-diagnostic` and game GET handlers; refactor game route to use `next(error)` so Sentry and global handler receive errors.

### 2.3 Database

- **Prisma:** Singleton in `src/lib/prisma.ts` (globalThis in dev for HMR). Single connection pool; no per-request client.
- **Connection:** Lazy; DATABASE_URL validated at startup. Use transaction-mode pooler (port 6543) and `connection_limit` in production to avoid pool exhaustion.

### 2.4 Environment variables

- **Validated in env.ts:** DATABASE_URL, PORT, NODE_ENV, optional ALLOWED_ORIGINS/ADMIN_SECRET, and at least one of OPENAI/ANTHROPIC API key.
- **Read at use site (not in env schema):** PUBLIC_API_KEY, REDIS_URL, Stripe, LLM provider/model config, Sentry, SMTP, voice/vision keys.

**Recommendation:** Document all required/optional env vars in env.ts or a single .env.example; optionally validate critical ones at startup.

### 2.5 Auth and authorization

- **Authentication:** API key via `Authorization: Bearer <key>`; validated against DB or PUBLIC_API_KEY. In development, missing key is allowed.
- **Admin:** `/api/admin/*` uses `X-Admin-Secret` only (no API key).
- **Scoping:**
  - **Tutor:** Sessions filtered by apiKeyId when key present and not public.
  - **Developer:** Usage/status scoped by apiKeyId.
  - **User, dashboard, progress, gamification:** Use userId/studentId/classroomId from path/query/body but **do not** check that the API key “owns” that resource. Any valid key can act on any userId.

**Recommendation:** Introduce tenant/ownership model (e.g. key ↔ userId or orgId) and enforce it on user, dashboard, progress, and gamification routes.

### 2.6 Error handling and logging

- **Global handler:** ZodError → 400 + details; Prisma (P*) → 400 + code; else status from error, message in body. Always `console.error('Error:', err)` (full object).
- **Sentry:** Strips Authorization and X-Admin-Secret from request; other context may include body/query.
- **Game route:** Catches errors and responds with 400/500 JSON but does **not** call `next(err)`, so those errors never reach Sentry or the global handler.
- **Unhandled rejections:** No `process.on('unhandledRejection')` in index.ts.

**Recommendation:** Use `next(err)` in game route; add unhandledRejection handler to log and optionally report to Sentry.

---

## 3. FE–BE Connections (Breaking Points)

### 3.1 Missing backend route

| Frontend call | Backend | Impact |
|---------------|---------|--------|
| **GET `/api/user/:userId`** | Only **DELETE** `/:userId/data` exists in [apps/api/src/routes/user.ts](apps/api/src/routes/user.ts) | `fetchProfileAndMastery()` never gets profile; `grade` from API is never set. No crash; graceful skip. |

**Fix:** Add GET `/api/user/:userId` that returns `{ success: true, user: { id, grade, effectiveGrade?, ... } }` (and optionally other profile fields). Scope by API key if/when tenant model exists.

### 3.2 Method/contract mismatch

| Frontend call | Backend | Impact |
|---------------|---------|--------|
| **GET `/api/game/scene-image?questTitle=...&chapter=...&tags=...&phase=...`** in [GameScene.tsx](apps/web/src/components/kid/GameScene.tsx) (line 330) | Only **POST** `/scene-image` with JSON body in [game.ts](apps/api/src/routes/game.ts) (line 24) | GET returns 404; fetch is in `.catch()` so UI falls back to SVG scene silently. |

**Fix (choose one):**

- **Option A:** Change GameScene to POST with body (like QuestScene) and use `getApiBase()` for consistency.
- **Option B:** Add GET `/scene-image` in game.ts that parses query params and returns the same shape.

### 3.3 API base URL in dev

- Most FE code uses `getApiBase()` (absolute `http://localhost:4000`).
- GameScene uses **relative** `/api/game/scene-image`, so in dev it goes through Vite proxy. If you fix the scene-image call with Option A and use `getApiBase()`, behavior stays correct in both dev and prod.

### 3.4 Other FE calls

- Tutor (session start, message, end, quiz, load), progress (summary, mastery-by-concept, due-reviews, radar, path, init-from-diagnostic), gamification (profile, leaderboard), game (review-quest, diagnostic-quiz), voice (synthesize, transcribe), dashboard, offline pack — **all have matching backend routes** and aligned request/response handling where checked.
- `/api/offline/packs/manifest` exists on backend; no FE caller found (optional for future use).

---

## 4. Improvement Checklist

### High priority (fixes breakage or security)

1. **Add GET `/api/user/:userId`** — return user profile (at least grade) so frontend can set it in store.
2. **Fix scene-image call** — either switch GameScene to POST + body and `getApiBase()`, or add GET handler with query params.
3. **Scope user/dashboard/progress/gamification by API key** (or tenant) so a key cannot access arbitrary userIds/resources.
4. **Game route errors to Sentry** — use `next(err)` (or equivalent) in game.ts so errors are logged and reported.

### Medium priority (resilience and cleanliness)

5. **Remove or guard debug log** — ParentSetupScreen `console.log('[Diagnostic] ...')`.
6. **Align env var names** — VITE_ENABLE_VOICE vs VITE_ENABLE_VOICE_INPUT and document in .env.example.
7. **Add React error boundary** — wrap app or main routes to avoid full white screen on render errors.
8. **Optional: fetch retries/timeouts** — e.g. wrapper with AbortController and 1–2 retries for critical calls (session start, message).
9. **Add unhandledRejection handler** — log and optionally report to Sentry.

### Lower priority

10. **Zod for progress init-from-diagnostic** — validate body shape.
11. **Zod for game GET handlers** — validate query params.
12. **Remove @tanstack/react-query** from package.json if unused.
13. **Centralize API error handling** — e.g. one fetch wrapper that sets store error and optionally triggers toast.

---

## 5. Reference: Key file locations

| Concern | File(s) |
|---------|--------|
| FE API base & auth | apps/web/src/lib/api.ts |
| FE main store & session/message | apps/web/src/stores/chatStore.ts |
| FE profile fetch (broken GET user) | chatStore.ts `fetchProfileAndMastery` |
| FE scene-image (GET vs POST) | apps/web/src/components/kid/GameScene.tsx |
| BE user routes | apps/api/src/routes/user.ts |
| BE game routes | apps/api/src/routes/game.ts |
| BE auth middleware | apps/api/src/middleware/auth.ts |
| BE global error handler | apps/api/src/index.ts |
| Prisma singleton | apps/api/src/lib/prisma.ts |
| Env validation | apps/api/src/env.ts |
