# Vidya Demo Talk Track — Dr. Aubrey Partnership Meeting
## For: Richa | Prepared by: Vinay

---

> **Context for Richa:** Dr. Aubrey has already seen and used the app. She is a professor with deep background in early childhood learning, likely familiar with Bayesian Knowledge Tracing, scaffolded instruction, and differentiated learning. This is not a first introduction — this is a "here is what we built since you last saw it" conversation, aimed at opening a **research partnership** or **institutional pilot** conversation.
>
> **Your tone:** Colleague to colleague. You are not pitching — you are sharing what you have learned and asking for her expert guidance on where to take it next.
>
> **Total demo time:** ~15 minutes + Q&A

---

## Before You Start

- Clear browser localStorage (`DevTools > Application > Storage > Clear all`)
- Open the app in kid mode (not teacher/parent mode)
- Have WiFi enabled (voice requires network)
- Open on a laptop, not phone — bigger screen reads better

---

## Opening (2 minutes)

**Say:**

> "Since you last saw Vidya, we've made three meaningful changes — each grounded in research we've been reading since your last visit.
>
> First, we've added voice — not just text-to-speech, but emotionally-calibrated voice that changes its warmth and pacing based on whether the child is succeeding or struggling. Second, we've built a stealth placement assessment — the child doesn't know they're being assessed. Third, we've connected what Vidya knows about the child's learning profile to how it tutors them. Let me show you."

---

## Demo Section 1 — Placement Diagnostic with Voice (4 minutes)

### Step 1: The Parent Setup Screen

Walk through selecting grade and subject. Point to the "Read questions aloud" checkbox — it is **checked by default**.

**Say:**

> "Notice this is on by default. This is deliberate — and research-backed. A 2019 study by Kim et al. showed that reading comprehension confounds math assessment by up to 20% in grades 2–4. When we read the question aloud, we're measuring math ability, not reading ability. For multilingual families especially, this matters."

### Step 2: Enter the Diagnostic Quiz

When the first question appears, let it read aloud. Point to the subtle speaker icon pulsing in the question card.

**Say:**

> "Every question reads itself aloud. The child doesn't have to decode text to answer math. Dr. Escobar's research on early numeracy — which I imagine you're familiar with — shows that decoupling decoding from reasoning dramatically reduces assessment anxiety at this age."

### Step 3: Answer a Question

Click an answer. Point to the neutral "Got it!" response — no green/red, no correct/wrong signal.

**Say:**

> "Notice there is no ✅ or ❌. The child gets 'Got it!' regardless of whether they were right or wrong. This is intentional stealth assessment. The result data flows to the backend where Bayesian Knowledge Tracing seeds the child's learning model — but the child never experiences being tested. This is directly from the academic literature on assessment anxiety in 6–9 year olds."

**Anticipated question:** *"How accurate is a 5-question placement assessment?"*

> "It's not meant to be perfectly accurate — it's a Bayesian prior, not a diagnosis. We start with a probability estimate for each concept cluster and update it continuously as the child plays. The first 5 questions give us 5 data points to start from something better than a prior of zero. Every answer in the quest session is a new observation."

---

## Demo Section 2 — Adaptive Quest with Tone (5 minutes)

### Step 4: Begin a Quest

From the quest selection screen, pick a mathematics quest. Let the intro play. You'll hear Vidya's voice — warm and steady.

**Say:**

> "This voice is calibrated. When Vidya is introducing something new or the child is doing well, the voice is warm and confident. Listen to this."

### Step 5: Answer Correctly

Select the correct answer choice. Listen to Vidya's response.

**Say:**

> "Hear the brightness in the tone? That is not random. When the question type the backend returns is 'celebration' — meaning the child answered correctly — the voice parameters shift: stability drops, expressiveness increases. The system maps what child psychologists call 'genuine warm affect' — the prosodic pattern therapists use when a child achieves something."
>
> "This is based on research by Mehrabian and others on paralinguistic warmth. The pitch variability increases slightly. It does not get loud — it gets _brighter_."

### Step 6: Answer Incorrectly

On the next question, deliberately select a wrong answer. Listen to the tone change.

**Say:**

> "Now listen — slower, softer, steadier. When the backend returns 'hint_with_question' or 'foundational' — meaning the child is struggling — the voice shifts to what I would describe as patient mode. Therapists working with dysregulated children learn this as 'regulatory co-presence' — your calm regulates their nervous system. We're encoding that into the AI's voice."

### Step 7: Transition Card

Play through until a transition message appears. It will read itself aloud.

**Say:**

> "Even transitions are voiced. When the game is about to shift phases — say, from answering to explaining back — a transition card appears AND is read aloud. For children on the autism spectrum or with sensory processing differences, unexpected transitions are a major source of dysregulation. We are giving them a preview, with a voice, so nothing is a surprise."

