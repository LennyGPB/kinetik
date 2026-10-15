import { timingSafeEqual } from "node:crypto";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { syncAllSubscriptions } from "@/lib/billing/sync";

export const maxDuration = 300;

/** Cron Vercel quotidien (vercel.json) : tranches mensuelles des abonnements annuels et webhooks manqués. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response("unauthorized", { status: 401 });
  if (!isStripeConfigured()) return Response.json({ skipped: "stripe_not_configured" });
  return Response.json(await syncAllSubscriptions());
}
