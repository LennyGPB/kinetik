import type { PlanId } from "@/config/pricing";

/**
 * Paiement — STUB.
 * À brancher sur Stripe : une Server Action crée une Checkout Session et renvoie son URL,
 * puis un webhook écrit les CreditTransaction (PURCHASE / SUBSCRIPTION) via lib/credits.
 */
export type CheckoutItem =
  | { kind: "plan"; planId: PlanId; billing: "monthly" | "yearly" }
  | { kind: "pack"; packId: string };

export type CheckoutResult = { ok: true; url: string } | { ok: false; reason: "not_implemented" };

export async function startCheckout(item: CheckoutItem): Promise<CheckoutResult> {
  void item;
  return { ok: false, reason: "not_implemented" };
}