**Anticipated question:** *"How is this different from just using a text-to-speech API?"*

> "Three ways. First, tone mapping — the emotional register changes based on what the child just experienced. Second, multi-provider fallback — if the primary provider fails or is slow, it falls back silently and the child never experiences silence. Third, it's integrated into the learning model — the voice parameters are not random, they're derived from the Bayesian state of the child's session."

---

## Demo Section 3 — Under the Hood (3 minutes)

No need to show code. Use verbal framing.

**Say:**

> "Here is what is happening under the surface.
>
> Every question the child answers updates a Bayesian Knowledge Tracing model — the same mathematical framework that ITS systems like Carnegie Learning have used since the 1990s, but applied in real time in a mobile-first UI.
>
> When the parent fills out the learning profile — sensory preferences, focus helpers, language background — that profile flows as a prompt overlay into every single response the LLM generates. The child never sees this. But it means Vidya 'knows' before the first question whether this child learns better through visual scaffolding, or through narrative framing, or needs shorter sentences.
>
> The diagnostic seeds the BKT model. The learning profile shapes the language. The voice reflects the emotional state of the session. These three things together are what makes this different from a flashcard app with a chatbot."

**Anticipated question:** *"What subjects does it cover?"*

> "Currently mathematics, physics, chemistry, biology, coding, and essay writing — with multilingual support in English, Hindi, Kannada, French, German, Spanish, and Mandarin. The architecture is subject-agnostic — the content bank drives it."

---

## Hard Questions & Research-Backed Answers

### Q1: "How do you prevent the AI from hallucinating wrong answers?"

> "We use a structured prompt architecture with what we call 'grounding mode.' For mathematics, every response is classified by the model itself as either bank-retrieved, reasoned from first principles, or retrieved from conversation context. Wrong choices in the game are generated from actual mathematical distractors — common conceptual errors — not random numbers. And when the child's explanation doesn't match the concept, the system identifies the gap and presents a foundational prompt rather than repeating the original question."

### Q2: "Has this been tested with actual children?"

> "We've had informal sessions with children ages 6–10. The engagement is meaningfully higher with voice ON versus OFF — the children stop watching the screen and start listening. That's exactly what we'd expect from the research on dual-channel theory (Paivio's dual coding theory): when both visual and auditory channels are active simultaneously, retention and attention improve. We haven't done a controlled study yet — and this is exactly where your expertise and network could accelerate what we're building."

### Q3: "What about data privacy and COPPA compliance?"

> "We do not store any personally identifiable information for children. The userId is a random UUID generated in the browser. No names, no emails, no ages stored. Progress data is keyed to that anonymous ID. We're COPPA-compliant by design — not by checkbox."

### Q4: "What is your evidence that this voice adaptation actually helps?"

> "Right now, theoretical grounding plus our own observational testing. This is an open research question — and a genuinely interesting one. What we know from the therapeutic communication literature (Ivey, 2014; Morrison, 2016) is that prosodic warmth — slower rate, wider pitch range, softer volume — correlates with reduced cortisol response in children during challenging tasks. We've encoded those parameters. Whether the effect holds in an AI-delivered context at scale is exactly the kind of question that deserves a proper study."

### Q5: "Why would schools use this instead of Khan Academy or IXL?"

> "Khan Academy and IXL are excellent at curriculum delivery. Vidya is doing something different: it is learning about the child as it teaches. The BKT model updates continuously. The learning profile shapes every response. The voice responds to the emotional state of the session. The goal is not just to deliver content — it is to model the child's understanding and adapt in real time. That is what makes it an intelligent tutoring system, not a curriculum platform."

---

## Partnership Ask

> _(Vinay: fill in your specific ask here before the meeting — e.g., research collaboration, pilot with a cohort, advisory role, grant co-authorship, IRB support, etc.)_

Suggested framing:

> "We are at an inflection point where we need two things to move from prototype to evidence-based product. One is a research partner who can help us design studies that actually measure what we believe we're building — learning outcomes, not just engagement metrics. The other is access to a cohort of real children in a real learning context. I believe you have both the methodological expertise and the connections to help us get there. What would a collaboration look like from your side?"

---

## If the Demo Breaks

Stay calm. Say:

> "This is what I mean about reliability — we've built fallback at every layer. If the primary voice provider is unreachable, the browser's native speech synthesis takes over so the child never experiences silence. If the API is slow, we have a 1.5 second timeout — at which point the browser speaks immediately and the high-quality audio plays next time. Let me show you what the silent version looks like — the learning system still works completely."

Then demonstrate the app with voice toggled off. It works identically — just without audio.

---

## Closing

> "The question we're trying to answer is: can an AI tutor be warm? Can it be patient in the way a skilled teacher is patient — not just by waiting longer, but by _sounding_ patient? The research says it matters. We're building toward that answer."

---

*Last updated: March 2026 | Contact: Vinay Tripathi*
