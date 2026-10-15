import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Client Stripe (version d'API figée par le SDK installé). */
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured");
  client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "Kinetik" } });
  return client;
}

/** Prix actifs indexés par lookup key (cache court : les prix ne changent qu'au `stripe:setup`). */
let priceCache: { at: number; prices: Map<string, Stripe.Price> } | undefined;
export async function pricesByLookupKey(keys: string[]) {
  if (!priceCache || Date.now() - priceCache.at > 10 * 60_000 || keys.some((k) => !priceCache!.prices.has(k))) {
    const list = await stripe().prices.list({ lookup_keys: keys, active: true, limit: 100 });
    priceCache = { at: Date.now(), prices: new Map([...(priceCache?.prices ?? []), ...list.data.map((p) => [p.lookup_key!, p] as const)]) };
  }
  const missing = keys.filter((k) => !priceCache!.prices.has(k));
  if (missing.length) throw new Error(`stripe_price_missing:${missing.join(",")}`);
  return priceCache.prices;
}

/** Configuration du portail client créée par `npm run stripe:setup` (repérée par ses métadonnées). */
let portalConfiguration: string | undefined;
export async function portalConfigurationId() {
  if (portalConfiguration) return portalConfiguration;
  const list = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  portalConfiguration = list.data.find((c) => c.metadata?.kinetik === "portal")?.id;
  if (!portalConfiguration) throw new Error("stripe_portal_missing");
  return portalConfiguration;
}
