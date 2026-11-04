import { RESTO_PLAN } from "@/config/pricing";

/**
 * Comptes de l'offre Resto, sans accès base (testable) : l'interface parle en packs et en plats du jour.
 * Les crédits des packs du mois sont mis de côté : un plat du jour ne peut pas consommer le crédit d'un pack à venir.
 */

const DAY = 86_400_000;
/** Re-téléchargement gratuit d'un contenu déjà payé (correction d'une faute, autre essai) pendant ce délai */
export const RESTO_FREE_REEXPORT_MS = DAY;

/**
 * Packs à payer d'ici la fin de la tranche de crédits : un par semaine, le jour choisi (lundi = 0).
 * `todayDone` : le pack d'aujourd'hui est déjà validé ou sauté ; `pending` : packs passés prêts mais pas encore validés.
 */
export function packsUntil(now: Date, end: Date | null, packDay: number, enabled = true, todayDone = false, pending = 0) {
  return Math.max(0, futurePacks(now, end, packDay, enabled) - (todayDone && (now.getDay() + 6) % 7 === packDay ? 1 : 0)) + pending;
}

function futurePacks(now: Date, end: Date | null, packDay: number, enabled: boolean) {
  if (!enabled || !end || end <= now) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = (today.getDay() + 6) % 7;
  let next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((packDay - weekday + 7) % 7));
  let count = 0;
  while (next < end) { count++; next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 7); }
  return count;
}

export type RestoAllowance = {
  /** Packs encore couverts ce mois-ci */
  packsLeft: number;
  /** Packs prévus mais pas couverts par le solde (alerte et recharge en phase 4) */
  packsMissing: number;
  /** Plats du jour possibles avec ce qui reste une fois les packs mis de côté */
  platsLeft: number;
  /** Crédits mis de côté pour les packs */
  reserved: number;
  /** Crédits utilisables pour un plat du jour */
  free: number;
};

export function restoAllowance(balance: number, packsPlanned: number): RestoAllowance {
  const safe = Math.max(0, Math.floor(balance));
  const packsLeft = Math.min(packsPlanned, Math.floor(safe / RESTO_PLAN.packCredits));
  const reserved = packsLeft * RESTO_PLAN.packCredits;
  const free = safe - reserved;
  return { packsLeft, packsMissing: packsPlanned - packsLeft, platsLeft: Math.floor(free / RESTO_PLAN.platCredits), reserved, free };
}

export type RestoQuote = {
  credits: number;
  /**
   * welcome : vidéo de bienvenue offerte ; again : re-téléchargement gratuit ; dish : un plat du jour ;
   * pack : contenu d'un pack validé (déjà payé) ; packPending : pack pas encore validé, téléchargement bloqué
   */
  kind: "welcome" | "again" | "dish" | "pack" | "packPending";
};

/**
 * Prix d'un téléchargement de contenu Resto, ou null quand le tarif habituel s'applique (compte non Resto).
 * `firstExportAt` : premier rendu non échoué de ce contenu.
 */
export function restoQuote(input: { restoPlan: boolean; welcome: boolean; firstExportAt: Date | null; now: Date; pack?: "validated" | "pending" | null }): RestoQuote | null {
  if (input.pack === "validated") return { credits: 0, kind: "pack" };
  if (input.pack === "pending") return { credits: 0, kind: "packPending" };
  if (input.welcome && !input.firstExportAt) return { credits: 0, kind: "welcome" };
  if (!input.restoPlan) return null;
  if (input.firstExportAt && input.now.getTime() - input.firstExportAt.getTime() < RESTO_FREE_REEXPORT_MS) return { credits: 0, kind: "again" };
  return { credits: RESTO_PLAN.platCredits, kind: "dish" };
}
