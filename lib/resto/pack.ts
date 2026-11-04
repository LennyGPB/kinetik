import "server-only";
import { createHash } from "node:crypto";
import { RESTO_STYLE_IDS, RESTO_TEMPLATE_IDS, type RestoStyleId, type RestoTemplateId } from "@/config/resto-templates";
import { db } from "@/lib/db";
import { parseSceneGraph } from "@/lib/projects/scenes";
import type { UploadedFile } from "@/lib/storage/client";
import { packCaptions } from "./captions";
import type { RestoContent } from "./content";
import { insertResto } from "./create";
import { ClosuresSchema, HoursSchema } from "./model";
import { currentPackDate, packWeekStart, parisDay, planPack, type PackDish, type SkipReason } from "./pack-builder";

/** Contenu d'un pack, enregistré dans RestoPack.items */
export type PackItem = { projectId: string; template: RestoTemplateId; caption: string; dishIds: string[]; kept: boolean };
export type PackSkipped = { template: RestoTemplateId; reason: SkipReason };

/** Un pack resté « en préparation » plus longtemps que ça a échoué en route : il est repris. */
const STALE_MS = 10 * 60_000;

/** Identifiant stable d'un contenu du pack (reprise sûre : la même préparation ne crée pas deux projets). */
function itemId(packId: string, index: number) {
  const hex = createHash("sha256").update(`${packId}:${index}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const assetFile = (a: { url: string; fileName: string; mimeType: string | null; sizeBytes: number | null; width: number | null; height: number | null }): UploadedFile =>
  ({ url: a.url, fileName: a.fileName, mimeType: a.mimeType ?? "image/jpeg", sizeBytes: a.sizeBytes ?? 0, ...(a.width && { width: a.width }), ...(a.height && { height: a.height }) });
const norm = (text: string) => text.trim().toLowerCase();

/** Derniers contenus Resto du compte : modèles à reprendre, photos déjà prises par plat, logo. */
async function history(userId: string) {
  const projects = await db.project.findMany({
    where: { userId, kind: "MOTION", videoType: { startsWith: "resto-" }, status: "READY" },
    orderBy: { updatedAt: "desc" }, take: 60,
    select: { versions: { orderBy: { number: "desc" }, take: 1, select: { scenes: true } }, assets: { where: { type: { in: ["SCREEN", "LOGO"] } }, orderBy: { position: "asc" } } },
  });
  const recent: Partial<Record<RestoTemplateId, { content: RestoContent; photos: string[] }>> = {};
  const dishPhotos = new Map<string, { url: string; focus: { x: number; y: number } }>();
  const files = new Map<string, UploadedFile>();
  let logo: UploadedFile | null = null;
  for (const project of projects) {
    const content = project.versions[0] && parseSceneGraph(project.versions[0].scenes).resto;
    if (!content) continue;
    const screens = project.assets.filter((a) => a.type === "SCREEN");
    for (const a of screens) files.set(a.url, assetFile(a));
    logo ??= (() => { const l = project.assets.find((a) => a.type === "LOGO"); return l ? assetFile(l) : null; })();
    recent[content.template] ??= { content, photos: screens.map((a) => a.url) };
    if (content.template === "plat-du-jour" && screens[0] && !dishPhotos.has(norm(content.dish.name))) dishPhotos.set(norm(content.dish.name), { url: screens[0].url, focus: content.focus });
  }
  return { recent, dishPhotos, files, logo };
}

/**
 * Prépare le pack du jour d'un restaurant (s'il n'existe pas déjà) : composition, contenus créés comme des projets,
 * légendes. Rien n'est débité ici : le pack l'est à la validation. Renvoie l'id du pack.
 */
export async function preparePack(restaurantId: string, now = new Date()) {
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    include: { user: { select: { id: true, plan: true, role: true } }, dishes: { include: { category: { select: { name: true } } } } },
  });
  if (!restaurant?.onboardedAt || !restaurant.packEnabled) return null;
  const { user } = restaurant;
  if (user.plan !== "RESTO" && user.role !== "ADMIN") return null;
  const packDate = currentPackDate(now, restaurant.packDay);

  // Une ligne par restaurant et par jour de pack : deux préparations simultanées n'en créent qu'une.
  // Jour de pack changé en cours de semaine : le pack de la semaine reste le seul (pas de second débit).
  let pack = await latestPack(restaurantId, packDate);
  if (pack && (pack.status !== "PREPARING" || now.getTime() - pack.updatedAt.getTime() < STALE_MS)) return pack.id;
  if (!pack) {
    try { pack = await db.restoPack.create({ data: { restaurantId, userId: user.id, packDate } }); }
    catch { return (await latestPack(restaurantId, packDate))?.id ?? null; }
  } else await db.restoPack.update({ where: { id: pack.id }, data: { updatedAt: now } });

  try {
    const locale = restaurant.locale === "en" ? "en" : "fr";
    const { recent, dishPhotos, files, logo } = await history(user.id);
    const dishes: PackDish[] = restaurant.dishes.map((d) => ({
      id: d.id, name: d.name, description: d.description, priceCents: d.priceCents, verified: d.verified, active: d.active,
      featured: d.featured, lastFeaturedAt: d.lastFeaturedAt, category: d.category?.name ?? null, photo: dishPhotos.get(norm(d.name)) ?? null,
    }));
    const contents = restaurant.packContents.filter((id): id is RestoTemplateId => (RESTO_TEMPLATE_IDS as readonly string[]).includes(id));
    const style = (RESTO_STYLE_IDS as readonly string[]).includes(restaurant.styleId ?? "") ? restaurant.styleId as RestoStyleId : "bistrot";
    const plan = planPack({
      restaurantName: restaurant.name, style, locale, contents, dishes, recent, weekStart: packWeekStart(packDate),
      hours: HoursSchema.safeParse(restaurant.hours).data ?? [], closures: ClosuresSchema.safeParse(restaurant.closures).data ?? [],
    });
    if (plan.closed || !plan.items.length) {
      await db.restoPack.update({ where: { id: pack.id }, data: { status: "SKIPPED", reason: plan.closed ? "closed" : "empty", skipped: plan.skipped } });
      return pack.id;
    }
    const items: PackItem[] = [];
    for (const [index, item] of plan.items.entries()) {
      const photos = item.photos.map((url) => files.get(url)).filter((f): f is UploadedFile => Boolean(f));
      if (photos.length !== item.photos.length) continue; // photo disparue : le contenu est laissé de côté
      const result = await insertResto(user.id, { requestId: itemId(pack.id, index), content: item.content, photos, logo, locale }, { packId: pack.id });
      if (result.ok) items.push({ projectId: result.id, template: item.template, caption: "", dishIds: item.dishIds, kept: true });
    }
    const kept = plan.items.filter((_, i) => items.some((it) => it.projectId === itemId(pack!.id, i)));
    const captions = await packCaptions(kept.map((i) => i.content), { restaurantName: restaurant.name, cuisine: restaurant.cuisine, networks: restaurant.networks, locale }, { userId: user.id, plan: user.plan });
    items.forEach((item, i) => { item.caption = captions[i] ?? ""; });
    for (const item of items) {
      const version = await db.projectVersion.findFirst({ where: { projectId: item.projectId }, orderBy: { number: "desc" }, select: { id: true, scenes: true } });
      if (version && item.caption) await db.projectVersion.update({ where: { id: version.id }, data: { scenes: { ...(version.scenes as object), restoCaption: item.caption } } });
    }
    await db.restoPack.update({ where: { id: pack.id }, data: items.length ? { status: "READY", items, skipped: plan.skipped } : { status: "SKIPPED", reason: "empty", skipped: plan.skipped } });
    return pack.id;
  } catch (error) {
    // Reste « en préparation » : la prochaine visite ou le cron du lendemain reprend
    console.error("[resto:pack]", { restaurantId, error: error instanceof Error ? error.message : "UnknownError" });
    return pack.id;
  }
}

/** Cron quotidien : prépare les packs du jour (heure de Paris), dans le temps imparti. Les restes se préparent à la visite. */
export async function prepareDuePacks(now = new Date(), budgetMs = 200_000) {
  const start = Date.now();
  const { weekday, date } = parisDay(now);
  const due = await db.restaurant.findMany({
    where: { packEnabled: true, onboardedAt: { not: null }, packDay: weekday, user: { plan: "RESTO" }, packs: { none: { packDate: date } } },
    select: { id: true }, orderBy: { createdAt: "asc" },
  });
  let prepared = 0, failed = 0;
  for (const { id } of due) {
    if (Date.now() - start > budgetMs) break;
    try { if (await preparePack(id, now)) prepared++; } catch (error) { failed++; console.error("[resto:pack.cron]", { id, error }); }
  }
  return { due: due.length, prepared, failed };
}

const minusDays = (iso: string, days: number) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10); };

/** Le pack des 7 derniers jours (jusqu'à `packDate` compris), s'il existe. */
function latestPack(restaurantId: string, packDate: string) {
  return db.restoPack.findFirst({ where: { restaurantId, packDate: { gt: minusDays(packDate, 7), lte: packDate } }, orderBy: { packDate: "desc" } });
}

/** Pack de la semaine en cours d'un compte (le prépare s'il manque : premier pack, cron manqué). */
export async function currentPack(userId: string, now = new Date()) {
  const restaurant = await db.restaurant.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, packDay: true, packEnabled: true, onboardedAt: true } });
  if (!restaurant?.onboardedAt || !restaurant.packEnabled) return { restaurant, pack: null, missing: false };
  const packDate = currentPackDate(now, restaurant.packDay);
  const pack = await latestPack(restaurant.id, packDate);
  return { restaurant, pack, missing: !pack || (pack.status === "PREPARING" && now.getTime() - pack.updatedAt.getTime() >= STALE_MS) };
}

/** Point de départ du plat du jour express : logo et format des derniers contenus. */
export async function restoStart(userId: string) {
  const { recent, logo } = await history(userId);
  const last = recent["plat-du-jour"]?.content;
  return { logo, format: last?.format ?? "PORTRAIT" as const };
}
