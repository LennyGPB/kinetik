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
  // Chaque étape est isolée : un échec de récupération ne doit jamais bloquer la synchro des abonnements (crédits mensuels des annuels)
  const step = async <T,>(name: string, run: () => Promise<T>) => {
    try { return await run(); } catch (error) { console.error(`[cron.subscriptions] ${name}`, error); return null; }
  };
  const voiceoverRefunds = await step("voiceover", () => recoverNarrationCredits());
  const pitchRefunds = await step("pitch", () => recoverPitchCredits());
  if (!isStripeConfigured()) return Response.json({ skipped: "stripe_not_configured", voiceoverRefunds, pitchRefunds });
  const billing = await step("billing", () => syncAllSubscriptions());
  return Response.json({ ...billing, billingFailed: billing === null, voiceoverRefunds, pitchRefunds }, { status: billing === null ? 500 : 200 });
}
