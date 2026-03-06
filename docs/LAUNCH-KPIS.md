# Launch KPIs

## Product Overview (as of March 2026)

Vidya is an AI-powered Socratic tutor with a game-first kid mode (grades 3-7) and a general-purpose Socratic conversation mode for older students/adults. It combines never-give-the-answer pedagogy, Duolingo-style gamification, adaptive difficulty, and RSM curriculum alignment.

## North-Star Outcomes

- **Learner value**: measurable mastery lift within 3 sessions for core topics.
- **Engagement**: kids voluntarily return without parental prompting.
- **Trust**: low unsafe/hallucinated response rate; parent confidence in safety.

## Kid Mode KPIs (Primary Focus - Dogfooding)

### Engagement (Target: RSM families, grades 3-7)

| Metric | Target | How Measured |
|--------|--------|-------------|
| Session length (minutes) | >= 10 min median | Session start/end timestamps |
| Quests completed per session | >= 1.5 | Quest complete events |
| Day-1 return | >= 40% | Unique device revisit within 24h |
| Day-7 return | >= 20% | Unique device revisit within 7 days |
| Streak length (median) | >= 3 days | Gamification profile |
| Sessions per active user/week | >= 3.0 | Session count by device |

### Learning Efficacy

| Metric | Target | How Measured |
|--------|--------|-------------|
| Mastery delta per 3 sessions | +10% median | BKT mastery tracker (Progress table) |
| Explain-back success rate | >= 50% | Correct explain-back choice on first try |
| Hint ladder progression without loops | >= 80% | Engine hintLevel tracking |
| Adaptive grade-up rate | >= 20% of active users within 2 weeks | effectiveGrade increases |
| RSM quest completion rate | >= 60% | RSM-tagged quest completions |

### Gamification Health

| Metric | Target | Notes |
|--------|--------|-------|
| XP earned per session | >= 30 median | MESSAGE_SENT(5) + SESSION_COMPLETE(25) minimum |
| Level-up rate | >= 1 per week per active user | 100 XP per level |
| Badge unlock rate | >= 2 badges in first week | 11 badge types available |
| Streak freeze usage | < 30% of freeze-eligible days | If too high, kids are disengaging |

## General Mode KPIs (Secondary - Older Students/Adults)

| Metric | Target | How Measured |
|--------|--------|-------------|
| Onboarding completion rate | >= 70% | 4-step wizard completion |
| First-response success rate | >= 98% | No error/fallback on first message |
| Session completion (>= 4 turns) | >= 55% | Turn count per session |
| Mastery delta per 3 sessions | +10% median | BKT mastery tracker |

## Trust & Safety

| Metric | Target | How Measured |
|--------|--------|-------------|
| Answer leak rate | < 2% | `answer_leak` safety events in metadata |
| Unsafe response rate | < 0.5% | Manual review + safety event logging |
| Choice format compliance (kid mode) | >= 95% | [A]/[B]/[C] present in responses |
| Off-topic/hallucination rate | < 3% | Session review sampling |

## Reliability & Cost

| Endpoint | p50 Target | p95 Target | Error Rate |
|----------|-----------|-----------|------------|
| `/api/tutor/session/start` | < 3s | < 8s | < 2% |
| `/api/tutor/message` | < 5s | < 15s | < 5% |
| `/api/gamification/profile` | < 200ms | < 500ms | < 1% |

| Cost Metric | Target |
|-------------|--------|
| LLM cost per kid session (median) | < $0.05 |
| LLM cost per adult session (median) | < $0.10 |
| Monthly infrastructure (Railway + Supabase) | < $50 at dogfood scale |

## Business (Pre-Revenue)

| Metric | Target | Notes |
|--------|--------|-------|
| Dogfood families | >= 5 within 4 weeks | RSM parent network |
| Net Promoter Score (parent) | >= 8/10 | Post-2-week survey |
| "Would pay" signal | >= 60% of parents | Survey: "Would you pay $15-20/mo?" |
| Pricing sweet spot validation | $15-25/mo | Compare to RSM ($150-300/mo) and Khanmigo ($4/mo) |

## Measurement Notes

- All KPIs tracked by grade + subject to identify weak spots.
- Kid mode metrics are primary for the first 4 weeks (dogfooding phase).
- No PII in analytics — device-level tracking only (localStorage, no accounts).
- Review KPIs weekly; adjust targets after first 2 weeks of data.
