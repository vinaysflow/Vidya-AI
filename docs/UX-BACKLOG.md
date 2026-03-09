# UX Backlog: Post-Dogfood Features

Deferred from the Pre-Dogfood UX Overhaul. Each item includes the rationale for deferral and the dogfood signal that would promote it to active development.

---

## P1: Ship During Dogfood If Data Supports (Weeks 2-4)

### Experience Coin Economy
**What:** Parallel motivation system to XP. Difficulty-calibrated rewards (Easy=5, Medium=10, Hard=15, Stretch=25 coins). Bonus for explain-back (+5), no hints (+5), choosing harder quest (+5). Spendable on quest theme unlocks and fox customization.
**Why deferred:** Validate that XP alone is motivating first. Coins add UI complexity and a spend loop that requires testing. Building before validating the core session loop is premature optimization.
**Promote when:** Dogfood interviews reveal kids are indifferent to XP, OR kids ask "what do I get?" after completing quests.

### Streak Forgiveness ("Paused at 12, Not Reset to 0")
**What:** When a child misses 2-3 days, show "Your streak is paused at 12" instead of resetting to 0. Auto-apply one streak freeze per week. Weekly rhythm alternative: "3 adventures this week" goal.
**Why deferred:** Need streak retention data to know if streaks drive return for this audience. May not matter for 10 families.
**Promote when:** Dogfood data shows >2 users who stop returning after a streak break, OR parent feedback about streak anxiety.

