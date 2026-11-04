import { timingSafeEqual } from "node:crypto";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { syncAllSubscriptions } from "@/lib/billing/sync";
import { recoverNarrationCredits } from "@/lib/projects/voiceover-recovery";
import { recoverPitchCredits } from "@/lib/pitch/recovery";
import { prepareDuePacks } from "@/lib/resto/pack";

export const maxDuration = 300;

/**
 * Cron Vercel quotidien (vercel.json, 6 h UTC ≈ 7 h à Paris) : tranches mensuelles des abonnements annuels, webhooks manqués,
 * puis packs Resto du jour (après la synchro : les crédits du mois sont déjà là). Un pack non préparé ici l'est à la visite.
 */
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
  const billing = isStripeConfigured() ? await step("billing", () => syncAllSubscriptions()) : null;
  const restoPacks = await step("resto-packs", () => prepareDuePacks(new Date(), 150_000));
  if (!isStripeConfigured()) return Response.json({ skipped: "stripe_not_configured", voiceoverRefunds, pitchRefunds, restoPacks });
  return Response.json({ ...billing, billingFailed: billing === null, voiceoverRefunds, pitchRefunds, restoPacks }, { status: billing === null ? 500 : 200 });
}
