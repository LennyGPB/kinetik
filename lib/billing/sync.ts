import "server-only";
import type Stripe from "stripe";
import { CREDIT_PACKS, getPlan, planFromLookupKey, type PaidPlanId } from "@/config/pricing";
import { expireSubscriptionCredits, grantCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { stripe } from "./stripe";

/**
 * Synchronisation Stripe → base. Stripe est la source de vérité : chaque webhook relit l'objet à jour
 * plutôt que de faire confiance à l'ordre d'arrivée des événements. Toutes les écritures sont idempotentes.
 *
 * Crédits d'abonnement : attribués par tranches mensuelles depuis le début de la période facturée.
 * - mensuel : une tranche = la période ;
 * - annuel : 12 tranches, attribuées au fil de l'année par le webhook puis le cron quotidien.
 * Chaque tranche expire à sa fin. Un passage à une offre supérieure complète la tranche en cours (immédiat).
 */

const ACTIVE = new Set(["active", "trialing"]);
/** Statuts où l'utilisateur garde son offre (crédits déjà attribués), sans nouvelle attribution */
const KEEPS_PLAN = new Set(["active", "trialing", "past_due"]);

function addMonthsUTC(date: Date, months: number) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

/** Tranche mensuelle en cours dans la période [start, end[, ou null hors période. */
export function currentSlot(start: Date, end: Date, now = new Date()) {
  if (now < start || now >= end) return null;
  let k = 0;
  while (addMonthsUTC(start, k + 1) <= now) k++;
  const slotEnd = addMonthsUTC(start, k + 1);
  return { start: addMonthsUTC(start, k), end: slotEnd < end ? slotEnd : end };
}

async function grantSlot(userId: string, subscriptionId: string, planId: PaidPlanId, periodStart: Date, periodEnd: Date) {
  const slot = currentSlot(periodStart, periodEnd);
  if (!slot) return;
  const plan = getPlan(planId);
  const prefix = `sub:${subscriptionId}:${slot.start.toISOString()}`;
  const granted = await db.creditTransaction.aggregate({
    where: { userId, type: "SUBSCRIPTION", source: "SUBSCRIPTION", reference: { startsWith: prefix } },
    _sum: { amount: true },
  });
  const missing = plan.credits - (granted._sum.amount ?? 0);
  if (missing <= 0) return; // tranche déjà servie (ou offre inférieure : on ne reprend rien)
  await expireSubscriptionCredits(userId);
  await grantCredits(userId, {
    amount: missing, type: "SUBSCRIPTION", source: "SUBSCRIPTION", reference: `${prefix}:${plan.credits}`,
    expiresAt: slot.end, description: `Abonnement ${plan.name}`,
  });
}

async function findUser(customerId: string, userId?: string) {
  return (userId && await db.user.findUnique({ where: { id: userId }, select: { id: true, stripeSubscriptionId: true, stripeCustomerId: true } }))
    || db.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true, stripeSubscriptionId: true, stripeCustomerId: true } });
}

/** Recopie l'état d'un abonnement et attribue la tranche de crédits due si la dernière facture est payée. */
export async function syncSubscription(subscriptionId: string) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await findUser(customerId, sub.metadata?.userId);
  if (!user) return; // compte supprimé entre-temps
  // Événement tardif d'un ancien abonnement : ne pas écraser l'abonnement en cours
  if (user.stripeSubscriptionId && user.stripeSubscriptionId !== sub.id && !KEEPS_PLAN.has(sub.status)) return;

  const item = sub.items.data[0];
  const parsed = planFromLookupKey(item?.price.lookup_key);
  if (!item || !parsed) throw new Error(`stripe_unknown_price:${item?.price.id}`);
  const periodStart = new Date(item.current_period_start * 1000);
  const periodEnd = new Date(item.current_period_end * 1000);
  const keeps = KEEPS_PLAN.has(sub.status);

  await db.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: user.stripeCustomerId ?? customerId,
      stripeSubscriptionId: keeps ? sub.id : null,
      subscriptionStatus: sub.status,
      subscriptionInterval: keeps ? parsed.interval : null,
      subscriptionPeriodStart: keeps ? periodStart : null,
      planRenewsAt: keeps ? periodEnd : null,
      cancelAtPeriodEnd: keeps && (sub.cancel_at_period_end || sub.cancel_at !== null),
      plan: keeps ? parsed.planId : "FREE",
    },
  });

  const invoice = sub.latest_invoice as Stripe.Invoice | null;
  if (ACTIVE.has(sub.status) && invoice?.status === "paid") await grantSlot(user.id, sub.id, parsed.planId, periodStart, periodEnd);
}

/** Achat d'un pack : crédite une seule fois, après vérification du montant réellement payé. */
export async function fulfillPackSession(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment" || session.payment_status !== "paid") return;
  const userId = session.metadata?.userId;
  const pack = CREDIT_PACKS.find((p) => p.id === session.metadata?.packId);
  if (!userId || !pack) throw new Error(`stripe_session_metadata:${session.id}`);
  if (session.currency !== "eur" || session.amount_total !== pack.price * 100) throw new Error(`stripe_amount_mismatch:${session.id}`);
  if (!(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) return;
  await grantCredits(userId, {
    amount: pack.credits, type: "PURCHASE", source: "PACK", reference: `checkout:${session.id}`, description: `Pack ${pack.credits} crédits`,
  });
}

/** Rattrapage quotidien (cron) : tranches mensuelles des abonnements annuels, webhooks manqués. */
export async function syncAllSubscriptions(limit = 500) {
  const users = await db.user.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: { id: true, stripeSubscriptionId: true },
    take: limit,
  });
  let failed = 0;
  for (const user of users) {
    try { await syncSubscription(user.stripeSubscriptionId!); }
    catch (error) { failed++; console.error("[billing.cron] synchronisation impossible", { userId: user.id, error }); }
  }
  return { checked: users.length, failed };
}
