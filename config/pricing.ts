/**
 * Tarifs PROVISOIRES — toutes les valeurs sont fictives et modifiables ici.
 * Les `stripePriceId` seront renseignés lors du branchement de Stripe.
 */

export type PlanId = "FREE" | "STARTER" | "PRO";

export type PricingPlan = {
  id: PlanId;
  name: string;
  /** Prix mensuel en euros */
  monthlyPrice: number;
  /** Prix mensuel équivalent en facturation annuelle */
  yearlyPrice: number;
  /** Crédits par mois (abonnement) ou crédits de départ (gratuit) */
  credits: number;
  watermark: boolean;
  maxQuality: "HD" | "UHD";
  highlighted?: boolean;
  stripePriceId?: { monthly?: string; yearly?: string };
};

export const PLANS: PricingPlan[] = [
  { id: "FREE", name: "Free", monthlyPrice: 0, yearlyPrice: 0, credits: 30, watermark: true, maxQuality: "HD" },
  { id: "STARTER", name: "Starter", monthlyPrice: 19, yearlyPrice: 15, credits: 200, watermark: false, maxQuality: "HD" },
  { id: "PRO", name: "Pro", monthlyPrice: 49, yearlyPrice: 39, credits: 600, watermark: false, maxQuality: "UHD", highlighted: true },
];

export type CreditPack = {
  id: string;
  credits: number;
  price: number;
  /** Badge marketing optionnel */
  badge?: string;
  stripePriceId?: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack-100", credits: 100, price: 12 },
  { id: "pack-300", credits: 300, price: 30, badge: "Populaire" },
  { id: "pack-1000", credits: 1000, price: 89, badge: "-26 %" },
];

export const CURRENCY = "EUR";

export function formatPrice(amount: number, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function getPlan(id: PlanId) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
