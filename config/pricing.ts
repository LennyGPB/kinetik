/**
 * Tarifs : source unique de vérité pour l'affichage, les CGV et Stripe.
 * Après une modification, relancer `npm run stripe:setup` : il crée les nouveaux prix Stripe
 * et leur transfère les lookup keys ci-dessous (les abonnés en cours gardent leur ancien prix).
 */

import { SIGNUP_BONUS_CREDITS } from "./credits";

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
  /** SD = 720p · HD = 1080p */
  maxQuality: "SD" | "HD";
  highlighted?: boolean;
};

export const PLANS: PricingPlan[] = [
  { id: "FREE", name: "Free", monthlyPrice: 0, yearlyPrice: 0, credits: SIGNUP_BONUS_CREDITS, watermark: true, maxQuality: "SD" },
  { id: "STARTER", name: "Starter", monthlyPrice: 29, yearlyPrice: 23, credits: 200, watermark: false, maxQuality: "SD" },
  { id: "PRO", name: "Pro", monthlyPrice: 79, yearlyPrice: 63, credits: 600, watermark: false, maxQuality: "HD", highlighted: true },
];

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
  return interval === "month" ? plan.monthlyPrice * 100 : plan.yearlyPrice * 12 * 100;
}

export function planFromLookupKey(key: string | null | undefined): { planId: PaidPlanId; interval: BillingInterval } | null {
  const match = /^kinetik_(starter|pro)_(month|year)$/.exec(key ?? "");
  return match ? { planId: match[1].toUpperCase() as PaidPlanId, interval: match[2] as BillingInterval } : null;
}
