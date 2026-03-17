# Vidya (विद्या / ವಿದ್ಯಾ)

**The AI Tutor That Never Gives Answers**

Socratic questioning engine for ages 8-12 · 10 subjects · 7 languages · COPPA-compliant by architecture

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript 97%](https://img.shields.io/badge/typescript-97%25-blue)](https://github.com/vinaysflow/Vidya-AI)
[![Commits](https://img.shields.io/badge/commits-60+-green)](https://github.com/vinaysflow/Vidya-AI/commits/main/)

-----

## The Problem

Every AI tool children use today gives them answers. ChatGPT does their homework. Photomath solves their equations. Researchers are documenting the result: **cognitive offloading** — the brain learns to rely on the external tool rather than engaging in the effortful internal processes that build intelligence.

A 2026 Brookings Institution study across 50 countries concluded that AI in education can “undermine children’s foundational development.” A 2025 study at SBS Swiss Business School found a significant negative correlation between frequent AI use and critical thinking abilities, with younger individuals showing the strongest dependence.

For children ages 8–12, this is existential. These are the foundational years when the prefrontal cortex develops executive functions, logical reasoning, and symbolic thought. If a child learns to reason through problems at age 9, they carry that capability forward. If they learn to ask ChatGPT at age 9, they carry that dependency forward instead.

**The market gap:** Over 20 million children ages 8–12 in the US alone. No AI tutoring product is purpose-built for their foundational learning years. Khanmigo serves 13+. Photomath and Sizzle give answers. IXL and Prodigy test recall, not reasoning. The under-13 AI tutoring market essentially doesn’t exist — not because there’s no demand, but because COPPA makes it genuinely difficult to build.

## The Hypothesis

AI can build thinking skills instead of replacing them — but only if the product is architecturally designed to never give answers, verify understanding through explain-back, and adapt to each child’s cognitive signature without collecting personal information.

**The core insight:** The interface itself is the problem. Existing products activate “student mode” before learning begins through UX design alone. Genuine learning happens when children are unaware they’re learning. A text-heavy chatbot interface fails an 8-year-old who can’t type fluently, a child with dyslexia who can’t read long responses, and a child with ADHD who can’t sustain attention through unstructured sessions.

## What Vidya Does

A Socratic AI tutor that guides children through discovery instead of delivering answers. The engine asks questions until the child figures it out, then asks them to *explain why* — verifying understanding, not just correct answers.

```
Student asks question or starts quest
         │
         ▼
┌──────────────────┐
│  Attempt Gate    │──▶ "What have you tried so far?"
└────────┬─────────┘    (No scaffolding without student effort)
         │
         ▼
┌──────────────────┐
│  Analyze Attempt │──▶ Identify concepts, gaps, reasoning errors
└────────┬─────────┘    (90+ answer-leak detection patterns)
         │
         ▼
┌──────────────────┐
│  Socratic        │──▶ Question, NEVER the answer
│  Response        │    (Hint ladder escalates gradually)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Explain-Back    │──▶ "Can you explain WHY that works?"
│  Verification    │    (Mastery requires understanding, not recall)
└──────────────────┘
```

### Key Capabilities

- **Socratic engine with explain-back enforcement** — 7 engine modules with 400–750 line system prompts per subject. The engine never gives answers; the hint ladder escalates through 5 levels of increasing scaffolding. Explain-back phase requires the student to articulate *why* their answer is correct
- **90+ answer-leak detection patterns** — The engine actively prevents itself from accidentally revealing answers through overly specific hints, leading questions, or pattern-matching shortcuts. This is the hardest engineering problem in Socratic AI
- **Bayesian Knowledge Tracing (BKT)** — Adaptive mastery tracking across 126 concepts with prerequisite graphs. Difficulty adjusts silently based on demonstrated understanding, not self-reported confidence
- **10 subjects** — Math (production-grade: 141 quests, 400 MCQ templates), Science, Coding, Essay Coaching, Economics, Logic, AI/ML Literacy, English Literature, College Counseling, and India K-12 career exploration
- **Kid-mode interface** — Choice-card UI (no typing required), speech bubbles with 220-character limits, visual countdowns, sensory-safe defaults, escape hatches for frustration. Designed for children who can’t type fluently, read long text, or sustain attention through unstructured sessions
- **COPPA-compliant by architecture** — Zero accounts, zero PII, zero email or password. Anonymous device-generated UUID enables server-side learning persistence without personal information. Full data deletion in one tap. Not “COPPA-compliant by policy” — architecturally impossible to collect regulated data
- **7 languages** — English, Hindi, Kannada (full support); French, German, Spanish, Chinese (partial). Technical terms kept in English; explanations use natural conversational language
- **Multi-LLM support** — OpenAI, Anthropic, Ollama, vLLM. Swap providers without changing the engine
- **Voice I/O + image/OCR input** — Children can speak their answers or photograph their work. Critical for the target age group where typing is a barrier to engagement
- **Guardian and classroom management** — Parent dashboard for monitoring progress across children. Classroom mode for enrichment centers. No child PII exposed to guardians — only learning metrics
- **Offline pack generation** — Pre-generated quest packs for environments without reliable internet

### The Hint Ladder

When students are stuck, help increases gradually but never reaches the answer:

|Level|Type of Help                   |Example                                                         |
|-----|-------------------------------|----------------------------------------------------------------|
|1    |Ask what they’ve tried         |“What’s your first instinct here?”                              |
|2    |Point to relevant concept area |“This is related to how forces work…”                           |
|3    |Narrow down the concept        |“Think about what happens to velocity at the highest point”     |
|4    |Give a similar, simpler example|“If I throw a ball straight up at 10 m/s instead of 20…”        |
|5    |Break into sub-questions       |“First: what’s the acceleration? Then: what’s the time to stop?”|

**Never goes beyond Level 5.** The student must engage their own thinking. This is the product’s entire thesis: desirable difficulty builds cognitive architecture.

## Architecture Decisions (and Why)

|Decision           |Choice                                             |Why                                                                                                                                                                                          |
|-------------------|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Identity model     |Anonymous UUID, no accounts                        |COPPA compliance by architecture, not policy. Impossible to collect PII means impossible to violate. Removes the biggest barrier to building for under-13                                    |
|Persistence        |Server-side Postgres via Prisma                    |Progress survives cache clears and browser resets. For neurodiverse kids, losing 3 weeks of streaks is a meltdown trigger. localStorage is not acceptable                                    |
|Engine architecture|Per-subject system prompts (400-750 lines each)    |Generic “be Socratic” prompts fail. Each subject has distinct reasoning patterns, common misconceptions, and hint structures. Math scaffolding is fundamentally different from essay coaching|
|Leak detection     |90+ patterns, server-side                          |The AI must never accidentally reveal the answer. This is adversarial by nature — the LLM wants to be helpful, and helpfulness = giving answers. Detection must be enforced, not suggested   |
|Mastery tracking   |Bayesian Knowledge Tracing with prerequisite graphs|Binary pass/fail misses partial understanding. BKT models probability of mastery given observed performance, enabling silent difficulty adjustment without labeling the child                |
|Monorepo           |pnpm + Turborepo                                   |Web (React/Vite) and API (Express) share types and configs. Single `pnpm dev` starts everything. Essential for solo/small-team velocity                                                      |
|LLM provider       |Multi-provider abstraction                         |Model quality changes quarterly. Provider lock-in at this stage is a strategic error. Abstraction lets us A/B test providers without engine rewrites                                         |

## What I’d Measure

|Metric                                 |Why It Matters                                                                                                                                                        |
|---------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Explain-back completion rate**       |The core product metric. What % of sessions reach the phase where the child explains their reasoning? Low = hint ladder is too hard or engagement drops before mastery|
|**Hint ladder escalation distribution**|How far do students go before finding the answer? Concentrated at L1-2 = problems too easy. Concentrated at L5 = problems too hard or scaffolding insufficient        |
|**D7/D14/D28 retention**               |Do families come back? The only metric that matters for fundraising. Pre-dogfood target: 40%+ D14 retention                                                           |
|**Session duration vs. mastery gain**  |Are longer sessions productive or just frustrating? Optimal session length likely differs by age and subject                                                          |
|**Leak detection trigger rate**        |How often does the engine catch itself about to give an answer? High rate = system prompts need tightening. Zero rate = detection may not be working                  |
|**Answer-leak false positive rate**    |How often does detection block legitimate scaffolding? Too aggressive = student gets stuck with no help                                                               |
|**BKT mastery progression per concept**|Are students actually learning over time? The ground-truth metric, but requires weeks of data per student                                                             |

## What I Learned

**1. The interface itself is the problem in EdTech.** Every existing AI tutor activates “student mode” — the child knows they’re being tested, which changes behavior. Kid-mode with choice cards, quest narratives, and no typing requirement is not a UX nicety. It’s architecturally necessary for the product thesis to work.

**2. Leak detection is harder than the Socratic engine.** Writing a prompt that asks good questions is straightforward. Preventing the LLM from accidentally revealing answers through overly specific hints, confirmation of wrong-but-close answers, or pattern-matching shortcuts requires adversarial thinking. The 90+ patterns evolved through real failures, not theoretical analysis.

**3. COPPA is a moat, not a cost.** Most AI companies look at COPPA’s penalties ($53,088 per violation, expanded in April 2025 to include biometric data and voiceprints) and decide the under-13 market isn’t worth it. That means every company that avoids this space cedes it to anyone willing to build COPPA-compliant. The regulatory burden is the competitive advantage.

**4. Synthetic testing can’t replace real children.** We built a Karpathy-style autoresearch loop to run 80-100 synthetic sessions overnight, optimizing hint ladder variants. It surfaces top prompt candidates efficiently. But a synthetic child profile doesn’t have meltdowns, doesn’t ask to play Minecraft, and doesn’t give up in ways that expose real scaffolding failures. Synthetic sessions are architecture search; dogfood with real families is the benchmark.

## Project Status

|Component                |Status |Detail                                                                |
|-------------------------|-------|----------------------------------------------------------------------|
|Socratic engine          |Shipped|7 modules, 400-750 line prompts per subject                           |
|Answer-leak detection    |Shipped|90+ server-side patterns                                              |
|Kid-mode UI              |Shipped|Choice cards, speech bubbles, visual countdowns, sensory-safe defaults|
|BKT mastery tracking     |Shipped|126 concepts, prerequisite graphs, silent difficulty adjustment       |
|Math content             |Shipped|141 quests, 400 MCQ templates, RSM-aligned                            |
|Multi-LLM support        |Shipped|OpenAI, Anthropic, Ollama, vLLM                                       |
|Voice I/O                |Shipped|Speech-to-text input, TTS output                                      |
|Image/OCR input          |Shipped|Photograph-your-work flow                                             |
|Guardian dashboard       |Shipped|Parent monitoring, classroom management                               |
|7 languages              |Shipped|EN, HI, KN full; FR, DE, ES, ZH partial                               |
|Offline packs            |Shipped|Pre-generated quest packs                                             |
|COPPA architecture       |Shipped|Zero PII, anonymous UUID, one-tap deletion                            |
|Dogfood with families    |Next   |10 families, 8 weeks, retention + mastery data                        |
|Infinite quest generation|Next   |Template-based generation to prevent content exhaustion               |
|Science content seeding  |Planned|60-80 concept nodes, 200+ templates, 30+ quests                       |

**Codebase:** 35K+ lines TypeScript · 55+ API endpoints · 60 commits · pnpm monorepo with Turborepo

-----

## Quick Start

### Prerequisites

- Node.js 20+ · pnpm 8+ · PostgreSQL 15+ · Claude API key

### Install and Run

```bash
git clone https://github.com/vinaysflow/Vidya-AI.git
cd Vidya-AI
pnpm install

# Configure
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL and ANTHROPIC_API_KEY

# Database
pnpm db:push

# Start everything
pnpm dev
```

- **Web App:** http://localhost:3000
- **API Server:** http://localhost:4000
- **Prisma Studio:** http://localhost:5555 (run `pnpm db:studio`)

### API

```bash
# Start a tutoring session
curl -X POST http://localhost:4000/api/tutor/session/start \
  -H "Content-Type: application/json" \
  -d '{"subject": "PHYSICS", "language": "HI", "problemText": "..."}'

# Send a message
curl -X POST http://localhost:4000/api/tutor/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "...", "message": "...", "language": "HI"}'
```

Response includes `questionType`, `hintLevel`, and `distanceFromSolution` metadata.

-----

## Repository Structure

```
Vidya-AI/
├── apps/
│   ├── web/                # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── components/ # Kid-mode UI, choice cards, quest interface
│   │   │   ├── stores/     # Zustand state management
│   │   │   └── locales/    # i18n (EN, HI, KN, FR, DE, ES, ZH)
│   │   └── ...
│   └── api/                # Express.js backend
│       ├── src/
│       │   ├── routes/     # 55+ API endpoints
│       │   ├── services/
│       │   │   └── socratic/ # Socratic engine core
│       │   │       ├── engine.ts
│       │   │       └── prompts/ # Per-subject system prompts
│       │   └── ...
│       └── prisma/         # Database schema, migrations
├── docs/                   # Architecture docs, content strategy
├── turbo.json              # Turborepo config
└── pnpm-workspace.yaml     # Monorepo workspace
```

## The Founding Story

We’re two parents of the same special-needs child. Kumon made our kid cry. IXL made our kid throw the iPad. Tutors just gave answers. So we built an AI tutor that never gives the answer — it asks questions until the child figures it out, then asks them to explain why.

For the first time, our kid asked to do math. Not because of points, but because something clicked: the AI was patient enough to let our child think.

## Related

- **[The Trust Stack](https://vintrip.substack.com)** — AI governance and agent identity infrastructure

## License

[MIT](LICENSE)

-----

Built by [Vinay Tripathi](https://github.com/vinaysflow) and Richa Pareek · vinay@aurviaglobal.com

**विद्या ददाति विनयम्** — Knowledge gives humility