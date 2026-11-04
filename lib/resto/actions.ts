"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { parseSceneGraph } from "@/lib/projects/scenes";
import type { ActionResult, EditorVersion } from "@/lib/projects/types";
import type { Prisma } from "@/lib/generated/prisma/client";
import { canUseResto, needsRestoOffer } from "./access";
import { RestoContentSchema, restoGraph } from "./content";
import { CreateSchema, insertResto, label, photosMatch, projectName, VIDEO_TYPES, type CreateRestoInput } from "./create";

export type { CreateRestoInput } from "./create";
/**
 * Crée un contenu Resto (plat du jour, menu de la semaine). Aucune IA n'est appelée : les textes sont ceux du restaurateur,
 * l'aperçu est joué dans le navigateur. Rien n'est débité ici, seul le téléchargement l'est.
 * Reprise sûre : la même requestId ne crée qu'un projet.
 */
export async function createResto(input: CreateRestoInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!canUseResto(user) || needsRestoOffer(user)) return { ok: false, error: "not_found" };
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return insertResto(user.id, parsed.data);
}

/** Enregistre une nouvelle version (textes, prix, style, format, cadrage). Les photos du projet restent les mêmes. */
export async function saveResto(projectId: string, expectedVersion: number, input: unknown): Promise<ActionResult<{ version: EditorVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = RestoContentSchema.safeParse(input);
  if (typeof projectId !== "string" || !Number.isInteger(expectedVersion) || !parsed.success) return { ok: false, error: "invalid" };
  if (!(await limitKey("setting", user.id, LIMITS.setting)).ok) return { ok: false, error: "rate_limited" };
  const lock = await acquireLock(`resto:${projectId}`, 15000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await db.project.findFirst({
      // Le template d'un projet ne change pas : un menu reste un menu
      where: { id: projectId, userId: user.id, videoType: VIDEO_TYPES[parsed.data.template], status: "READY" },
      include: { versions: { orderBy: { number: "desc" }, take: 1 }, assets: { where: { type: "SCREEN" }, orderBy: { position: "asc" } } },
    });
    const latest = project?.versions[0];
    if (!project || !latest) return { ok: false, error: "not_found" };
    if (latest.number !== expectedVersion) return { ok: false, error: "busy" };
    if (!photosMatch(parsed.data, project.assets.length)) return { ok: false, error: "invalid" };
    const locale = project.locale === "en" ? "en" : "fr";
    const previous = parseSceneGraph(latest.scenes);
    // Les réglages audio choisis dans l'éditeur (volume…) sont conservés
    const graph = { ...restoGraph(parsed.data, project.assets.map((a) => a.url), locale), ...(previous.audio && { audio: previous.audio }) };
    const [version] = await db.$transaction([
      db.projectVersion.create({ data: { projectId, number: latest.number + 1, label: label(parsed.data, locale, false), scenes: graph as unknown as Prisma.InputJsonValue } }),
      db.project.update({ where: { id: projectId }, data: { name: projectName(parsed.data, locale), appName: parsed.data.restaurantName, duration: Math.round(graph.scenes[0].duration), musicTrackId: graph.musicTrackId } }),
    ]);
    return { ok: true, version: { id: version.id, number: version.number, label: version.label ?? label(parsed.data, locale, false), createdAt: version.createdAt.toISOString(), graph } };
  } catch {
    return { ok: false, error: "busy" };
  } finally {
    await releaseLock(`resto:${projectId}`, lock);
  }
}
