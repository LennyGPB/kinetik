import { headers } from "next/headers";
import { formatRetry, rateLimitAll, type LimitResult, type Rule } from "@/lib/rate-limit";
import { ipFromHeaders } from "./ip";

/**
 * TOUTES les limites de fréquence de Kinetik, au même endroit.
 *
 * Deux couches :
 * 1. proxy.ts : plafond global par IP sur toute requête POST (Server Actions et API), y compris celles ajoutées plus tard.
 * 2. Chaque action / route : ses propres règles, par compte ET par IP quand c'est pertinent.
 *
 * Valeurs choisies pour qu'un usage humain normal ne les touche jamais.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const LIMITS = {
  /** proxy.ts : toute requête POST, par IP */
  globalPost: [{ limit: 120, windowMs: MIN }, { limit: 1500, windowMs: HOUR }],

  // ── Authentification (par IP, par email, et les deux) ──
  login: {
    ipEmail: { limit: 5, windowMs: 15 * MIN },
    /** Attaque d'un même compte depuis beaucoup d'IP (listes de mots de passe volés) */
    email: { limit: 15, windowMs: HOUR },
    /** Une IP qui essaie beaucoup de comptes */
    ip: { limit: 30, windowMs: 15 * MIN },
  },
  register: [{ limit: 5, windowMs: HOUR }, { limit: 15, windowMs: DAY }],
  /** Formulaire de support (message envoyé sur Telegram) */
  support: [{ limit: 3, windowMs: 10 * MIN }, { limit: 10, windowMs: DAY }],
  /** Champs « mot de passe actuel » des paramètres (changer d'email / de mot de passe, supprimer le compte) */
  passwordCheck: [{ limit: 5, windowMs: 15 * MIN }],
  adminUnlock: { user: { limit: 5, windowMs: 15 * MIN }, ip: { limit: 10, windowMs: 15 * MIN } },

  // ── Coût réel (Claude, Chrome, Lambda) ──
  generation: [{ limit: 3, windowMs: MIN }, { limit: 20, windowMs: HOUR }, { limit: 60, windowMs: DAY }],
  edit: [{ limit: 10, windowMs: MIN }, { limit: 120, windowMs: HOUR }, { limit: 500, windowMs: DAY }],
  capture: [{ limit: 5, windowMs: 10 * MIN }, { limit: 30, windowMs: DAY }],
  export: [{ limit: 5, windowMs: MIN }, { limit: 30, windowMs: HOUR }, { limit: 100, windowMs: DAY }],
  /** Rendus en cours simultanément, par compte (3 : un export dans les trois formats à la fois) */
  exportConcurrent: 3,
  captureGlobal: [{ limit: 100, windowMs: DAY, strict: true }],
  exportGlobal: [{ limit: 100, windowMs: DAY, strict: true }],
  /** Part du plafond global ouverte aux comptes gratuits (les payants gardent le reste) */
  exportGlobalFree: [{ limit: 40, windowMs: DAY, strict: true }],

  // ── Écritures en base / stockage ──
  setting: [{ limit: 30, windowMs: MIN }, { limit: 600, windowMs: HOUR }],
  project: [{ limit: 20, windowMs: MIN }, { limit: 200, windowMs: HOUR }],
  account: [{ limit: 10, windowMs: MIN }, { limit: 60, windowMs: HOUR }],
  /** Paiement Stripe (création de sessions Checkout / portail) */
  billing: [{ limit: 10, windowMs: MIN }, { limit: 60, windowMs: HOUR }],
  upload: [{ limit: 30, windowMs: MIN }, { limit: 300, windowMs: HOUR }, { limit: 1000, windowMs: DAY }],
  /** Suivi d'un export (le client interroge toutes les ~2 s) */
  renderStatus: [{ limit: 90, windowMs: MIN }],
  admin: [{ limit: 60, windowMs: MIN }],

  // ── Lectures publiques, par IP ──
  sharePage: [{ limit: 60, windowMs: MIN }],
  /** Fichiers servis par /api/uploads (le lecteur vidéo fait des requêtes partielles) */
  fileRead: [{ limit: 600, windowMs: MIN }],
} as const satisfies Record<string, unknown>;

/** IP du client pour la requête en cours (Server Action, page ou route). */
export async function requestIp() {
  return ipFromHeaders(await headers());
}

/** Applique une liste de règles à une même clé (ex. par minute + par heure). */
export function limitKey(scope: string, id: string, rules: readonly Rule[]): Promise<LimitResult> {
  return rateLimitAll(rules.map((rule) => [`${scope}:${id}`, { ...rule, strict: rule.strict || ["capture", "upload", "register"].includes(scope) }]));
}

/** Message d'erreur standard. */
export function tooMany(result: LimitResult) {
  return `Trop de requêtes. Réessaie dans ${formatRetry(result.retryAfterMs)}.`;
}
