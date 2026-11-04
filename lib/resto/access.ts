import { isFeatureEnabled } from "@/config/features";
import type { PlanId } from "@/config/pricing";

/**
 * Niche Resto : ouverte à tous quand la feature est publiée, aux admins seulement en attendant.
 * Un abonné Resto y a toujours accès (il a payé pour), même si la feature est coupée ensuite.
 */
/** Contenus Resto créables : il faut une offre (Resto, ou Starter/Pro avec leurs crédits). Sans offre → page d'offre Resto. */
export function needsRestoOffer(user: { role: "USER" | "ADMIN"; plan?: PlanId }) {
  return user.plan === "FREE" && user.role !== "ADMIN";
}

export function canUseResto(user: { role: "USER" | "ADMIN"; plan?: PlanId }) {
  return isFeatureEnabled("resto") || user.role === "ADMIN" || user.plan === "RESTO";
}
