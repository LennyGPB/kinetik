/**
 * Prépare le compte Stripe à partir de config/pricing.ts (idempotent, à relancer après chaque changement de tarif) :
 * produits, prix avec lookup keys, configuration du portail client, et en option l'endpoint webhook.
 * Un prix modifié devient un nouveau prix : la lookup key lui est transférée et l'ancien est archivé
 * (les abonnés en cours restent sur l'ancien tarif).
 *
 *   npm run stripe:setup
 *   npm run stripe:setup -- --webhook https://kinetik.app/api/stripe/webhook   (production : affiche le secret à copier)
 */
import type Stripe from "stripe";
import { CREDIT_PACKS, PLANS, packLookupKey, planAmountCents, planLookupKey, type BillingInterval, type PaidPlanId } from "../config/pricing";
import { siteConfig } from "../config/site";
import { stripe } from "../lib/billing/stripe";

const s = stripe();
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "invoice.paid",
  "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
];

async function product(id: string, name: string, description: string) {
  const all = await s.products.list({ active: true, limit: 100 });
  const existing = all.data.find((p) => p.metadata.kinetik === id);
  if (existing) return existing.name === name ? existing : s.products.update(existing.id, { name, description });
  return s.products.create({ name, description, metadata: { kinetik: id } });
}

async function price(productId: string, lookupKey: string, amount: number, interval?: BillingInterval) {
  const [current] = (await s.prices.list({ lookup_keys: [lookupKey], limit: 1 })).data;
  if (current?.active && current.unit_amount === amount && current.product === productId && (current.recurring?.interval ?? undefined) === interval) {
    console.log(`  = ${lookupKey} (${amount / 100} €)`);
    return current;
  }
  const created = await s.prices.create({
    product: productId, currency: "eur", unit_amount: amount, lookup_key: lookupKey, transfer_lookup_key: true,
    tax_behavior: "inclusive", ...(interval && { recurring: { interval } }),
  });
  if (current?.active) await s.prices.update(current.id, { active: false });
  console.log(`  + ${lookupKey} (${amount / 100} €)${current ? " — ancien prix archivé" : ""}`);
  return created;
}

async function main() {
  console.log(`Stripe en mode ${process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "test"} · site ${siteConfig.url}`);
  const subscriptionProducts: Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product[] = [];

  for (const plan of PLANS.filter((p) => p.monthlyPrice > 0)) {
    const id = plan.id as PaidPlanId;
    const prod = await product(`plan_${id.toLowerCase()}`, `Kinetik ${plan.name}`, `${plan.credits} crédits par mois`);
    const prices = [];
    for (const interval of ["month", "year"] as const) prices.push((await price(prod.id, planLookupKey(id, interval), planAmountCents(plan, interval), interval)).id);
    subscriptionProducts.push({ product: prod.id, prices });
  }
  for (const pack of CREDIT_PACKS) {
    const prod = await product(pack.id, `Kinetik — ${pack.credits} crédits`, "Pack de crédits sans expiration");
    await price(prod.id, packLookupKey(pack.id), pack.price * 100);
  }

  const portal: Stripe.BillingPortal.ConfigurationCreateParams = {
    business_profile: { headline: "Kinetik", privacy_policy_url: `${siteConfig.url}/fr/privacy`, terms_of_service_url: `${siteConfig.url}/fr/terms` },
    default_return_url: `${siteConfig.url}/fr/credits`,
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "unused", "other"] } },
      // Changement d'offre immédiat, différence facturée tout de suite (les crédits manquants sont attribués par le webhook)
      subscription_update: { enabled: true, default_allowed_updates: ["price"], proration_behavior: "always_invoice", products: subscriptionProducts },
    },
    metadata: { kinetik: "portal" },
  };
  const configs = await s.billingPortal.configurations.list({ active: true, limit: 100 });
  const existing = configs.data.find((c) => c.metadata?.kinetik === "portal");
  if (existing) await s.billingPortal.configurations.update(existing.id, portal);
  else await s.billingPortal.configurations.create(portal);
  console.log(`Portail client ${existing ? "mis à jour" : "créé"}.`);

  const url = process.argv[process.argv.indexOf("--webhook") + 1];
  if (process.argv.includes("--webhook") && url?.startsWith("https://")) {
    const hooks = await s.webhookEndpoints.list({ limit: 100 });
    const hook = hooks.data.find((h) => h.url === url);
    if (hook) {
      await s.webhookEndpoints.update(hook.id, { enabled_events: WEBHOOK_EVENTS });
      console.log("Webhook déjà présent : événements mis à jour (son secret reste celui affiché à sa création).");
    } else {
      const created = await s.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, description: "Kinetik" });
      console.log(`Webhook créé. STRIPE_WEBHOOK_SECRET=${created.secret}  ← à mettre dans les variables d'environnement Vercel`);
    }
  }
}

void main().catch((error: unknown) => {
  console.error("Stripe setup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
