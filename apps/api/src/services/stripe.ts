/**
 * Stripe Billing Service
 *
 * Reports metered overage usage to Stripe using the Billing Meters API.
 * Keys without a linked stripeCustomerId are silently skipped (no-op).
 *
 * Stripe Billing Meters workflow:
 * 1. Create a Meter in Stripe Dashboard with event_name = STRIPE_METER_EVENT_NAME
 * 2. Attach the meter to a Price (metered billing)
 * 3. Create a Subscription for the customer using that price
 * 4. Report usage via billing.meterEvents.create()
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key);
  return stripeClient;
}

const METER_EVENT_NAME = process.env.STRIPE_METER_EVENT_NAME || 'vidya_api_overage';

/**
 * Convert a YYYY-MM-DD date string to a Unix timestamp (start of day UTC).
 */
function dateToUnix(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
}

/**
 * Report overage quantity to Stripe for a given API key and date.
 *
 * No-op when:
 * - Stripe is not configured (no STRIPE_SECRET_KEY)
 * - The API key has no stripeCustomerId
 */
export async function reportOverageToStripe(
  apiKeyId: string,
  date: string,
  quantity: number
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set — skipping overage report');
    return;
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { stripeCustomerId: true, name: true },
  });

  if (!apiKey?.stripeCustomerId) {
    return;
  }

  await stripe.billing.meterEvents.create({
    event_name: METER_EVENT_NAME,
    payload: {
      stripe_customer_id: apiKey.stripeCustomerId,
      value: String(quantity),
    },
    timestamp: dateToUnix(date),
  });

  console.log(
    `[Stripe] Reported ${quantity} overage requests for key "${apiKey.name}" (${apiKeyId}) on ${date}`
  );
}

export { getStripe };
