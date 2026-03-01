# Launch KPIs (Public Launch)

## North-star outcomes

- **Learner value**: measurable mastery lift within 3 sessions for core topics.
- **Trust**: low unsafe/hallucinated response rate.
- **Reliability**: stable p95 latency under expected traffic.

## Activation (first session)

- **Onboarding completion rate**: >= 70%
- **First-response success rate** (no error/fallback): >= 98%
- **Session completion rate** (>= 4 turns): >= 55%

## Learning efficacy

- **Mastery delta per 3 sessions** (topic score): +10% median
- **Misconception resolution rate** (within 2 turns): >= 40%
- **Hint ladder progression without loops**: >= 80%

## Engagement

- **Day-1 return**: >= 30%
- **Day-7 return**: >= 15%
- **Avg. sessions per active user per week**: >= 2.0

## Trust & safety

- **Unsafe response rate**: < 0.5%
- **Overly-direct answer rate** (when in Socratic mode): < 5%
- **User-reported bad responses**: < 1%

## Reliability & cost

- **p95 latency**
  - `/api/tutor/session/start`: < 8s
  - `/api/tutor/message`: < 15s
- **Error rate** (5xx): < 1%
- **Cost/session** (median): defined per tier (set in pricing model)

## Business

- **Trial-to-paid conversion** (if applicable): >= 3–7%
- **Pricing page CTR to checkout**: >= 5%

## Notes

- These KPIs are initial launch thresholds. Adjust weekly based on actual traffic.
- Track all KPIs by subject + language to identify weak domains.