### Within-Session Difficulty Micro-Adjustment
**What:** If a child gets 2 consecutive wrong answers with the same misconception pattern, reduce difficulty for the next problem immediately (don't wait for 8-session adaptive cycle). Uses misconception mapping from distractor metadata.
**Why deferred:** Requires misconception pattern detection at runtime. The hint ladder already handles individual-problem struggle. Cross-problem pattern detection is a separate system.
**Promote when:** Dogfood event data shows >15% of sessions have 3+ consecutive wrong answers, OR escape-hatch ("I'm stuck") usage >20%.

### Frustration Loop Breaker with Micro-Questions
**What:** When misconception pattern is detected, break the current problem into a micro-question isolating the specific skill (e.g., "Add 3/4 + 1/2" becomes "What's 1/2 as fourths?"). If micro-question correct, reconstruct original problem.
**Why deferred:** Depends on within-session difficulty adjustment (above). Requires micro-question generation pipeline. High effort for uncertain impact.
**Promote when:** Within-session difficulty data confirms frustration loops exist AND escape-hatch data shows kids are abandoning problems.

### XP Rebalancing
**What:** EXPLAIN_BACK and SHOWED_WORK both 20 XP (currently SHOWED_WORK=10). SESSION_COMPLETE from 25 to 15. Rewards thinking behaviors equally across modalities.
**Why deferred:** Current XP values are functional. Rebalancing is a tuning decision that should be informed by actual explain-back vs. showed-work attempt rates from dogfood.
**Promote when:** Dogfood data shows SHOWED_WORK attempt rate is significantly lower than EXPLAIN_BACK, suggesting the XP differential is discouraging one modality.

### End-of-Session Teaser
**What:** After quest completion, show: "Tomorrow, you'll unlock the Kitchen Lab chapter -- there's a mystery recipe that needs your fraction skills!" Creates curiosity-driven intrinsic return trigger.
**Why deferred:** Requires next-quest recommendation logic (depends on quest recommender). Low effort but requires the recommender to work first.
**Promote when:** Quest recommender is shipped AND D1 return rate is below 40%.

### Transition Warnings Before Context Changes
**What:** Before switching phases (problem-solving to explain-back, one quest to another), show a 3-second warning: "Great job! Next, I'm going to ask you to explain your thinking. Ready?" Critical for autism-spectrum children who need predictability.
**Why deferred:** Requires understanding actual phase transition points in the session flow. Calm mode (shipping in overhaul) addresses the most severe sensory issues; transition warnings are a refinement.
**Promote when:** Dogfood families with ASD children report confusion or distress at phase transitions, OR session abandonment rate spikes at explain-back transition.

---

## P2: Ship Before Community Launch (Weeks 5-8)

### Fox Mascot 3 Responsive Emotional States
**What:** Curious (default, ears perked), Encouraging (leaning forward, warm), Celebrating (jumping, tail wagging). Must be RESPONSIVE to what just happened -- not static. Fox never expresses disappointment.
**Why deferred:** Requires art assets and animation work. Current static fox is functional. Emotional responsiveness is a polish feature that compounds engagement but doesn't drive initial PMF.
**Promote when:** Dogfood qualitative feedback indicates kids want more personality from the app, OR engagement data shows sessions are "flat" (no emotional peaks).

### Visual Math Representations
**What:** Fraction bars, number lines, area models presented alongside text math. Uses a different neural pathway than text, bypassing the dyslexia bottleneck.
**Why deferred:** 3-day build minimum. Need to validate that text-based math problems are actually the blocker (vs. other UX issues).
**Promote when:** Dogfood data shows low completion rates specifically on fraction/measurement quests, OR families with dyslexic children report difficulty.

### Multiple Explain-Back Modalities in Kid Mode
**What:** Wire existing voice (VoiceButton/STT) and drawing (StudentCanvas) into kid-mode explain-back alongside choice cards. Essential for 2e children with expressive language gaps.
**Why deferred:** Voice and canvas components exist but aren't wired to kid mode. The choice-card explain-back is functional for dogfood. Multi-modal is a refinement.
**Promote when:** Explain-back attempt rate is low (<40%) suggesting kids find the current modality limiting, OR 2e families specifically report frustration.

### TTS "Listen Along" Prominence
**What:** Text-to-speech as a first-class feature, visually prominent, framed as "listen along" not "read it to me." Destigmatizes accommodation for undiagnosed dyslexia.
**Why deferred:** TTS exists (AudioPlayer.tsx) but isn't prominently surfaced in kid mode. Prominence is a UI layout change, not a new feature.
**Promote when:** Dogfood families with reading challenges report difficulty with text-heavy speech bubbles.

### "3 Adventures/Week" Rhythm Framing
**What:** Weekly session target (parent-configurable, 2-5 sessions/week) with clear completion state. Healthier habit loop than daily streak pressure. Works better for ADHD families who can't sustain daily routines.
**Why deferred:** Need weekly usage pattern data from dogfood to calibrate the default target.
**Promote when:** Dogfood data shows usage is clustered (e.g., 3 sessions in one day, then nothing for 4 days) rather than distributed.

### Weekly Parent Summary with Home Activity Suggestions
**What:** Once-per-week push: what the child learned, mastery progression, one 30-second home activity prompt ("Ask your child to explain how they figured out the fraction problem").
**Why deferred:** Requires notification infrastructure (email or in-app notification). The per-session parent micro-insight (shipping in overhaul) covers the immediate need.
**Promote when:** Parent insight engagement is high (>30% view rate) suggesting parents want MORE information.

### Coin Shop
**What:** Spend coins on quest theme unlocks, fox customization (hats, colors, accessories), bonus challenge quests, gifting to siblings.
**Why deferred:** Depends on coin economy (above). Building a shop before validating coins is premature.
**Promote when:** Coin economy is live AND kids are accumulating coins without spending them (need a sink).

---

## Anti-Patterns (Never Build)

These are design choices that competitors make and research shows are harmful for foundational-age children. Treat as absolute prohibitions:

1. **Countdown timer during problems** -- triggers anxiety and impulsivity
2. **Public leaderboard comparing non-family peers** -- toxic for learning differences
3. **Score reductions or level demotions** -- IXL's most hated feature
4. **"Lives" or "hearts" system** -- punishes struggling, the opposite of learning
5. **Consecutive-correct requirements for progress** -- impossible treadmill
6. **Negative sound/animation on wrong answers** -- triggers shame, not thinking
7. **Auto-advance to harder content without acknowledgment** -- disorienting
8. **Surprise UI changes without warning** -- distressing for autistic children

---

## Onboarding Funnel Optimization (Post-Dogfood Growth)

Current flow: Role selector -> Parent setup (grade + enrichment + interests) -> Diagnostic quiz (5 questions) -> First quest. That's 3-5 minutes before a child sees a single real quest. Every screen is abandonment risk.

For dogfood this doesn't matter (parents are committed). For post-dogfood growth, measure:
- Drop-off rate at each onboarding step
- Time from app-open to first quest start
- Which steps have highest abandonment

Target: Under 2 minutes from app open to first learning interaction.
