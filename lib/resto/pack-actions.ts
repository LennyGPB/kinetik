"use server";

import { z } from "zod";
import { RESTO_PLAN } from "@/config/pricing";
import { RESTO_TEMPLATE_IDS } from "@/config/resto-templates";
import { getCurrentUser } from "@/lib/auth/dal";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import type { ActionResult } from "@/lib/projects/types";
import { RESTO_NETWORKS } from "./model";
import type { PackItem } from "./pack";
import { autoTopUp } from "./topup";

const allowed = (user: { role: string; plan: string }) => user.plan === "RESTO" || user.role === "ADMIN";

/**
 * Validation du pack depuis le téléphone : les contenus gardés deviennent téléchargeables (sans autre débit),
 * les contenus retirés sont supprimés. Le pack est débité une seule fois, au moment de la validation.
 * Solde trop bas : recharge automatique si le restaurateur l'a autorisée, sinon « crédits insuffisants ».
 */
export async function validatePack(packId: string, keep: string[]): Promise<ActionResult<{ autoTopUp: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!allowed(user)) return { ok: false, error: "not_found" };
  if (typeof packId !== "string" || !Array.isArray(keep) || !keep.length || keep.some((id) => typeof id !== "string")) return { ok: false, error: "invalid" };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const lock = await acquireLock(`resto-pack:${packId}`, 30_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const pack = await db.restoPack.findFirst({ where: { id: packId, userId: user.id }, include: { restaurant: { select: { autoTopUp: true } } } });
    if (!pack) return { ok: false, error: "not_found" };
    if (pack.status === "VALIDATED") return { ok: true, autoTopUp: false };
    if (pack.status !== "READY") return { ok: false, error: "busy" };
    const items = pack.items as PackItem[];
    const kept = new Set(keep);
    if (![...kept].every((id) => items.some((i) => i.projectId === id))) return { ok: false, error: "invalid" };
    const next = items.map((i) => ({ ...i, kept: kept.has(i.projectId) }));

    const spend = () => spendCredits(user.id, { amount: RESTO_PLAN.packCredits, type: "EXPORT", description: "Pack de la semaine", reference: `pack:${pack.id}` }, async (tx) => {
      // Dans la même transaction que le débit : un pack n'est validé (et payé) qu'une fois
      const { count } = await tx.restoPack.updateMany({ where: { id: pack.id, status: "READY" }, data: { status: "VALIDATED", validatedAt: new Date(), creditCost: RESTO_PLAN.packCredits, items: next } });
      if (!count) throw new Error("pack_not_ready");
    });
    let toppedUp = false;
    try { await spend(); }
    catch (error) {
      if (!(error instanceof InsufficientCreditsError)) throw error;
      if (!pack.restaurant.autoTopUp || !(await autoTopUp(user.id, pack.id))) return { ok: false, error: "insufficient_credits", required: error.required, available: error.available };
      toppedUp = true;
      await spend();
    }

    // Plats montrés : ils repassent en fin de rotation. Contenus retirés : supprimés.
    const dishIds = next.filter((i) => i.kept).flatMap((i) => i.dishIds);
    if (dishIds.length) await db.dish.updateMany({ where: { id: { in: dishIds }, restaurantId: pack.restaurantId }, data: { lastFeaturedAt: new Date() } });
    const removed = next.filter((i) => !i.kept).map((i) => i.projectId);
    if (removed.length) await db.project.deleteMany({ where: { id: { in: removed }, userId: user.id, restoPackId: pack.id } });
    return { ok: true, autoTopUp: toppedUp };
  } catch (error) {
    console.error("[resto:pack.validate]", error instanceof Error ? error.message : "UnknownError");
    return { ok: false, error: "invalid" };
  } finally {
    await releaseLock(`resto-pack:${packId}`, lock);
  }
}

/**
 * Relance le pack de la semaine quand il a été sauté (rien à préparer, fermeture) : la ligne sautée est retirée
 * (aucun crédit ni contenu ne lui est lié) et le pack est préparé de nouveau avec la carte et les réglages actuels.
 */
export async function retryRestoPack(): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!allowed(user)) return { ok: false, error: "not_found" };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const { currentPack, preparePack } = await import("./pack");
  const { restaurant, pack } = await currentPack(user.id);
  if (!restaurant || !pack || pack.status !== "SKIPPED") return { ok: false, error: "invalid" };
  await db.restoPack.deleteMany({ where: { id: pack.id, status: "SKIPPED" } });
  await preparePack(restaurant.id);
  return { ok: true };
}

const SettingsSchema = z.object({
  packContents: z.array(z.enum(RESTO_TEMPLATE_IDS)).max(RESTO_TEMPLATE_IDS.length),
  networks: z.array(z.enum(RESTO_NETWORKS)).max(RESTO_NETWORKS.length),
  packDay: z.number().int().min(0).max(6),
  packEnabled: z.boolean(),
  /** Consentement explicite à la recharge automatique (case cochée dans les réglages) */
  autoTopUp: z.boolean(),
});

/** Réglages du pack, modifiables depuis l'espace Resto. */
export async function saveRestoSettings(input: z.input<typeof SettingsSchema>): Promise<ActionResult<object>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!allowed(user)) return { ok: false, error: "not_found" };
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const { count } = await db.restaurant.updateMany({ where: { userId: user.id }, data: parsed.data });
  // Réglages changés : un pack sauté cette semaine est préparé de nouveau à la prochaine visite
  if (count) await db.restoPack.deleteMany({ where: { userId: user.id, status: "SKIPPED" } });
  return count ? { ok: true } : { ok: false, error: "not_found" };
}
