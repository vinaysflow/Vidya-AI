/**
 * Learner-model end-to-end smoke test (no LLM, no HTTP server).
 * Exercises: telemetry spine -> misconception lifecycle -> trait rollup ->
 * buddy projection -> tutor director plan, then cleans up its test user.
 *
 * Run:  npm run learner:smoke   (loads .env, exits non-zero on any failure)
 */
import { prisma } from '../src/lib/prisma';
import { recordTurnEvents } from '../src/services/learner/learnerEvents';
import {
  inferMisconceptionForTurn,
  applyCorrectTowardResolution,
  getActiveMisconceptions,
  getResolvedMisconceptions,
} from '../src/services/learner/misconceptionTracker';
import { rollupLearnerModel, getLearnerTraits } from '../src/services/learner/learnerTraits';
import { syncBuddyFromSession, getBuddyState } from '../src/services/learner/buddyState';
import { buildSessionPlan } from '../src/services/learner/tutorDirector';

const U = `smoke_${Date.now()}`;
const S = `${U}_sess`;
let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

async function main() {
  // 1) Telemetry spine: a wrong turn, then a correct breakthrough + explain-back.
  await recordTurnEvents({
    userId: U, sessionId: S, conceptKey: 'smoke_concept',
    metadata: { questionType: 'socratic', hintLevel: 1, distanceFromSolution: 60,
      analysisResult: { errorType: 'computational', errorDescription: 'added numerators and denominators' } },
    prevHintLevel: 0, newHintLevel: 1, latencyMs: 8000, representation: 'visual',
  });
  await recordTurnEvents({
    userId: U, sessionId: S, conceptKey: 'smoke_concept',
    metadata: { questionType: 'celebrate_then_explain_back', hintLevel: 1, distanceFromSolution: 5 },
    prevHintLevel: 1, newHintLevel: 1, latencyMs: 12000, representation: 'visual',
  });
  const eventCount = await prisma.learnerEvent.count({ where: { userId: U } });
  check('telemetry: events written (>=4)', eventCount >= 4);
  const kinds = await prisma.learnerEvent.groupBy({ by: ['kind'], where: { userId: U }, _count: true });
  const kindSet = new Set(kinds.map((k) => k.kind));
  check('telemetry: ATTEMPT + BREAKTHROUGH + EXPLAIN_BACK + HINT_ESCALATED present',
    kindSet.has('ATTEMPT') && kindSet.has('BREAKTHROUGH') && kindSet.has('EXPLAIN_BACK') && kindSet.has('HINT_ESCALATED'));

  // 2) Misconception lifecycle via free-response path (errorDescription keyword
  //    match against the catalog signature) — the path that fires in this DB,
  //    since no QuestionTemplate carries misconceptions here.
  const catalogRow = await prisma.misconception.findFirst({
    where: { subject: 'MATHEMATICS' as any },
    select: { conceptKey: true, description: true },
  });
  let lifecycleConcept: string | null = null;
  if (catalogRow) {
    lifecycleConcept = catalogRow.conceptKey;
    // Reuse 4+ significant words from the catalog description so the keyword
    // overlap clears the score>=2 threshold deterministically.
    const errorDescription = (catalogRow.description.toLowerCase().match(/[a-z]{4,}/g) ?? [])
      .slice(0, 6)
      .join(' ');
    const miscId = await inferMisconceptionForTurn({
      userId: U, conceptKey: catalogRow.conceptKey, subject: 'MATHEMATICS' as any,
      errorType: null, errorDescription,
    });
    check('misconception: inferred from free-response error', !!miscId);
    const active = await getActiveMisconceptions(U, catalogRow.conceptKey);
    check('misconception: state is ACTIVE after observation', active.some((m) => m.status === 'ACTIVE'));
    // Two correct turns -> RESOLVING -> RESOLVED.
    await applyCorrectTowardResolution(U, catalogRow.conceptKey, 'MATHEMATICS' as any);
    await applyCorrectTowardResolution(U, catalogRow.conceptKey, 'MATHEMATICS' as any);
    const resolved = await getResolvedMisconceptions(U);
    check('misconception: lifecycle reaches RESOLVED', resolved.length > 0);
  } else {
    console.log('SKIP  misconception lifecycle (catalog empty — run sync-catalog)');
  }

  // 3) Trait rollup.
  const traits = await rollupLearnerModel(U);
  check('rollup: LearnerTraits produced', !!traits);
  check('rollup: 5 habits present', !!traits && Object.keys(traits.habits).length === 5);
  check('rollup: channelWeights sum ~1', !!traits &&
    Math.abs(Object.values(traits.channelWeights).reduce((a, b) => a + b, 0) - 1) < 0.05);
  const traitsRead = await getLearnerTraits(U);
  check('rollup: traits readable back', !!traitsRead);

  // 4) Buddy projection.
  await syncBuddyFromSession(U, S);
  const buddy = await getBuddyState(U);
  check('buddy: state produced with level >= 1', !!buddy && buddy.level >= 1);
  check('buddy: knows the taught concept (explain-back mirrored)',
    !!buddy && Object.keys(buddy.conceptKnowledge).includes('smoke_concept'));

  // 5) Tutor Director plan.
  const plan = await buildSessionPlan(U, 'MATHEMATICS' as any, { conceptKey: lifecycleConcept });
  // 4 core phases always; +1 warm-up when a spaced-review is due.
  check('director: plan has 4-5 phases', plan.phases.length >= 4 && plan.phases.length <= 5);
  check('director: phases include learn + struggle + teach-back + reflect',
    ['learn', 'struggle', 'teach-back', 'reflect'].every((m) => plan.phases.some((p) => p.mode === m)));
  check('director: every phase has a directive', plan.phases.every((p) => p.directive.length > 0));
  console.log('\nplan.rationale:', plan.rationale);

  // Cleanup (test user only; shared catalog rows are left in place).
  await prisma.learnerEvent.deleteMany({ where: { userId: U } });
  await prisma.misconceptionState.deleteMany({ where: { userId: U } });
  await prisma.learnerTraits.deleteMany({ where: { userId: U } });
  await prisma.buddyState.deleteMany({ where: { userId: U } });
  console.log('\ncleanup: removed test user data');

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE FAILED:', e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
