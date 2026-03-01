/**
 * Lightweight load test for Vidya API.
 *
 * Measures p50/p95 latency and error rate against critical endpoints.
 * Run:  npx tsx scripts/load-test.ts [baseUrl] [concurrency] [rounds]
 *
 * Defaults: http://localhost:4000  concurrency=5  rounds=20
 */

const BASE_URL = process.argv[2] || 'http://localhost:4000';
const CONCURRENCY = Number(process.argv[3]) || 5;
const ROUNDS = Number(process.argv[4]) || 20;

interface Result {
  endpoint: string;
  status: number;
  ms: number;
  ok: boolean;
}

async function timed(endpoint: string, init?: RequestInit): Promise<Result> {
  const url = `${BASE_URL}${endpoint}`;
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const ms = performance.now() - start;
    await res.text();
    return { endpoint, status: res.status, ms, ok: res.ok };
  } catch {
    return { endpoint, status: 0, ms: performance.now() - start, ok: false };
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function report(label: string, results: Result[]) {
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok).length;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const errRate = ((errors / results.length) * 100).toFixed(1);

  console.log(
    `  ${label.padEnd(30)} ` +
      `n=${String(results.length).padStart(4)}  ` +
      `p50=${p50.toFixed(0).padStart(6)}ms  ` +
      `p95=${p95.toFixed(0).padStart(6)}ms  ` +
      `err=${errRate}%`,
  );
}

async function runBatch(fn: () => Promise<Result>): Promise<Result[]> {
  const all: Result[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    const batch = await Promise.all(Array.from({ length: CONCURRENCY }, fn));
    all.push(...batch);
  }
  return all;
}

async function main() {
  console.log(`\nVidya Load Test`);
  console.log(`  target:      ${BASE_URL}`);
  console.log(`  concurrency: ${CONCURRENCY}`);
  console.log(`  rounds:      ${ROUNDS}`);
  console.log(`  total reqs:  ${CONCURRENCY * ROUNDS} per endpoint\n`);

  // 1. /health
  const healthResults = await runBatch(() => timed('/health'));
  report('/health', healthResults);

  // 2. /api/tutor/session/start
  const sessionResults = await runBatch(() =>
    timed('/api/tutor/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'PHYSICS',
        language: 'EN',
        question: 'What is Newton\'s first law?',
      }),
    }),
  );
  report('/api/tutor/session/start', sessionResults);

  // 3. /api/tutor/message (needs a valid sessionId — use first successful session)
  const firstSession = sessionResults.find((r) => r.ok && r.status === 200);
  if (firstSession) {
    const sessionBody = await fetch(`${BASE_URL}/api/tutor/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'PHYSICS',
        language: 'EN',
        question: 'What is Newton\'s first law?',
      }),
    }).then((r) => r.json() as Promise<any>);

    const sessionId = sessionBody?.data?.sessionId;
    if (sessionId) {
      const msgResults = await runBatch(() =>
        timed('/api/tutor/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: 'I think the answer involves inertia',
          }),
        }),
      );
      report('/api/tutor/message', msgResults);
    } else {
      console.log('  /api/tutor/message              skipped (no session)');
    }
  } else {
    console.log('  /api/tutor/message              skipped (session/start failed)');
  }

  // Summary
  const allResults = [...healthResults, ...sessionResults];
  const totalErrors = allResults.filter((r) => !r.ok).length;
  const totalReqs = allResults.length;
  console.log(`\n  Total: ${totalReqs} requests, ${totalErrors} errors (${((totalErrors / totalReqs) * 100).toFixed(1)}%)\n`);
}

main().catch(console.error);
