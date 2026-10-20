import { timingSafeEqual } from "node:crypto";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { syncAllSubscriptions } from "@/lib/billing/sync";
import { recoverNarrationCredits } from "@/lib/projects/voiceover-recovery";
import { recoverPitchCredits } from "@/lib/pitch/recovery";

export const maxDuration = 300;

/** Cron Vercel quotidien (vercel.json) : tranches mensuelles des abonnements annuels et webhooks manqués. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response("unauthorized", { status: 401 });
  const voiceoverRefunds = await recoverNarrationCredits();
  await recoverPitchCredits();
  if (!isStripeConfigured()) return Response.json({ skipped: "stripe_not_configured", voiceoverRefunds });
  return Response.json({ ...await syncAllSubscriptions(), voiceoverRefunds });
}
