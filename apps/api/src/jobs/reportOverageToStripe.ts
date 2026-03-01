/**
 * Daily Overage Reporting Job
 *
 * Aggregates per-API-key overage from UsageRecord for a given date,
 * reports each total to Stripe via the billing service, and writes
 * a StripeUsageReport row to prevent double-reporting.
 *
 * Usage:
 *   npx tsx src/jobs/reportOverageToStripe.ts              # reports yesterday
 *   npx tsx src/jobs/reportOverageToStripe.ts 2026-02-27   # reports a specific date
 *
 * Schedule via cron (e.g. daily at 00:05 UTC) or call programmatically.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { reportOverageToStripe } from '../services/stripe';

config();

const prisma = new PrismaClient();

function yesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function runOverageReport(date?: string): Promise<void> {
  const reportDate = date || yesterdayDate();
  console.log(`[OverageJob] Reporting overage for ${reportDate}`);

  const overageByKey = await prisma.usageRecord.groupBy({
    by: ['apiKeyId'],
    where: {
      date: reportDate,
      overageCount: { gt: 0 },
    },
    _sum: { overageCount: true },
  });

  if (overageByKey.length === 0) {
    console.log('[OverageJob] No overage to report');
    return;
  }

  console.log(`[OverageJob] Found ${overageByKey.length} key(s) with overage`);

  for (const entry of overageByKey) {
    const total = entry._sum.overageCount ?? 0;
    if (total <= 0) continue;

    const existing = await prisma.stripeUsageReport.findUnique({
      where: { apiKeyId_date: { apiKeyId: entry.apiKeyId, date: reportDate } },
    });

    if (existing) {
      console.log(`[OverageJob] Already reported for key ${entry.apiKeyId} on ${reportDate} — skipping`);
      continue;
    }

    try {
      await reportOverageToStripe(entry.apiKeyId, reportDate, total);

      await prisma.stripeUsageReport.create({
        data: {
          apiKeyId: entry.apiKeyId,
          date: reportDate,
          quantityReported: total,
        },
      });

      console.log(`[OverageJob] Reported ${total} overage for key ${entry.apiKeyId}`);
    } catch (error) {
      console.error(`[OverageJob] Failed to report overage for key ${entry.apiKeyId}:`, error);
    }
  }

  console.log('[OverageJob] Done');
}

// Run directly from CLI
if (require.main === module) {
  const dateArg = process.argv[2];
  runOverageReport(dateArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[OverageJob] Fatal error:', err);
      process.exit(1);
    });
}
