"use server";

import type Stripe from "stripe";
import { getLocale } from "next-intl/server";
import { CREDIT_PACKS, packLookupKey, planLookupKey, type BillingInterval, type PaidPlanId } from "@/config/pricing";
import { legalConfig } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/dal";
import { isStripeConfigured, portalConfigurationId, pricesByLookupKey, stripe } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { LIMITS, limitKey } from "@/lib/security/limits";

/**
 * Paiement Stripe.
 * - Pas encore abonné → Checkout (abonnement ou pack), avec acceptation des CGV et de l'exécution immédiate.
 * - Déjà abonné → portail client : changement d'offre (immédiat, au prorata), résiliation, factures.
 * Les crédits sont attribués uniquement par le webhook (app/api/stripe/webhook), jamais au retour du navigateur.
 */
export type CheckoutItem =
  | { kind: "plan"; planId: PaidPlanId; billing: "monthly" | "yearly" }
  | { kind: "pack"; packId: string };

export type CheckoutResult = { ok: true; url: string } | { ok: false; reason: "not_implemented" | "auth" | "rate_limited" | "error" };

const KEEPS_PLAN = new Set(["active", "trialing", "past_due"]);

const CONSENT = {
  fr: `J'accepte les [conditions générales](${siteConfig.url}/fr/terms) et je demande que le service commence immédiatement. En cas de rétractation sous 14 jours, la valeur des crédits déjà utilisés sera déduite du remboursement ; une fois tous les crédits de cet achat utilisés, je ne pourrai plus me rétracter.`,
  en: `I accept the [terms](${siteConfig.url}/en/terms) and request that the service start immediately. If I withdraw within 14 days, the value of credits already used will be deducted from the refund; once all credits from this purchase are used, I can no longer withdraw.`,
};
const VAT_FOOTER = legalConfig.vatExempt ? "TVA non applicable, art. 293 B du CGI." : undefined;

async function context() {
  const user = await getCurrentUser();
  if (!user) return { error: "auth" as const };
  if (!isStripeConfigured()) return { error: "not_implemented" as const };
  if (!(await limitKey("billing", user.id, LIMITS.billing)).ok) return { error: "rate_limited" as const };
  const locale = (await getLocale()) === "fr" ? "fr" : "en";
  const billing = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true },
  });
  return { user, locale, billing } as const;
}

async function ensureCustomer(user: { id: string; email: string; name: string }, locale: "fr" | "en", existing: string | null) {
  if (existing) return existing;
  const customer = await stripe().customers.create({
    email: user.email, name: user.name, preferred_locales: [locale], metadata: { userId: user.id },
    ...(VAT_FOOTER && { invoice_settings: { footer: VAT_FOOTER } }),
  }, { idempotencyKey: `customer:${user.id}` });
  // Deux clics simultanés : l'idempotence Stripe renvoie le même client, la base ne l'enregistre qu'une fois
  await db.user.updateMany({ where: { id: user.id, stripeCustomerId: null }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

const returnUrl = (locale: string, status?: string) => `${siteConfig.url}/${locale}/credits${status ? `?checkout=${status}` : ""}`;

async function portalUrl(customer: string, locale: "fr" | "en", flow?: Stripe.BillingPortal.SessionCreateParams.FlowData) {
  const session = await stripe().billingPortal.sessions.create({
    customer, locale, return_url: returnUrl(locale), configuration: await portalConfigurationId(), ...(flow && { flow_data: flow }),
  });
  return session.url;
}

export async function startCheckout(item: CheckoutItem): Promise<CheckoutResult> {
  const ctx = await context();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };
  const { user, locale, billing } = ctx;
  try {
    const customer = await ensureCustomer(user, locale, billing.stripeCustomerId);
    const base = {
      customer, locale, client_reference_id: user.id,
      success_url: returnUrl(locale, "success"), cancel_url: returnUrl(locale),
      consent_collection: { terms_of_service: "required" },
      custom_text: { terms_of_service_acceptance: { message: CONSENT[locale] } },
      billing_address_collection: "auto",
      customer_update: { address: "auto", name: "auto" },
    } satisfies Stripe.Checkout.SessionCreateParams;

    if (item.kind === "pack") {
      const pack = CREDIT_PACKS.find((p) => p.id === item.packId);
      if (!pack) return { ok: false, reason: "error" };
      const price = (await pricesByLookupKey([packLookupKey(pack.id)])).get(packLookupKey(pack.id))!;
      const metadata = { userId: user.id, packId: pack.id };
      const session = await stripe().checkout.sessions.create({
        ...base, mode: "payment", line_items: [{ price: price.id, quantity: 1 }], metadata,
        payment_intent_data: { metadata },
        invoice_creation: { enabled: true, invoice_data: { metadata, ...(VAT_FOOTER && { footer: VAT_FOOTER }) } },
      });
      return { ok: true, url: session.url! };
    }

    const interval: BillingInterval = item.billing === "monthly" ? "month" : "year";
    const key = planLookupKey(item.planId, interval);
    const price = (await pricesByLookupKey([key])).get(key)!;

    // Déjà abonné : changement d'offre via le portail (aperçu du prorata, confirmation, paiement immédiat)
    if (billing.stripeSubscriptionId && KEEPS_PLAN.has(billing.subscriptionStatus ?? "")) {
      const sub = await stripe().subscriptions.retrieve(billing.stripeSubscriptionId);
      const current = sub.items.data[0];
      if (current.price.id === price.id) return { ok: true, url: await portalUrl(customer, locale) };
      return { ok: true, url: await portalUrl(customer, locale, {
        type: "subscription_update_confirm",
        subscription_update_confirm: { subscription: sub.id, items: [{ id: current.id, price: price.id, quantity: 1 }] },
        after_completion: { type: "redirect", redirect: { return_url: returnUrl(locale, "success") } },
      }) };
    }

    const session = await stripe().checkout.sessions.create({
      ...base, mode: "subscription", line_items: [{ price: price.id, quantity: 1 }],
      metadata: { userId: user.id }, subscription_data: { metadata: { userId: user.id } },
    });
    return { ok: true, url: session.url! };
  } catch (error) {
    console.error("[billing.checkout]", { userId: user.id, item, error });
    return { ok: false, reason: "error" };
  }
}

/** Portail client : factures, moyen de paiement, résiliation (`cancel` ouvre directement la résiliation). */
export async function openBillingPortal(intent: "manage" | "cancel" = "manage"): Promise<CheckoutResult> {
  const ctx = await context();
  if ("error" in ctx) return { ok: false, reason: ctx.error! };
  const { user, locale, billing } = ctx;
  if (!billing.stripeCustomerId) return { ok: false, reason: "error" };
  try {
    const cancel = intent === "cancel" && billing.stripeSubscriptionId && KEEPS_PLAN.has(billing.subscriptionStatus ?? "");
    return { ok: true, url: await portalUrl(billing.stripeCustomerId, locale, cancel
      ? { type: "subscription_cancel", subscription_cancel: { subscription: billing.stripeSubscriptionId! } }
      : undefined) };
  } catch (error) {
    console.error("[billing.portal]", { userId: user.id, error });
    return { ok: false, reason: "error" };
  }
}
