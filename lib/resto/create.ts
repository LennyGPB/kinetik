import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { isOwnUpload, storage } from "@/lib/storage";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { uploadedFileSchema } from "@/lib/projects/validation";
import type { ActionResult } from "@/lib/projects/types";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getRestoTemplate, MENU_MAX_DAYS } from "@/config/resto-templates";
import { RestoContentSchema, restoGraph, usedPhotos, type RestoContent } from "./content";

/** Type des projets Resto (Project.videoType), un par template. */
export const VIDEO_TYPES = { "plat-du-jour": "resto-plat-du-jour", "menu-semaine": "resto-menu-semaine", "formule-midi": "resto-formule-midi", "happy-hour": "resto-happy-hour", evenement: "resto-evenement", avis: "resto-avis", horaires: "resto-horaires", presentation: "resto-presentation" } as const;
export const image = uploadedFileSchema.refine((f) => f.mimeType.startsWith("image/") && f.url.includes("/image/"));

export const CreateSchema = z.object({
  requestId: z.uuid(),
  content: RestoContentSchema,
  /** Photos dans l'ordre : le plat du jour en a une, le menu de la semaine 0 à 7 (index dans MenuDay.photo) */
  photos: z.array(image).max(MENU_MAX_DAYS),
  logo: image.nullable().default(null),
  locale: z.enum(["fr", "en"]),
});
export type CreateRestoInput = z.input<typeof CreateSchema>;

const LABELS = {
  "plat-du-jour": { fr: ["Plat du jour créé", "Plat du jour modifié"], en: ["Dish of the day created", "Dish of the day updated"] },
  "menu-semaine": { fr: ["Menu de la semaine créé", "Menu de la semaine modifié"], en: ["Week menu created", "Week menu updated"] },
  "formule-midi": { fr: ["Formule midi créée", "Formule midi modifiée"], en: ["Lunch menu created", "Lunch menu updated"] },
  "happy-hour": { fr: ["Happy hour créé", "Happy hour modifié"], en: ["Happy hour created", "Happy hour updated"] },
  evenement: { fr: ["Événement créé", "Événement modifié"], en: ["Event created", "Event updated"] },
  avis: { fr: ["Avis créés", "Avis modifiés"], en: ["Reviews created", "Reviews updated"] },
  horaires: { fr: ["Horaires créés", "Horaires modifiés"], en: ["Opening hours created", "Opening hours updated"] },
  presentation: { fr: ["Présentation créée", "Présentation modifiée"], en: ["Presentation created", "Presentation updated"] },
} as const;
export const label = (content: RestoContent, locale: "fr" | "en", created: boolean) => LABELS[content.template][locale][created ? 0 : 1];
/** Nom du projet dans le tableau de bord. */
export function projectName(content: RestoContent, locale: "fr" | "en") {
  if (content.template === "plat-du-jour") return content.dish.name;
  if (content.template === "menu-semaine") return locale === "fr" ? "Menu de la semaine" : "This week's menu";
  if (content.template === "formule-midi") return locale === "fr" ? "Formule midi" : "Lunch menu";
  if (content.template === "evenement") return content.data.type === "evenement" ? content.data.title : "Événement";
  return getRestoTemplate(content.template)!.name[locale];
}
/** Chaque photo utilisée existe, et le plat du jour a bien sa photo. */
export const photosMatch = (content: RestoContent, count: number) => (content.template !== "plat-du-jour" || count === 1 || count === 2) && usedPhotos(content).every((index) => index < count);

/**
 * Enregistre un contenu Resto validé. Reprise sûre : la même requestId ne crée qu'un projet.
 * `extra.brief` : marque posée par le serveur (ex. vidéos de bienvenue, dont le premier téléchargement est offert).
 */
export async function insertResto(userId: string, data: z.output<typeof CreateSchema>, extra: { brief?: string; packId?: string } = {}): Promise<ActionResult<{ id: string }>> {
  if (!photosMatch(data.content, data.photos.length)) return { ok: false, error: "invalid" };
  const videoType = VIDEO_TYPES[data.content.template];
  const existing = await db.project.findFirst({ where: { id: data.requestId, userId, videoType }, select: { id: true } });
  if (existing) return { ok: true, id: existing.id };
  const files = [...data.photos, ...(data.logo ? [data.logo] : [])];
  if (files.some((file) => !isOwnUpload(userId, file.url))) return { ok: false, error: "invalid" };
  // Les packs sont préparés par le serveur : pas de limite de création pour eux
  if (!extra.packId && !(await limitKey("project", userId, LIMITS.project)).ok) return { ok: false, error: "rate_limited" };
  try {
    for (const file of files) if (!await storage.get(file.url.slice("/api/uploads/".length))) return { ok: false, error: "invalid" };
    const graph = restoGraph(data.content, data.photos.map((p) => p.url), data.locale);
    await db.project.create({ data: {
      id: data.requestId, userId, kind: "MOTION", videoType, status: "READY", ...(extra.brief && { brief: extra.brief }), ...(extra.packId && { restoPackId: extra.packId }),
      name: projectName(data.content, data.locale), appName: data.content.restaurantName, locale: data.locale,
      // Le format réel (9:16 ou 4:5) est dans la version ; le projet garde un format portrait existant
      format: "PORTRAIT", duration: Math.round(graph.scenes[0].duration), musicTrackId: graph.musicTrackId,
      assets: { create: [...data.photos.map((photo, position) => ({ ...photo, position, type: "SCREEN" as const })), ...(data.logo ? [{ ...data.logo, type: "LOGO" as const }] : [])] },
      versions: { create: { number: 1, scenes: graph as unknown as Prisma.InputJsonValue, label: label(data.content, data.locale, true) } },
    } });
    return { ok: true, id: data.requestId };
  } catch (error) {
    const created = await db.project.findFirst({ where: { id: data.requestId, userId: userId, videoType }, select: { id: true } });
    if (created) return { ok: true, id: created.id };
    console.error("[resto:create]", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, error: "invalid" };
  }
}
