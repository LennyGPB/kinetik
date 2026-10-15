import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Resolver, resolveMx } from "node:dns/promises";
import type { MxRecord } from "node:dns";
import MailChecker from "mailchecker";

/**
 * Anti-bot de l'inscription, invisible pour un humain :
 * - un champ piège (« website ») masqué : un humain ne le voit pas, un robot qui remplit tout le remplit ;
 * - un jeton signé, délivré à l'affichage du formulaire : il prouve que le formulaire a été chargé (JavaScript exécuté)
 *   et qu'il s'est écoulé au moins MIN_FILL_MS avant l'envoi (un robot envoie instantanément) ;
 * - le domaine de l'email : refus des adresses jetables (liste mailchecker, ~56 000 domaines, sous-domaines compris)
 *   et des domaines qui ne peuvent pas recevoir d'email (aucun enregistrement MX).
 */

export const HONEYPOT_FIELD = "website";
const MIN_FILL_MS = 2500;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

let fallbackSecret: string | undefined;
function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") console.error("[signup-guard] AUTH_SECRET manquant ou trop court : jetons valables sur cette instance seulement.");
  fallbackSecret ??= randomBytes(32).toString("hex");
  return fallbackSecret;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`signup:${payload}`).digest("base64url");
}

/** Jeton « formulaire affiché à tel instant », signé. */
export function issueSignupToken(now = Date.now()) {
  const payload = `${now}.${randomBytes(6).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export type BotCheck = { ok: true } | { ok: false; reason: "honeypot" | "token" | "too_fast" | "expired" };

export function checkSignupForm(formData: FormData, now = Date.now()): BotCheck {
  const trap = formData.get(HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { ok: false, reason: "honeypot" };

  const token = String(formData.get("formToken") ?? "");
  const [issued, nonce, signature, extra] = token.split(".");
  if (!issued || !nonce || !signature || extra !== undefined) return { ok: false, reason: "token" };
  const expected = Buffer.from(sign(`${issued}.${nonce}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { ok: false, reason: "token" };

  const age = now - Number(issued);
  if (!Number.isFinite(age) || age < MIN_FILL_MS) return { ok: false, reason: "too_fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}

// ───────────── Domaine de l'email ─────────────

const mxCache = new Map<string, { ok: boolean; expiresAt: number }>();

/** DNS publics de secours, si le résolveur du système est injoignable (ex. serveur DNS local arrêté). */
const publicResolver = new Resolver({ timeout: 2000, tries: 2 });
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

/** Réponse définitive (« ce domaine n'existe pas / n'a pas de MX ») ou panne du résolveur. */
const NO_DOMAIN = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

/** MX du domaine, ou null si le résolveur est en panne (et non si le domaine n'existe pas). */
async function lookupMx(resolve: (domain: string) => Promise<MxRecord[]>, domain: string): Promise<MxRecord[] | null> {
  try {
    return await Promise.race([resolve(domain), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))]);
  } catch (error) {
    return NO_DOMAIN.has((error as { code?: string }).code ?? "") ? [] : null;
  }
}

/**
 * Le domaine reçoit-il des emails ? Un MX « nul » (RFC 7505 : exchange vide ou « . ») vaut refus.
 * DNS du système d'abord, DNS publics s'il est injoignable ; si les deux sont en panne : on laisse passer (jamais bloquer à tort).
 */
async function hasMailServer(domain: string) {
  const cached = mxCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.ok;
  const records = (await lookupMx(resolveMx, domain)) ?? (await lookupMx((d) => publicResolver.resolveMx(d), domain));
  const ok = records === null ? true : records.some((r) => r.exchange && r.exchange !== ".");
  // Une panne n'est pas mise en cache : le domaine sera revérifié à la prochaine inscription
  if (records !== null) mxCache.set(domain, { ok, expiresAt: Date.now() + 60 * 60 * 1000 });
  return ok;
}

export type EmailCheck = { ok: true } | { ok: false; reason: "disposable" | "no_mx" };

export async function checkEmailDomain(email: string): Promise<EmailCheck> {
  if (!MailChecker.isValid(email)) return { ok: false, reason: "disposable" };
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || !(await hasMailServer(domain))) return { ok: false, reason: "no_mx" };
  return { ok: true };
}
