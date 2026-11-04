import "server-only";
import type { PlanId } from "@/config/pricing";
import { getCreditBalance } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { isMissingTable } from "./carte";
import { parisDay } from "./pack-builder";
import { packsUntil, restoAllowance, restoQuote, type RestoAllowance, type RestoQuote } from "./allowance";

const shiftDate = (iso: string, days: number) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10); };

/** Marque des vidéos de bienvenue (Project.brief) : leur premier téléchargement est offert. */
export const RESTO_WELCOME_BRIEF = "resto-welcome";

/** Packs et plats du jour restants d'un compte, d'après son solde et le jour de pack de son restaurant. */
export async function getRestoAllowance(userId: string, now = new Date()): Promise<RestoAllowance & { balance: number; renewsAt: Date | null }> {
  const [balance, restaurant] = await Promise.all([
    getCreditBalance(userId),
    getRestaurant(userId),
  ]);
  const end = balance.subscriptionExpiresAt;
  const { date } = parisDay(now);
  const packs = restaurant ? await db.restoPack.findMany({ where: { restaurantId: restaurant.id, packDate: { gte: shiftDate(date, -31) } }, select: { packDate: true, status: true } }).catch(() => []) : [];
  const todayDone = packs.some((p) => p.packDate === date && (p.status === "VALIDATED" || p.status === "SKIPPED"));
  const pending = packs.filter((p) => p.packDate < date && (p.status === "READY" || p.status === "PREPARING")).length;
  const planned = restaurant ? packsUntil(now, end, restaurant.packDay, restaurant.packEnabled, todayDone, pending) : 0;
  return { ...restoAllowance(balance.total, planned), balance: balance.total, renewsAt: end };
}

/** Prix du téléchargement d'un contenu Resto pour ce compte (null : tarif habituel). */
export async function quoteRestoExport(user: { id: string; plan: PlanId }, project: { id: string; brief: string | null; restoPackId?: string | null }): Promise<RestoQuote | null> {
  const first = await db.render.findFirst({ where: { projectId: project.id, status: { not: "FAILED" } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  return restoQuote({ restoPlan: user.plan === "RESTO", welcome: project.brief === RESTO_WELCOME_BRIEF, firstExportAt: first?.createdAt ?? null, now: new Date(), pack: project.restoPackId ? await packState(project.id, project.restoPackId) : null });
}

/** Contenu d'un pack : validé et gardé (téléchargement inclus), en attente de validation, ou retiré (tarif habituel). */
async function packState(projectId: string, packId: string) {
  const pack = await db.restoPack.findUnique({ where: { id: packId }, select: { status: true, items: true } });
  if (!pack) return null;
  if (pack.status === "READY" || pack.status === "PREPARING") return "pending" as const;
  const item = (pack.items as { projectId: string; kept: boolean }[]).find((i) => i.projectId === projectId);
  return pack.status === "VALIDATED" && item?.kept ? "validated" as const : null;
}

/** Le restaurant du compte (le premier créé), ou null (pas encore créé, ou migration Resto non appliquée). */
export async function getRestaurant(userId: string) {
  try { return await db.restaurant.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }); }
  catch (error) { if (isMissingTable(error)) return null; throw error; }
}
