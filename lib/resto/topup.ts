import "server-only";
import { after } from "next/server";
import type Stripe from "stripe";
import { CREDIT_PACKS, packLookupKey } from "@/config/pricing";
import { legalConfig } from "@/config/legal";
import { isStripeConfigured, pricesByLookupKey, stripe } from "@/lib/billing/stripe";
import { grantCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { notifyPurchase } from "@/lib/services/telegram";

/** Pack acheté par la recharge automatique de l'offre Resto */
export const RESTO_TOPUP_PACK = CREDIT_PACKS.find((p) => p.credits === 100)!;

/**
 * Recharge automatique (consentie dans les réglages du pack) : facture Stripe du pack de 100 crédits, payée avec
 * le moyen de paiement de l'abonnement, sans que le restaurateur soit présent. Une seule fois par `key` (un pack).
 * Crédite tout de suite si la facture est payée ; sinon (carte refusée, authentification demandée) la facture est annulée.
 */
export async function autoTopUp(userId: string, key: string): Promise<boolean> {
  if (!isStripeConfigured()) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, stripeCustomerId: true, stripeSubscriptionId: true } });
  if (!user?.stripeCustomerId || !user.stripeSubscriptionId) return false;
  const reference = `topup:${key}`;
  if (await db.creditTransaction.findFirst({ where: { userId, reference: { startsWith: reference } }, select: { id: true } })) return true;
  try {
    const sub = await stripe().subscriptions.retrieve(user.stripeSubscriptionId);
    const customer = await stripe().customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
    const method = sub.default_payment_method ?? customer.invoice_settings?.default_payment_method;
    if (!method) return false;
    const lookup = packLookupKey(RESTO_TOPUP_PACK.id);
    const price = (await pricesByLookupKey([lookup])).get(lookup)!;
    const metadata = { userId, packId: RESTO_TOPUP_PACK.id, autoTopUp: key };
    const footer = legalConfig.vatExempt ? "TVA non applicable, art. 293 B du CGI." : undefined;
    const invoice = await stripe().invoices.create({
      customer: user.stripeCustomerId, collection_method: "charge_automatically", auto_advance: false,
      default_payment_method: typeof method === "string" ? method : method.id, metadata, ...(footer && { footer }),
    }, { idempotencyKey: `resto-topup-invoice:${userId}:${key}` });
    await stripe().invoiceItems.create({ customer: user.stripeCustomerId, invoice: invoice.id, pricing: { price: price.id }, metadata }, { idempotencyKey: `resto-topup-item:${userId}:${key}` });
    await stripe().invoices.finalizeInvoice(invoice.id!);
    const paid = await stripe().invoices.pay(invoice.id!, { off_session: true }).catch(() => null);
    if (paid?.status !== "paid" || paid.amount_paid !== RESTO_TOPUP_PACK.price * 100) {
      await stripe().invoices.voidInvoice(invoice.id!).catch(() => null);
      return false;
    }
    await grantCredits(userId, { amount: RESTO_TOPUP_PACK.credits, type: "PURCHASE", source: "PACK", reference: `${reference}:${invoice.id}`, description: `Recharge automatique ${RESTO_TOPUP_PACK.credits} crédits` });
    try { after(() => notifyPurchase({ label: `Recharge Resto ${RESTO_TOPUP_PACK.credits} crédits`, amountCents: paid.amount_paid, email: user.email })); } catch { /* hors requête */ }
    return true;
  } catch (error) {
    console.error("[resto:topup]", { userId, error: error instanceof Error ? error.message : "UnknownError" });
    return false;
  }
}
