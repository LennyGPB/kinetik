import { legalConfig } from "./legal";

/**
 * Tarifs : source unique de vérité pour l'affichage, les CGV et Stripe.
 * Après une modification, relancer `npm run stripe:setup` : il crée les nouveaux prix Stripe
 * et leur transfère les lookup keys ci-dessous (les abonnés en cours gardent leur ancien prix).
 */

export type PlanId = "FREE" | "STARTER" | "PRO" | "RESTO";

export type PricingPlan = {
  id: PlanId;
  name: string;
  /** Prix mensuel en euros */
  monthlyPrice: number;
  /** Prix mensuel équivalent en facturation annuelle */
  yearlyPrice: number;
  /** Crédits par mois */
  credits: number;
  watermark: boolean;
  /** SD = 720p · HD = 1080p */
  maxQuality: "SD" | "HD";
  highlighted?: boolean;
};

/**
 * FREE = compte sans abonnement (jamais abonné ou résilié) : aucun crédit offert, il paie avec des packs (720p, sans filigrane).
 * Ce n'est pas une offre affichée : seuls les PAID_PLANS sont proposés.
 */
export const PLANS: PricingPlan[] = [
  { id: "FREE", name: "Free", monthlyPrice: 0, yearlyPrice: 0, credits: 0, watermark: false, maxQuality: "SD" },
  { id: "STARTER", name: "Starter", monthlyPrice: 29, yearlyPrice: 23, credits: 200, watermark: false, maxQuality: "SD" },
  { id: "PRO", name: "Pro", monthlyPrice: 79, yearlyPrice: 63, credits: 600, watermark: false, maxQuality: "HD", highlighted: true },
  // Offre restaurateurs : vendue depuis l'espace Resto, jamais affichée avec les offres générales (voir PAID_PLANS).
  // 1080p pour les écrans TV ; crédits au même prix unitaire que Starter (voir RESTO_PLAN).
  { id: "RESTO", name: "Resto", monthlyPrice: 39, yearlyPrice: 31, credits: 270, watermark: false, maxQuality: "HD" },
];

/** Offres proposées sur les pages Tarifs et Crédits (l'offre Resto a son propre parcours). */
export type PublicPlanId = Exclude<PaidPlanId, "RESTO">;
export const PAID_PLANS = PLANS.filter((p): p is PricingPlan & { id: PublicPlanId } => p.id !== "FREE" && p.id !== "RESTO");
/** Toutes les offres d'abonnement vendues (Stripe, CGV). */
export const SUBSCRIPTION_PLANS = PLANS.filter((p): p is PricingPlan & { id: PaidPlanId } => p.id !== "FREE");

export type CreditPack = {
  id: string;
  credits: number;
  price: number;
  /** Badge marketing optionnel */
  badge?: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack-100", credits: 100, price: 12 },
  { id: "pack-300", credits: 300, price: 30, badge: "Populaire" },
  { id: "pack-1000", credits: 1000, price: 89, badge: "-26 %" },
];

export const CURRENCY = "EUR";

export function formatPrice(amount: number, locale = "en-GB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/**
 * Offre qui fixe les fonctions (qualité, filigrane) : celle du compte, mais un admin a toujours au moins celles de Pro.
 * Pour l'affichage (« ton offre ») et la facturation, c'est user.plan qui compte.
 */
export function featurePlan(user: { plan: PlanId; role: "USER" | "ADMIN" }) {
  return getPlan(user.role === "ADMIN" && (user.plan === "FREE" || user.plan === "STARTER") ? "PRO" : user.plan);
}

export function getPlan(id: PlanId) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export type BillingInterval = "month" | "year";
export type PaidPlanId = Exclude<PlanId, "FREE">;

/** Lookup keys des prix Stripe (identiques en test et en live : aucun identifiant de prix dans le code). */
export const planLookupKey = (planId: PaidPlanId, interval: BillingInterval) => `kinetik_${planId.toLowerCase()}_${interval}`;
export const packLookupKey = (packId: string) => `kinetik_${packId}`;

/** Montant facturé en centimes : par mois, ou pour l'année entière. */
export function planAmountCents(plan: PricingPlan, interval: BillingInterval) {
  const base = interval === "month" ? plan.monthlyPrice * 100 : plan.yearlyPrice * 12 * 100;
  return Math.round(base * (plan.id === "RESTO" ? restoVatFactor() : 1));
}

/**
 * L'offre Resto s'affiche hors taxes (clientèle professionnelle). Tant que l'éditeur est en franchise de TVA
 * (legalConfig.vatExempt), aucune TVA n'est facturée : le prix payé est le prix affiché. Sinon, 20 % s'ajoutent.
 */
export function restoVatFactor() {
  return legalConfig.vatExempt ? 1 : 1.2;
}

/** Coûts fixes de l'offre Resto, en crédits : l'interface parle en packs et en plats du jour, jamais en crédits. */
export const RESTO_PLAN = {
  /** Un pack de la semaine (jusqu'à 5 contenus) */
  packCredits: 30,
  /** Un plat du jour téléchargé */
  platCredits: 8,
} as const;

export function planFromLookupKey(key: string | null | undefined): { planId: PaidPlanId; interval: BillingInterval } | null {
  const match = /^kinetik_(starter|pro|resto)_(month|year)$/.exec(key ?? "");
  return match ? { planId: match[1].toUpperCase() as PaidPlanId, interval: match[2] as BillingInterval } : null;
}
